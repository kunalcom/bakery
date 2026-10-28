import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  salesman: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  day: { type: String, required: true, index: true },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  startLocation: { lat: Number, lng: Number },
}, { timestamps: true, versionKey: false });

attendanceSchema.index({ salesman: 1, day: 1 }, { unique: true });
export default mongoose.model("Attendance", attendanceSchema);
