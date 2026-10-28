import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const USER_ROLES = [
  "owner",
  "office_staff",
  "salesman",
  "factory_manager",
  "store_keeper",
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: { values: USER_ROLES, message: "Invalid user role" },
      default: "salesman",
      required: true,
      immutable: true,
    },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    isActive: { type: Boolean, default: true },
    assignedRoutes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Route" }],
    dailySalesTarget: { type: Number, min: 0, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
