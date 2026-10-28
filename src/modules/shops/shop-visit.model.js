import mongoose from "mongoose";

const visitSchema = new mongoose.Schema({
  salesman: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null },
  day: { type: String, required: true },
  visitedAt: { type: Date, default: Date.now },
}, { timestamps: true, versionKey: false });

visitSchema.index({ salesman: 1, shop: 1, day: 1 }, { unique: true });
visitSchema.index({ day: 1, salesman: 1 });
export default mongoose.model("ShopVisit", visitSchema);
