import mongoose from "mongoose";
import { z } from "zod";
import Order from "./order.model.js";
import Product from "../products/product.model.js";
import Shop from "../shops/shop.model.js";
import Payment from "../payments/payment.model.js";
import ShopVisit from "../shops/shop-visit.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const createSchema = z.object({
  shopId: z.string().min(1),
  lines: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive().max(100000) }).strict()).min(1).max(100),
}).strict();

const queryDate = (value, end = false) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const utcDate = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(utcDate.getTime()) || utcDate.toISOString().slice(0, 10) !== value) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}+05:30`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
  const filter = {};
  const from = queryDate(req.query.from);
  const to = queryDate(req.query.to, true);
  if (from === undefined || to === undefined) return res.status(400).json({ success: false, message: "Dates must use YYYY-MM-DD" });
  if (from || to) filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (req.user.role === "salesman") filter.salesman = req.user._id;
  else if (req.query.salesman && mongoose.isValidObjectId(req.query.salesman)) filter.salesman = req.query.salesman;
  if (req.query.route && mongoose.isValidObjectId(req.query.route)) filter.route = req.query.route;
  if (["open", "paid", "cancelled"].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.shop) {
    const shopIds = await Shop.find({ name: { $regex: String(req.query.shop).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }).distinct("_id");
    filter.shop = { $in: shopIds };
  }
  const [orders, total] = await Promise.all([
    Order.find(filter).populate("shop", "name address isActive").populate("salesman", "name").populate("route", "name").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const createOrder = asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success || !mongoose.isValidObjectId(parsed.data?.shopId) || parsed.data?.lines.some((line) => !mongoose.isValidObjectId(line.productId))) {
    return res.status(400).json({ success: false, message: "Provide a valid shop and product quantities" });
  }
  const shop = await Shop.findOne({ _id: parsed.data.shopId, isActive: true }).populate("route", "name");
  if (!shop) return res.status(404).json({ success: false, message: "Shop not found or inactive" });
  if (req.user.role === "salesman" && shop.route && !req.user.assignedRoutes.some((route) => route.equals(shop.route._id))) {
    return res.status(403).json({ success: false, message: "This shop is not assigned to your route" });
  }
  const ids = [...new Set(parsed.data.lines.map((line) => line.productId))];
  const products = await Product.find({ _id: { $in: ids }, isActive: true }).lean();
  const byId = new Map(products.map((product) => [product._id.toString(), product]));
  if (products.length !== ids.length) return res.status(400).json({ success: false, message: "One or more products are unavailable" });
  const lines = parsed.data.lines.map(({ productId, quantity }) => {
    const product = byId.get(productId);
    return { product: product._id, name: product.name, sku: product.sku, quantity, unitPrice: product.sellingPrice, lineTotal: product.sellingPrice * quantity };
  });
  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).replaceAll("-", "");
  const billNo = `BK-${day}-${new mongoose.Types.ObjectId().toString().slice(-6).toUpperCase()}`;
  const order = await Order.create({
    billNo, shop: shop._id, shopSnapshot: { name: shop.name, address: shop.address },
    route: shop.route?._id || null, routeSnapshot: shop.route?.name || "", salesman: req.user._id,
    lines, itemsCount: lines.reduce((sum, line) => sum + line.quantity, 0), total,
    history: [{ action: "created", by: req.user._id }],
  });
  const visitDay = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  try {
    await ShopVisit.updateOne({ salesman: req.user._id, shop: shop._id, day: visitDay }, { $setOnInsert: { route: shop.route?._id || null, visitedAt: new Date() } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  res.status(201).json({ success: true, message: "Order created", order });
});

export const getOrder = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid order ID" });
  const filter = { _id: req.params.id };
  if (req.user.role === "salesman") filter.salesman = req.user._id;
  const order = await Order.findOne(filter).populate("salesman", "name").populate("route", "name").lean();
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  const payments = await Payment.find({ order: order._id }).sort({ receivedAt: 1 }).lean();
  res.json({ success: true, order: { ...order, payments, due: Math.max(0, order.total - order.paid) } });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (!reason || reason.length > 300) return res.status(400).json({ success: false, message: "A cancellation reason (up to 300 characters) is required" });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid order ID" });
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: { $ne: "cancelled" } },
    { $set: { status: "cancelled", cancelledAt: new Date(), cancelledBy: req.user._id, cancellationReason: reason }, $push: { history: { action: "cancelled", note: reason, by: req.user._id } } },
    { new: true }
  );
  if (!order) return res.status(404).json({ success: false, message: "Active order not found" });
  res.json({ success: true, message: "Order cancelled. It remains in history and is excluded from totals.", order });
});

export const invoice = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid order ID" });
  const filter = { _id: req.params.id };
  if (req.user.role === "salesman") filter.salesman = req.user._id;
  const order = await Order.findOne(filter).lean();
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  res.json({ success: true, invoice: { bakeryName: process.env.BAKERY_NAME || "Bakery", billNo: order.billNo, date: order.createdAt, shop: order.shopSnapshot, lines: order.lines, total: order.total, paid: order.paid, due: Math.max(0, order.total - order.paid), status: order.status } });
});
