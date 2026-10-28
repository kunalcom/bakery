import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import Attendance from "./attendance.model.js";

const router = Router();
router.post("/start", requireAuth, requireRole("salesman"), asyncHandler(async (req, res) => {
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const location = req.body?.location;
  if (location && (!Number.isFinite(location.lat) || !Number.isFinite(location.lng) || location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180)) return res.status(400).json({ success: false, message: "Invalid start location" });
  try {
    const attendance = await Attendance.create({ salesman: req.user._id, day, startedAt: new Date(), startLocation: location || undefined });
    res.status(201).json({ success: true, attendance });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "Attendance has already started for today" });
    throw error;
  }
}));
router.post("/end", requireAuth, requireRole("salesman"), asyncHandler(async (req, res) => {
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const attendance = await Attendance.findOneAndUpdate({ salesman: req.user._id, day, startedAt: { $ne: null }, endedAt: null }, { $set: { endedAt: new Date() } }, { new: true });
  if (!attendance) return res.status(409).json({ success: false, message: "Start attendance before ending the day" });
  res.json({ success: true, attendance });
}));
export default router;
