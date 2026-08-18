import { cookies } from "next/headers";

import { toPublicUser, type PublicUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { verifyToken } from "@/lib/jwt";
import type { IUser } from "@/models/User";
import User from "@/models/User";

export async function getSessionUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const { COOKIE_NAME } = getEnv();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  await connectDB();

  const user = await User.findById(payload.userId)
    .select("-passwordHash")
    .lean<
      Pick<
        IUser,
        "email" | "fullName" | "avatarUrl" | "timezone" | "createdAt" | "updatedAt"
      > & { _id: { toString(): string } }
    >();

  if (!user) {
    return null;
  }

  return toPublicUser(user);
}
