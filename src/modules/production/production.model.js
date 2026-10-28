import mongoose from "mongoose";

const productionPlanSchema = new mongoose.Schema({
  day: { type: String, required: true, unique: true, index: true },
  lines: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }, planned: { type: Number, min: 0, required: true }, baked: { type: Number, min: 0, default: 0 }, wasted: { type: Number, min: 0, default: 0 } }],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

export const ProductionPlan = mongoose.model("ProductionPlan", productionPlanSchema);

const rawMaterialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  sku: { type: String, required: true, trim: true, uppercase: true, unique: true },
  unit: { type: String, required: true, trim: true, maxlength: 20 },
  minimumLevel: { type: Number, required: true, min: 0, default: 0 },
  onHand: { type: Number, required: true, min: 0, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

export const RawMaterial = mongoose.model("RawMaterial", rawMaterialSchema);
