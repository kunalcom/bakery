import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  salesman: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  mode: { type: String, enum: ["cash", "upi"], required: true, index: true },
  receivedAt: { type: Date, default: Date.now, index: true },
  note: { type: String, trim: true, default: "", maxlength: 200 },
}, { timestamps: true, versionKey: false });

paymentSchema.index({ receivedAt: -1, salesman: 1, mode: 1 });
export default mongoose.model("Payment", paymentSchema);
