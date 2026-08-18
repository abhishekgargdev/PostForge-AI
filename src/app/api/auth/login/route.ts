import { NextResponse } from "next/server";
import { z } from "zod";

import { toPublicUser, verifyPassword } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import {
  getAuthCookieOptions,
  parseExpiresIn,
  signToken,
} from "@/lib/jwt";
import User from "@/models/User";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message ?? "Invalid input",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    await connectDB();

    const user = await User.findOne({ email: normalizedEmail }).lean<{
      _id: { toString(): string };
      email: string;
      passwordHash: string;
      fullName: string;
      avatarUrl?: string;
      timezone: string;
      createdAt: Date;
      updatedAt: Date;
    }>();

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Invalid email or password",
            code: "INVALID_CREDENTIALS",
          },
        },
        { status: 401 },
      );
    }

    const { COOKIE_NAME, JWT_EXPIRES_IN } = getEnv();
    const token = signToken(user._id.toString());
    const response = NextResponse.json({
      success: true,
      data: toPublicUser(user),
    });

    response.cookies.set(
      COOKIE_NAME,
      token,
      getAuthCookieOptions(parseExpiresIn(JWT_EXPIRES_IN)),
    );

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to sign in";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "LOGIN_FAILED" },
      },
      { status: 500 },
    );
  }
}
