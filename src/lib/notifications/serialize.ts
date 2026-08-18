import type { INotification } from "@/models/Notification";

export type NotificationResponse = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsListResponse = {
  notifications: NotificationResponse[];
  unreadCount: number;
};

type NotificationLike = Pick<
  INotification,
  "type" | "title" | "message" | "isRead" | "createdAt"
> & {
  _id: { toString(): string };
};

export function toNotificationResponse(
  notification: NotificationLike,
): NotificationResponse {
  return {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  };
}
