import mongoose from "mongoose";
import Inventory from "./inventory.model.js";
import Product from "../products/product.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

function validId(id) {
  return mongoose.isValidObjectId(id);
}

export const getInventory = asyncHandler(async (req, res) => {
  const rows = await Inventory.find()
    .populate({ path: "product", match: { isActive: true }, select: "name sku category unit" })
    .sort({ updatedAt: -1 })
    .lean();
  const inventory = rows.filter((row) => row.product);
  res.status(200).json({ success: true, count: inventory.length, inventory });
});

export const getInventoryItem = asyncHandler(async (req, res) => {
  if (!validId(req.params.productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }
  const [product, inventory] = await Promise.all([
    Product.findOne({ _id: req.params.productId, isActive: true }).select("name sku category unit").lean(),
    Inventory.findOne({ product: req.params.productId }).lean(),
  ]);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  res.status(200).json({
    success: true,
    inventory: inventory || { product, quantity: 0, lowStockThreshold: 0 },
    ...(inventory ? {} : { product }),
  });
});

export const adjustInventory = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantityChange, reason, lowStockThreshold } = req.body;
  if (!validId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }
  if (!Number.isInteger(quantityChange) || quantityChange === 0 ||
      (reason !== undefined && (typeof reason !== "string" || !reason.trim() || reason.trim().length > 200)) ||
      (lowStockThreshold !== undefined && (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0))) {
    return res.status(400).json({
      success: false,
      message: "Provide a non-zero integer quantityChange, an optional reason, and a non-negative integer lowStockThreshold",
    });
  }
  const product = await Product.findOne({ _id: productId, isActive: true }).select("_id");
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });

  if (quantityChange > 0) {
    await Inventory.updateOne(
      { product: productId },
      { $setOnInsert: { quantity: 0, lowStockThreshold: 0, updatedBy: req.user._id } },
      { upsert: true }
    );
  }
  const filter = {
    product: productId,
    ...(quantityChange < 0 ? { $expr: { $gte: [{ $add: ["$quantity", quantityChange] }, 0] } } : {}),
  };
  const updates = {
    $inc: { quantity: quantityChange },
    $set: { updatedBy: req.user._id },
  };
  if (reason !== undefined) updates.$set.lastAdjustmentReason = reason.trim();
  if (lowStockThreshold !== undefined) updates.$set.lowStockThreshold = lowStockThreshold;
  const inventory = await Inventory.findOneAndUpdate(filter, updates, { new: true, runValidators: true }).lean();
  if (!inventory) {
    return res.status(409).json({ success: false, message: "Insufficient stock for this adjustment" });
  }
  res.status(200).json({ success: true, message: "Inventory adjusted successfully", inventory });
});
