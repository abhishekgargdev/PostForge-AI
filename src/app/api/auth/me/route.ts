import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to fetch session";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "ME_FAILED" },
      },
      { status: 500 },
    );
  }
}
