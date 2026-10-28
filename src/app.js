import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import productRoutes from "./modules/products/product.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import orderRoutes from "./modules/orders/order.routes.js";
import paymentRoutes from "./modules/payments/payment.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import shopVisitRoutes from "./modules/shops/shop-visit.routes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");

app.set("trust proxy", true);
app.use(helmet({ contentSecurityPolicy: { directives: { "img-src": ["'self'", "data:"] } } }));

const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json({ limit: "7mb" }));
app.use(express.static(publicDir));

app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
}));

// Public health route
app.use("/api/health", healthRoutes);

// Login is public; protected auth routes apply middleware individually.
app.use("/api/auth", authRoutes);

// Product router applies requireAuth and permissions internally.
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/visits", shopVisitRoutes);
// Serve the admin SPA for direct links such as /orders and /reports. Keep
// unknown API URLs on the JSON 404 path below.
app.get("/{*path}", (req, res, next) => {
  if (req.path === "/api" || req.path.startsWith("/api/") || !req.accepts("html")) return next();
  res.sendFile(path.join(publicDir, "index.html"));
});
// Always last
app.use(notFound);
app.use(errorHandler);

export default app;
