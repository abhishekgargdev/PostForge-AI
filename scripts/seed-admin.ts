import mongoose from "mongoose";

import { hashPassword } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import User from "@/models/User";

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in your environment.",
    );
  }

  const { MONGODB_URI } = getEnv();

  await mongoose.connect(MONGODB_URI);

  const passwordHash = await hashPassword(password);

  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        passwordHash,
        fullName: "Admin",
        timezone: "UTC",
      },
      $setOnInsert: {
        email,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  console.log(`Seeded admin user: ${user.email} (${user._id.toString()})`);
}

seedAdmin()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
