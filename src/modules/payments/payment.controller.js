import mongoose from "mongoose";
import { z } from "zod";
import Payment from "./payment.model.js";
import Order from "../orders/order.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const listPayments = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
  const filter = {};
  if (req.user.role === "salesman") filter.salesman = req.user._id;
  else if (req.query.salesman && mongoose.isValidObjectId(req.query.salesman)) filter.salesman = req.query.salesman;
  if (["cash", "upi"].includes(req.query.mode)) filter.mode = req.query.mode;
  const date = (value, end) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}+05:30`) : null;
  if (req.query.from) { const from = date(req.query.from, false); if (!from) return res.status(400).json({ success: false, message: "from must use YYYY-MM-DD" }); filter.receivedAt = { ...filter.receivedAt, $gte: from }; }
  if (req.query.to) { const to = date(req.query.to, true); if (!to) return res.status(400).json({ success: false, message: "to must use YYYY-MM-DD" }); filter.receivedAt = { ...filter.receivedAt, $lte: to }; }
  const pipeline = [
    { $match: filter },
    { $lookup: { from: "orders", localField: "order", foreignField: "_id", as: "orderData" } },
    { $unwind: "$orderData" },
    { $match: { "orderData.status": { $ne: "cancelled" } } },
    { $facet: { rows: [{ $sort: { receivedAt: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }, { $lookup: { from: "shops", localField: "shop", foreignField: "_id", as: "shopData" } }, { $lookup: { from: "users", localField: "salesman", foreignField: "_id", as: "salesmanData" } }, { $project: { order: { _id: "$orderData._id", billNo: "$orderData.billNo" }, shop: { $arrayElemAt: ["$shopData", 0] }, salesman: { $arrayElemAt: ["$salesmanData", 0] }, amount: 1, mode: 1, receivedAt: 1, note: 1 } }], total: [{ $count: "count" }] } },
  ];
  const [result] = await Payment.aggregate(pipeline);
  const payments = result?.rows || [];
  const total = result?.total?.[0]?.count || 0;
  res.json({ success: true, payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const paymentSchema = z.object({ amount: z.number().positive(), mode: z.enum(["cash", "upi"]), note: z.string().trim().max(200).optional() }).strict();
export const collectPayment = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(400).json({ success: false, message: "Invalid order ID" });
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Enter a positive amount and choose cash or UPI" });
  const orderFilter = { _id: req.params.orderId, status: { $ne: "cancelled" } };
  if (req.user.role === "salesman") orderFilter.salesman = req.user._id;
  const order = await Order.findOneAndUpdate(
    { ...orderFilter, $expr: { $lte: [{ $add: ["$paid", parsed.data.amount] }, "$total"] } },
    { $inc: { paid: parsed.data.amount } }, { new: true }
  );
  if (!order) return res.status(409).json({ success: false, message: "Order is unavailable or payment exceeds the remaining due" });
  const previousStatus = order.status;
  if (order.paid >= order.total) {
    order.status = "paid";
    order.history.push({ action: "paid", note: `Paid via ${parsed.data.mode}`, by: req.user._id });
  } else order.history.push({ action: "payment_received", note: `Received ${parsed.data.amount} via ${parsed.data.mode}`, by: req.user._id });
  try {
    await order.save();
    const payment = await Payment.create({ order: order._id, shop: order.shop, salesman: order.salesman, amount: parsed.data.amount, mode: parsed.data.mode, note: parsed.data.note });
    res.status(201).json({ success: true, payment, order: { id: order._id, total: order.total, paid: order.paid, due: order.total - order.paid, status: order.status } });
  } catch (error) {
    await Order.updateOne({ _id: order._id }, { $inc: { paid: -parsed.data.amount }, $set: { status: previousStatus }, $pop: { history: 1 } });
    throw error;
  }
});
