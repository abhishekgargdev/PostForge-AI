import { NextRequest, NextResponse } from "next/server";

import { getAnalyticsOverview } from "@/lib/analytics/overview";
import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await connectDB();

    const data = await getAnalyticsOverview(user.id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to fetch analytics";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "ANALYTICS_OVERVIEW_FAILED" },
      },
      { status: 500 },
    );
  }
}
