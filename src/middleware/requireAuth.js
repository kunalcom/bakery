import jwt from "jsonwebtoken";
import User from "../modules/users/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const requireAuth = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = authorization.slice(7);
  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  if (
    !payload ||
    typeof payload === "string" ||
    typeof payload.sub !== "string"
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid token payload",
    });
  }

  const user = await User.findById(payload.sub);

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: "Account unavailable",
    });
  }

  req.user = user;
  next();
});
