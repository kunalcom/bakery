import User, { USER_ROLES } from "./user.model.js";

export async function createUser({
  name,
  email,
  password,
  role,
  phone,
  createdBy,
}) {
  if (!USER_ROLES.includes(role)) {
    const error = new Error("Invalid role");
    error.statusCode = 400;
    throw error;
  }

  if (role === "owner") {
    const error = new Error(
      "Owner accounts cannot be created through this endpoint"
    );
    error.statusCode = 403;
    throw error;
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    phone,
    createdBy,
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}
