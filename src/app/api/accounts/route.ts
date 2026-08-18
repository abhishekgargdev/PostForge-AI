import { NextRequest, NextResponse } from "next/server";

import { buildAccountSummaries } from "@/lib/accounts/serialize";
import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SocialAccount from "@/models/SocialAccount";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await connectDB();

    const accounts = await SocialAccount.find({ userId: user.id })
      .select(
        "platform username displayName avatarUrl isConnected lastSyncedAt",
      )
      .lean<import("@/lib/accounts/serialize").AccountRecord[]>();

    return NextResponse.json({
      success: true,
      data: buildAccountSummaries(accounts),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to fetch accounts";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "LIST_ACCOUNTS_FAILED" },
      },
      { status: 500 },
    );
  }
}
