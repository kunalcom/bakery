import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/modules/users/user.model.js";

async function main() {
  const { MONGO_URI, OWNER_NAME, OWNER_EMAIL, OWNER_PASSWORD } = process.env;

  if (!MONGO_URI || !OWNER_NAME || !OWNER_EMAIL || !OWNER_PASSWORD) {
    throw new Error(
      "Set MONGO_URI, OWNER_NAME, OWNER_EMAIL and OWNER_PASSWORD in .env"
    );
  }

  if (OWNER_PASSWORD.length < 12 || OWNER_PASSWORD.length > 128) {
    throw new Error("OWNER_PASSWORD must be between 12 and 128 characters");
  }

  await mongoose.connect(MONGO_URI);

  const email = OWNER_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });

  if (existing) {
    throw new Error(
      "That email already exists. No account was changed; inspect the existing account."
    );
  }

  const owner = await User.create({
    name: OWNER_NAME.trim(),
    email,
    password: OWNER_PASSWORD,
    role: "owner",
  });

  console.log(`Owner account created: ${owner.email}`);
}

main()
  .catch((error) => {
    console.error("Owner bootstrap failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
