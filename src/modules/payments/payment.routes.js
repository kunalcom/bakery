import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { requireAnyPermission } from "../../middleware/requireAnyPermission.js";
import { listPayments, collectPayment } from "./payment.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/", requireAnyPermission("sales:read", "sales:read_own"), listPayments);
router.post("/orders/:orderId", requireAnyPermission("sales:manage", "sales:create"), collectPayment);
export default router;
