import { Router } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import User, { USER_ROLES } from "../modules/users/user.model.js";
import { createUser } from "../modules/users/user.service.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: "Too many failed sign-in attempts. Please wait 15 minutes and try again." },
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().min(5).max(20).optional(),
  password: z.string().min(1).max(128),
}).refine((data) => Boolean(data.email || data.phone), { message: "Enter your email or phone number" });

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  role: z.enum(USER_ROLES),
  phone: z.string().trim().max(20).optional(),
}).strict();

// Public route: no requireAuth here.
async function login(req, res, { adminOnly = false } = {}) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid email or phone number and password.",
    });
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const identifier = parsed.data.email || parsed.data.phone;
  const user = await User.findOne(parsed.data.email
    ? { email: identifier.toLowerCase() }
    : { phone: identifier.trim() }).select("+password");

  if (
    !user ||
    !user.isActive ||
    !(await user.comparePassword(parsed.data.password))
  ) {
    return res.status(401).json({
      success: false,
      message: "The email/phone number or password is incorrect.",
    });
  }

  if (adminOnly && user.role !== "owner") {
    return res.status(403).json({ success: false, message: "This sign-in is for bakery administrators. Please use the sales workspace." });
  }

  const token = jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    }
  );

  user.lastLoginAt = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

router.post("/login", loginLimiter, asyncHandler(login));
router.post("/admin-login", loginLimiter, asyncHandler((req, res) => login(req, res, { adminOnly: true })));

// Owner only: both the role and permission must pass.
router.post(
  "/users",
  requireAuth,
  requireRole("owner"),
  requirePermission("users:manage"),
  asyncHandler(async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid user details",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const user = await createUser({
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user,
    });
  })
);

// Authenticated route: current user profile.
router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
    },
  });
});

export default router;
