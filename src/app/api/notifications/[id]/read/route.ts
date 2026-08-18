import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { toNotificationResponse } from "@/lib/notifications/serialize";
import Notification from "@/models/Notification";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    await connectDB();

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: { isRead: true } },
      { new: true },
    );

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Notification not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: toNotificationResponse(notification.toObject()),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to mark notification as read";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "MARK_NOTIFICATION_READ_FAILED" },
      },
      { status: 500 },
    );
  }
}
