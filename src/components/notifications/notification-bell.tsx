"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { BellIcon } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import type {
  NotificationResponse,
  NotificationsListResponse,
} from "@/lib/notifications/serialize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionSkeleton } from "@/components/ui/loaders";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await apiClient<NotificationsListResponse>(
        "/api/notifications",
      );
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load notifications",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) {
      void fetchNotifications();
    }
  }, [open, fetchNotifications]);

  async function handleNotificationClick(notification: NotificationResponse) {
    if (notification.isRead || markingReadId === notification.id) {
      return;
    }

    setMarkingReadId(notification.id);

    try {
      const updated = await apiClient<NotificationResponse>(
        `/api/notifications/${notification.id}/read`,
        { method: "PUT" },
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to mark notification as read",
      );
    } finally {
      setMarkingReadId(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            aria-label="Open notifications"
          />
        }
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full p-0 text-[10px]"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        ) : null}
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Publish results and AI generation alerts.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
          {isLoading ? (
            <SectionSkeleton rows={5} rowClassName="h-20 rounded-lg" />
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted/60",
                      !notification.isRead && "bg-muted/30",
                      markingReadId === notification.id && "opacity-70",
                    )}
                    disabled={markingReadId === notification.id}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">
                        {notification.title}
                      </p>
                      {!notification.isRead ? (
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
