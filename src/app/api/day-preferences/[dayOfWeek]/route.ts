import { NextRequest, NextResponse } from "next/server";

import { toDayPreferenceResponse } from "@/lib/day-preferences/serialize";
import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  dayOfWeekParamSchema,
  upsertDayPreferenceSchema,
} from "@/lib/validation/day-preferences";
import DayPreference from "@/models/DayPreference";

type RouteContext = {
  params: Promise<{ dayOfWeek: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { dayOfWeek: dayOfWeekParam } = await context.params;
    const dayOfWeek = dayOfWeekParamSchema.safeParse(dayOfWeekParam);

    if (!dayOfWeek.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: dayOfWeek.error.issues[0]?.message ?? "Invalid dayOfWeek",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = upsertDayPreferenceSchema.safeParse(body);

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

    await connectDB();

    const preference = await DayPreference.findOneAndUpdate(
      { userId: user.id, dayOfWeek: dayOfWeek.data },
      {
        userId: user.id,
        dayOfWeek: dayOfWeek.data,
        topic: parsed.data.topic,
        goal: parsed.data.goal,
        tone: parsed.data.tone,
        isActive: parsed.data.isActive,
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({
      success: true,
      data: toDayPreferenceResponse(preference.toObject()),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to save day preference";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "UPSERT_DAY_PREFERENCE_FAILED" },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { dayOfWeek: dayOfWeekParam } = await context.params;
    const dayOfWeek = dayOfWeekParamSchema.safeParse(dayOfWeekParam);

    if (!dayOfWeek.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: dayOfWeek.error.issues[0]?.message ?? "Invalid dayOfWeek",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 },
      );
    }

    await connectDB();

    await DayPreference.deleteOne({
      userId: user.id,
      dayOfWeek: dayOfWeek.data,
    });

    return NextResponse.json({
      success: true,
      data: { dayOfWeek: dayOfWeek.data },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to delete day preference";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "DELETE_DAY_PREFERENCE_FAILED" },
      },
      { status: 500 },
    );
  }
}
