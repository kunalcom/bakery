import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deactivateProduct,
} from "./product.controller.js";

const router = Router();

// Every product endpoint requires a valid JWT.
router.use(requireAuth);

router.get("/", requirePermission("products:read"), getProducts);
router.get("/:id", requirePermission("products:read"), getProductById);

router.post("/", requirePermission("products:manage"), createProduct);
router.patch("/:id", requirePermission("products:manage"), updateProduct);
router.patch("/:id/status", requirePermission("products:manage"), deactivateProduct);

export default router;
