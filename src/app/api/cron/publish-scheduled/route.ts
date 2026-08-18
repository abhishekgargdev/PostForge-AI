import { NextRequest, NextResponse } from "next/server";

import {
  unauthorizedCronResponse,
  verifyCronRequest,
} from "@/lib/cron/auth";
import { processDueScheduledPosts } from "@/lib/publishing/publish-post";

export async function POST(request: NextRequest) {
  try {
    if (!verifyCronRequest(request)) {
      return unauthorizedCronResponse();
    }

    const summary = await processDueScheduledPosts();

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to process scheduled posts";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "CRON_PUBLISH_FAILED" },
      },
      { status: 500 },
    );
  }
}
