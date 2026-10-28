import { ROLE_PERMISSIONS } from "../config/permissions.js";

export function requirePermission(...requiredPermissions) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const allowed = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
}
