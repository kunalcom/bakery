import mongoose from "mongoose";

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, trim: true, default: "", maxlength: 20 },
  address: { type: String, trim: true, default: "", maxlength: 300 },
  route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null, index: true },
  location: { lat: { type: Number, min: -90, max: 90 }, lng: { type: Number, min: -180, max: 180 } },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, versionKey: false });

shopSchema.index({ name: 1, isActive: 1 });
export default mongoose.model("Shop", shopSchema);
