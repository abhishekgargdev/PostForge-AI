import { NextRequest, NextResponse } from "next/server";

import { toDayPreferenceResponse } from "@/lib/day-preferences/serialize";
import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  DAY_OF_WEEK_LABELS,
  getDayOfWeekInTimezone,
} from "@/lib/content-preferences/types";
import DayPreference from "@/models/DayPreference";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await connectDB();

    const dbUser = await User.findById(user.id).select("timezone").lean<{
      timezone?: string;
    }>();

    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "User not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    const timezone = dbUser.timezone || "UTC";
    const todayDayOfWeek = getDayOfWeekInTimezone(timezone);

    const preferences = await DayPreference.find({ userId: user.id })
      .sort({ dayOfWeek: 1 })
      .lean<
        Array<
          Parameters<typeof toDayPreferenceResponse>[0] & {
            createdAt: Date;
            updatedAt: Date;
          }
        >
      >();

    return NextResponse.json({
      success: true,
      data: {
        timezone,
        todayDayOfWeek,
        todayDayLabel: DAY_OF_WEEK_LABELS[todayDayOfWeek],
        preferences: preferences.map(toDayPreferenceResponse),
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch day preferences";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "LIST_DAY_PREFERENCES_FAILED" },
      },
      { status: 500 },
    );
  }
}
