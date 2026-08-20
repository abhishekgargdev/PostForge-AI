"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Trash2,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";

import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader, SectionSkeleton } from "@/components/ui/loaders";
import { EmptyState } from "@/components/ui/empty-state";
import { PostStatusBadge } from "@/components/posts/post-status-badge";
import { formatPlatformLabel } from "@/lib/posts/serialize";

type PlatformDetail = {
  platform: string;
  status: string;
  errorMessage?: string;
  retryCount: number;
};

type PostItem = {
  id: string;
  content: string;
  status: string;
  platforms: string[];
  scheduledAt?: string;
  createdAt: string;
  timezone?: string;
  platformsDetail?: PlatformDetail[];
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog / Edit states
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // Form inputs
  const [editContent, setEditContent] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchCalendarPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch up to 500 posts for the current monthly window
      const res = await apiClient<{ posts: PostItem[] }>("/api/posts?status=queue&limit=500");
      setPosts(res.posts || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load calendar posts",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCalendarPosts();
  }, [fetchCalendarPosts]);

  // Navigate months
  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  // Calendar Math
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const daysInGrid = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Get posts for specific day
  const getPostsForDay = (day: Date) => {
    return posts.filter((post) => {
      if (!post.scheduledAt) return false;
      return isSameDay(new Date(post.scheduledAt), day);
    });
  };

  // Actions
  const handlePostClick = (post: PostItem) => {
    setSelectedPost(post);
    setIsDetailOpen(true);
  };

  const handleEditClick = () => {
    if (!selectedPost) return;
    setEditContent(selectedPost.content);
    setIsDetailOpen(false);
    setIsEditOpen(true);
  };

  const handleRescheduleClick = () => {
    if (!selectedPost) return;
    if (selectedPost.scheduledAt) {
      const localTime = new Date(selectedPost.scheduledAt);
      const year = localTime.getFullYear();
      const month = String(localTime.getMonth() + 1).padStart(2, "0");
      const day = String(localTime.getDate()).padStart(2, "0");
      const hours = String(localTime.getHours()).padStart(2, "0");
      const minutes = String(localTime.getMinutes()).padStart(2, "0");
      setRescheduleTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setRescheduleTime("");
    }
    setIsDetailOpen(false);
    setIsRescheduleOpen(true);
  };

  const handleCancelClick = () => {
    setIsDetailOpen(false);
    setIsCancelOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPost) return;
    if (!editContent.trim()) {
      toast.error("Content cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      await apiClient(`/api/posts/${selectedPost.id}`, {
        method: "PUT",
        body: JSON.stringify({ content: editContent.trim() }),
      });
      toast.success("Post updated successfully");
      setIsEditOpen(false);
      void fetchCalendarPosts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update post",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReschedule = async () => {
    if (!selectedPost || !rescheduleTime) return;

    setIsSaving(true);
    try {
      const utcDate = new Date(rescheduleTime).toISOString();
      await apiClient(`/api/posts/${selectedPost.id}`, {
        method: "PUT",
        body: JSON.stringify({ scheduledAt: utcDate, status: "scheduled" }),
      });
      toast.success("Post rescheduled successfully");
      setIsRescheduleOpen(false);
      void fetchCalendarPosts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to reschedule post",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedPost) return;

    setIsSaving(true);
    try {
      await apiClient(`/api/posts/${selectedPost.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "draft", scheduledAt: null }),
      });
      toast.success("Post removed from calendar queue");
      setIsCancelOpen(false);
      void fetchCalendarPosts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove post",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <SectionSkeleton rows={1} rowClassName="h-8 w-48" />
        <SectionSkeleton rows={4} rowClassName="h-24 rounded-xl" />
      </div>
    );
  }

  // Agenda/list grouping for mobile
  const agendaDays = daysInGrid.filter((day) => {
    const isCurrentMonth = isSameMonth(day, currentDate);
    const dayPosts = getPostsForDay(day);
    return isCurrentMonth && dayPosts.length > 0;
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarIcon className="size-6 text-forge" />
            Content Calendar
          </h1>
          <p className="text-sm text-muted-foreground">
            Schedule visual map of all queued updates across channels.
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2 bg-white border rounded-xl p-1 shadow-sm w-fit self-start sm:self-center">
          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={handlePrevMonth}>
            <ChevronLeft className="size-5" />
          </Button>
          <span className="text-sm font-semibold px-3 min-w-32 text-center text-ink">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={handleNextMonth}>
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </div>

      {/* Desktop Calendar Grid */}
      <div className="hidden md:block rounded-2xl border border-neutral-200/60 bg-white overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b bg-neutral-50/75 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider py-3">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        <div className="grid grid-cols-7 grid-rows-6 auto-rows-fr divide-x divide-y divide-neutral-100 min-h-[500px]">
          {daysInGrid.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const dayPosts = getPostsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={idx}
                className={`p-2 flex flex-col gap-1 min-h-[90px] transition-colors hover:bg-neutral-50/25 ${
                  isCurrentMonth ? "bg-white" : "bg-neutral-50/30 text-neutral-400"
                }`}
              >
                <span
                  className={`text-xs font-semibold self-end rounded-full px-1.5 py-0.5 ${
                    isToday
                      ? "bg-forge text-white"
                      : isCurrentMonth
                      ? "text-neutral-700"
                      : "text-neutral-400"
                  }`}
                >
                  {format(day, "d")}
                </span>

                <div className="flex-1 overflow-y-auto space-y-1 scrollbar-none">
                  {dayPosts.slice(0, 3).map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => handlePostClick(post)}
                      className={`w-full text-left rounded-lg p-1.5 text-[10px] font-medium leading-normal border truncate flex flex-col gap-0.5 hover:shadow-sm transition-all ${
                        post.status === "failed"
                          ? "bg-rose-50 border-rose-200 text-rose-800"
                          : post.status === "publishing"
                          ? "bg-blue-50 border-blue-200 text-blue-800"
                          : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold truncate uppercase">
                          {post.platforms.map(p => p[0]).join("+")}
                        </span>
                        <span>{format(new Date(post.scheduledAt!), "h:mm a")}</span>
                      </div>
                      <span className="truncate block font-normal text-neutral-600">
                        {post.content}
                      </span>
                    </button>
                  ))}
                  {dayPosts.length > 3 && (
                    <span className="text-[9px] text-neutral-400 font-semibold pl-1.5">
                      +{dayPosts.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Agenda List View */}
      <div className="block md:hidden space-y-4">
        {agendaDays.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No scheduled posts this month"
            description="There are no scheduled posts for this month. Pick another month or create a post."
          />
        ) : (
          agendaDays.map((day) => (
            <Card key={day.toISOString()} size="sm">
              <CardHeader className="pb-2 bg-neutral-50/50">
                <CardTitle className="text-sm font-semibold text-neutral-800 flex justify-between">
                  <span>{format(day, "EEEE, MMMM d")}</span>
                  {isSameDay(day, new Date()) && (
                    <span className="text-[10px] bg-forge text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Today
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-neutral-100 p-0">
                {getPostsForDay(day).map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => handlePostClick(post)}
                    className="w-full text-left p-4 hover:bg-neutral-50/25 transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <p className="text-sm text-ink leading-relaxed font-medium line-clamp-2">
                        {post.content}
                      </p>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <Clock className="size-3 text-neutral-400" />
                        <span className="text-xs text-neutral-500 font-medium">
                          {format(new Date(post.scheduledAt!), "h:mm a")}
                        </span>
                        {post.platforms.map((platform) => (
                          <span key={platform} className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-medium">
                            {formatPlatformLabel(platform as any)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <PostStatusBadge status={post.status as any} />
                  </button>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Post Detail dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4">
              <span>Post Details</span>
              {selectedPost && <PostStatusBadge status={selectedPost.status as any} />}
            </DialogTitle>
            <DialogDescription>
              {selectedPost?.scheduledAt && (
                <span className="flex items-center gap-1 mt-1 text-neutral-600">
                  <Clock className="size-4 text-forge" />
                  Scheduled for {format(new Date(selectedPost.scheduledAt), "PPP p")} {selectedPost.timezone && `(${selectedPost.timezone})`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedPost && (
            <div className="space-y-4 py-2 text-sm leading-relaxed">
              <div className="border rounded-xl p-3 bg-neutral-50 max-h-48 overflow-y-auto">
                <p className="text-ink font-medium whitespace-pre-wrap">{selectedPost.content}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-500">Platform Statuses</Label>
                <div className="space-y-2">
                  {selectedPost.platformsDetail?.map((detail) => (
                    <div key={detail.platform} className="flex justify-between items-center bg-white border rounded-xl p-2.5">
                      <span className="font-semibold text-neutral-700">
                        {formatPlatformLabel(detail.platform as any)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[9px] tracking-wide border ${
                            detail.status === "published"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : detail.status === "failed"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : detail.status === "publishing"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {detail.status}
                        </span>
                        {detail.status === "failed" && detail.errorMessage && (
                          <span className="text-[10px] text-rose-600 block italic" title={detail.errorMessage}>
                            Failed (retry {detail.retryCount})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between gap-3">
            <div className="flex gap-2">
              {selectedPost && selectedPost.status !== "publishing" && (
                <Button type="button" variant="ghost" className="text-red-600" onClick={handleCancelClick}>
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleRescheduleClick}>
                Reschedule
              </Button>
              <Button type="button" className="bg-gradient-forge text-white" onClick={handleEditClick}>
                Edit Copy
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit commentary dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Commentary</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              className="bg-white text-sm leading-relaxed"
              disabled={isSaving}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" className="bg-gradient-forge text-white" onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Date/Time Dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reschedule Publication</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="calendar-reschedule-time">Publication Date & Time</Label>
            <Input
              id="calendar-reschedule-time"
              type="datetime-local"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              className="h-11"
              disabled={isSaving}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRescheduleOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" className="bg-gradient-forge text-white" onClick={handleSaveReschedule} disabled={isSaving}>
              {isSaving ? "Updating..." : "Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel post confirmation dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="size-5" />
              Remove Post from Queue?
            </DialogTitle>
            <DialogDescription>
              This will remove the post from the scheduled pipeline and save it back to **Drafts** status, clearing the scheduled date.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCancelOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" className="bg-rose-600 text-white hover:bg-rose-700" onClick={handleConfirmCancel} disabled={isSaving}>
              {isSaving ? "Removing..." : "Remove & Save Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
