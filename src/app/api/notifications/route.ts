import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  toNotificationResponse,
  type NotificationsListResponse,
} from "@/lib/notifications/serialize";
import Notification from "@/models/Notification";

const NOTIFICATION_LIMIT = 30;

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await connectDB();

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: user.id })
        .sort({ createdAt: -1 })
        .limit(NOTIFICATION_LIMIT)
        .lean<
          Array<
            Parameters<typeof toNotificationResponse>[0]
          >
        >(),
      Notification.countDocuments({ userId: user.id, isRead: false }),
    ]);

    const data: NotificationsListResponse = {
      notifications: notifications.map(toNotificationResponse),
      unreadCount,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to fetch notifications";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "LIST_NOTIFICATIONS_FAILED" },
      },
      { status: 500 },
    );
  }
}
