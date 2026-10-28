import mongoose from "mongoose";

const routeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
  description: { type: String, trim: true, default: "", maxlength: 300 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, versionKey: false });

export default mongoose.model("Route", routeSchema);
