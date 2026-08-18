import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { verifyToken } from "@/lib/jwt";
import User, { type IUser } from "@/models/User";

const SALT_ROUNDS = 12;

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
};

export class AuthError extends Error {
  readonly response: NextResponse;

  constructor(message = "Not authenticated") {
    super(message);
    this.name = "AuthError";
    this.response = NextResponse.json(
      {
        success: false,
        error: { message, code: "UNAUTHORIZED" },
      },
      { status: 401 },
    );
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function toPublicUser(
  user: Pick<
    IUser,
    "email" | "fullName" | "avatarUrl" | "timezone" | "createdAt" | "updatedAt"
  > & { _id: { toString(): string } },
): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function requireAuth(req: NextRequest): Promise<PublicUser> {
  const { COOKIE_NAME } = getEnv();
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    throw new AuthError();
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new AuthError();
  }

  await connectDB();

  const user = await User.findById(payload.userId)
    .select("-passwordHash")
    .lean<Pick<IUser, "email" | "fullName" | "avatarUrl" | "timezone" | "createdAt" | "updatedAt"> & {
      _id: { toString(): string };
    }>();

  if (!user) {
    throw new AuthError();
  }

  return toPublicUser(user);
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}
