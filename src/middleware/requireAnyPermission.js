import { ROLE_PERMISSIONS } from "../config/permissions.js";

export function requireAnyPermission(...permissions) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
    const granted = ROLE_PERMISSIONS[req.user.role] || [];
    if (!permissions.some((permission) => granted.includes(permission))) {
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }
    next();
  };
}
