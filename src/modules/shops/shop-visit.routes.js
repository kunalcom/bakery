import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import Shop from "./shop.model.js";
import ShopVisit from "./shop-visit.model.js";

const router = Router();
router.post("/", requireAuth, requireRole("salesman"), asyncHandler(async (req, res) => {
  const { shopId } = req.body || {};
  if (!mongoose.isValidObjectId(shopId)) return res.status(400).json({ success: false, message: "Valid shopId is required" });
  const shop = await Shop.findOne({ _id: shopId, isActive: true });
  if (!shop) return res.status(404).json({ success: false, message: "Shop not found or inactive" });
  if (shop.route && !req.user.assignedRoutes.some((routeId) => routeId.equals(shop.route))) return res.status(403).json({ success: false, message: "This shop is not on your assigned route" });
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const visit = await ShopVisit.findOneAndUpdate({ salesman: req.user._id, shop: shop._id, day }, { $setOnInsert: { route: shop.route, visitedAt: new Date() } }, { upsert: true, new: true });
  res.status(201).json({ success: true, visit });
}));
export default router;
