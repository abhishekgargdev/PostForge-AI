import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SocialAccount from "@/models/SocialAccount";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    await connectDB();

    const account = await SocialAccount.findOne({ _id: id, userId: user.id });

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Account not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    account.accessToken = "";
    account.refreshToken = undefined;
    account.tokenExpiresAt = undefined;
    account.isConnected = false;
    account.lastSyncedAt = new Date();
    await account.save();

    return NextResponse.json({
      success: true,
      data: { disconnected: true, id },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to disconnect account";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "DISCONNECT_ACCOUNT_FAILED" },
      },
      { status: 500 },
    );
  }
}
