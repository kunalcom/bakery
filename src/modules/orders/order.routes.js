import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { requireAnyPermission } from "../../middleware/requireAnyPermission.js";
import { requireRole } from "../../middleware/requireRole.js";
import { listOrders, createOrder, getOrder, cancelOrder, invoice } from "./order.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/", requireAnyPermission("sales:read", "sales:read_own"), listOrders);
router.post("/", requirePermission("sales:create"), createOrder);
router.get("/:id/invoice", requireAnyPermission("sales:read", "sales:read_own"), invoice);
router.get("/:id", requireAnyPermission("sales:read", "sales:read_own"), getOrder);
router.post("/:id/cancel", requireRole("owner"), requirePermission("sales:manage"), cancelOrder);
export default router;
