import mongoose from "mongoose";

const lineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const historySchema = new mongoose.Schema({
  action: { type: String, required: true },
  note: { type: String, default: "" },
  by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  at: { type: Date, default: Date.now },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  billNo: { type: String, required: true, unique: true, index: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  shopSnapshot: { name: { type: String, required: true }, address: { type: String, default: "" } },
  route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null, index: true },
  routeSnapshot: { type: String, default: "" },
  salesman: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  lines: { type: [lineSchema], validate: (lines) => lines.length > 0 },
  itemsCount: { type: Number, required: true, min: 1 },
  total: { type: Number, required: true, min: 0 },
  paid: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: ["open", "paid", "cancelled"], default: "open", index: true },
  cancelledAt: { type: Date, default: null },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  cancellationReason: { type: String, default: "" },
  history: { type: [historySchema], default: [] },
}, { timestamps: true, versionKey: false });

orderSchema.index({ createdAt: -1, salesman: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
export default mongoose.model("Order", orderSchema);
