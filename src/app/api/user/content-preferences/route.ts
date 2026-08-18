import { NextRequest, NextResponse } from "next/server";

import {
  getWeekdayForDate,
  WEEKDAY_LABELS,
  type DayContentPreference,
  type Weekday,
} from "@/lib/content-preferences/types";
import { POST_GOAL_LABELS } from "@/lib/validation/ai";
import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

function normalizePreferences(
  value: unknown,
): Partial<Record<Weekday, DayContentPreference>> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as Partial<Record<Weekday, DayContentPreference>>;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await connectDB();

    const dbUser = await User.findById(user.id)
      .select("weeklyContentPreferences timezone")
      .lean<{ weeklyContentPreferences?: unknown; timezone?: string }>();

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
    const now = new Date();
    const weekday = getWeekdayForDate(now);
    const preferences = normalizePreferences(dbUser.weeklyContentPreferences);
    const todayPreference = preferences[weekday] ?? null;

    return NextResponse.json({
      success: true,
      data: {
        weekday,
        weekdayLabel: WEEKDAY_LABELS[weekday],
        timezone,
        todayPreference,
        goalLabel: todayPreference
          ? POST_GOAL_LABELS[todayPreference.goal]
          : undefined,
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch content preferences";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "CONTENT_PREFERENCES_FAILED" },
      },
      { status: 500 },
    );
  }
}
