import mongoose from "mongoose";
import Product from "./product.model.js";
import Inventory from "../inventory/inventory.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const allowedUnits = ["piece", "packet", "kg", "gram", "litre"];

function validOptionalString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export const createProduct = asyncHandler(async (req, res) => {
  const { name, sku, category, unit = "piece", sellingPrice, costPrice, photoData = "", displayOrder = 0 } = req.body;

  if (
    !validOptionalString(name) ||
    !validOptionalString(sku) ||
    !validOptionalString(category) ||
    !Number.isFinite(sellingPrice) ||
    sellingPrice < 0 ||
    !Number.isFinite(costPrice) ||
    costPrice < 0 ||
    (typeof photoData !== "string" || (photoData && (!/^data:image\/(png|jpeg|webp);base64,/.test(photoData) || photoData.length > 5_500_000))) ||
    !Number.isInteger(displayOrder) || displayOrder < 0 ||
    !allowedUnits.includes(unit)
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide valid name, SKU, category, unit and non-negative prices",
    });
  }

  const product = await Product.create({
    name: name.trim(),
    sku: sku.trim().toUpperCase(),
    category: category.trim(),
    unit,
    sellingPrice,
    costPrice,
    photoData,
    displayOrder,
    createdBy: req.user._id,
  });

  // Every new product starts with an explicit zero stock balance.
  await Inventory.create({ product: product._id, quantity: 0, updatedBy: req.user._id });

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    product,
  });
});

export const getProducts = asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  const filter = {};
  if (!(req.query.includeInactive === "true" && req.user.role === "owner")) filter.isActive = true;

  if (typeof category === "string" && category.trim()) {
    filter.category = category.trim();
  }

  if (typeof search === "string" && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { sku: { $regex: escaped, $options: "i" } },
    ];
  }

  const selection = req.query.includePhotos === "true" ? "" : "-photoData";
  const products = await Product.find(filter)
    .select(selection)
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(100)
    .lean();

  res.status(200).json({
    success: true,
    count: products.length,
    products,
  });
});

export const getProductById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  const product = await Product.findOne({
    _id: req.params.id,
    isActive: true,
  }).lean();

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  res.status(200).json({ success: true, product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  const allowedFields = ["name", "sku", "category", "unit", "sellingPrice", "costPrice", "displayOrder", "photoData"];
  const updates = {};

  for (const field of allowedFields) {
    if (Object.hasOwn(req.body, field)) updates[field] = req.body[field];
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ success: false, message: "No valid fields provided" });
  }

  for (const field of ["name", "sku", "category"]) {
    if (updates[field] !== undefined && !validOptionalString(updates[field])) {
      return res.status(400).json({
        success: false,
        message: `${field} must be a non-empty string`,
      });
    }
  }

  if (updates.name !== undefined) updates.name = updates.name.trim();
  if (updates.category !== undefined) updates.category = updates.category.trim();
  if (updates.sku !== undefined) updates.sku = updates.sku.trim().toUpperCase();

  if (updates.unit !== undefined && !allowedUnits.includes(updates.unit)) {
    return res.status(400).json({ success: false, message: "Invalid unit" });
  }

  for (const field of ["sellingPrice", "costPrice"]) {
    if (
      updates[field] !== undefined &&
      (!Number.isFinite(updates[field]) || updates[field] < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: `${field} must be a non-negative number`,
      });
    }
  }

  if (updates.displayOrder !== undefined && (!Number.isInteger(updates.displayOrder) || updates.displayOrder < 0)) {
    return res.status(400).json({ success: false, message: "displayOrder must be a non-negative integer" });
  }
  if (updates.photoData !== undefined && (typeof updates.photoData !== "string" || (updates.photoData && (!/^data:image\/(png|jpeg|webp);base64,/.test(updates.photoData) || updates.photoData.length > 5_500_000)))) {
    return res.status(400).json({ success: false, message: "Photo must be a PNG, JPEG, or WebP image under 4 MB" });
  }

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, isActive: true },
    updates,
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    product,
  });
});

export const deactivateProduct = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, isActive: true },
    { isActive: false },
    { new: true }
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Active product not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Product deactivated successfully",
  });
});
