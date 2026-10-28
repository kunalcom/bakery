import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { getInventory, getInventoryItem, adjustInventory } from "./inventory.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/", requirePermission("inventory:read"), getInventory);
router.get("/:productId", requirePermission("inventory:read"), getInventoryItem);
router.post("/:productId/adjustments", requirePermission("inventory:manage"), adjustInventory);

export default router;
