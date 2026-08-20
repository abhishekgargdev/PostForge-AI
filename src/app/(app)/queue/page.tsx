"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  Clock,
  Edit2,
  Calendar,
  Trash2,
  RefreshCw,
  XCircle,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default function QueuePage() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal actions
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // Form states
  const [editContent, setEditContent] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<{ posts: PostItem[] }>("/api/posts?status=queue&limit=100");
      setPosts(res.posts || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load queue",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  // Actions
  const handleEditClick = (post: PostItem) => {
    setSelectedPost(post);
    setEditContent(post.content);
    setIsEditOpen(true);
  };

  const handleRescheduleClick = (post: PostItem) => {
    setSelectedPost(post);
    // Convert UTC time to local datetime-local value format
    if (post.scheduledAt) {
      const localTime = new Date(post.scheduledAt);
      const year = localTime.getFullYear();
      const month = String(localTime.getMonth() + 1).padStart(2, "0");
      const day = String(localTime.getDate()).padStart(2, "0");
      const hours = String(localTime.getHours()).padStart(2, "0");
      const minutes = String(localTime.getMinutes()).padStart(2, "0");
      setRescheduleTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setRescheduleTime("");
    }
    setIsRescheduleOpen(true);
  };

  const handleCancelClick = (post: PostItem) => {
    setSelectedPost(post);
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
      void fetchQueue();
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
      void fetchQueue();
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
      toast.success("Post removed from queue and saved as draft");
      setIsCancelOpen(false);
      void fetchQueue();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove post from queue",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = async (post: PostItem) => {
    try {
      toast.loading("Re-queueing post for publication...");
      await apiClient(`/api/posts/${post.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "scheduled" }),
      });
      toast.dismiss();
      toast.success("Post successfully re-queued!");
      void fetchQueue();
    } catch (error) {
      toast.dismiss();
      toast.error(
        error instanceof Error ? error.message : "Unable to retry post",
      );
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Inbox className="size-6 text-forge" />
            Publication Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage posts that are scheduled to publish automatically.
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing queued yet"
          description="Create and schedule some posts from the AI Content Studio to get started."
          action={
            <Button render={<Link href="/studio" />} nativeButton={false} className="h-11 bg-gradient-forge text-white">
              Go to Content Studio
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-neutral-200/60 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-neutral-50/75 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Content Preview</th>
                  <th className="p-4">Platforms & Status</th>
                  <th className="p-4">Scheduled Date/Time</th>
                  <th className="p-4">Queue Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4 pl-6 max-w-sm">
                      <p className="line-clamp-2 text-ink leading-relaxed font-medium">
                        {post.content}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        Created {format(new Date(post.createdAt), "MMM d, yyyy")}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        {post.platformsDetail?.map((detail) => (
                          <div key={detail.platform} className="flex items-center gap-2 text-xs">
                            <span className="font-medium text-neutral-600">
                              {formatPlatformLabel(detail.platform as any)}:
                            </span>
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
                              <span className="text-[10px] text-rose-500 italic truncate max-w-xs" title={detail.errorMessage}>
                                ({detail.errorMessage})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      {post.scheduledAt ? (
                        <div className="flex items-center gap-2 text-neutral-700 font-medium">
                          <Clock className="size-4 text-forge" />
                          <span>{format(new Date(post.scheduledAt), "MMM d, h:mm a")}</span>
                          {post.timezone && (
                            <span className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">
                              {post.timezone}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-400">Not scheduled</span>
                      )}
                    </td>
                    <td className="p-4">
                      <PostStatusBadge status={post.status} />
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        {post.status === "failed" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 border-rose-200 text-rose-700 hover:bg-rose-50"
                            onClick={() => void handleRetry(post)}
                          >
                            <RefreshCw className="mr-1.5 size-3.5" />
                            Retry
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={() => handleEditClick(post)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={() => handleRescheduleClick(post)}
                        >
                          <Calendar className="size-4" />
                        </Button>
                        {post.status !== "publishing" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => handleCancelClick(post)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {posts.map((post) => (
              <Card key={post.id} size="sm">
                <CardHeader className="pb-3 flex-row justify-between items-start space-y-0">
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-400">
                      Created {format(new Date(post.createdAt), "MMM d, yyyy")}
                    </p>
                    <PostStatusBadge status={post.status} />
                  </div>
                  <div className="flex gap-1.5">
                    {post.status === "failed" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-rose-200 text-rose-700"
                        onClick={() => void handleRetry(post)}
                      >
                        <RefreshCw className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEditClick(post)}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleRescheduleClick(post)}
                    >
                      <Calendar className="size-3.5" />
                    </Button>
                    {post.status !== "publishing" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500"
                        onClick={() => handleCancelClick(post)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-ink leading-relaxed font-medium line-clamp-3">
                    {post.content}
                  </p>

                  <div className="border-t border-neutral-100 pt-2 space-y-2">
                    {post.scheduledAt && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
                        <Clock className="size-3.5 text-forge" />
                        <span>{format(new Date(post.scheduledAt), "MMM d, h:mm a")}</span>
                        {post.timezone && <span>({post.timezone})</span>}
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      {post.platformsDetail?.map((detail) => (
                        <div key={detail.platform} className="flex items-center justify-between text-xs py-1">
                          <span className="font-medium text-neutral-500">
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Content Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post Commentary</DialogTitle>
            <DialogDescription>Modify the copy description directly before it is published.</DialogDescription>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Publication</DialogTitle>
            <DialogDescription>Choose a new date and time for publication.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="reschedule-time">Publication Date & Time</Label>
            <Input
              id="reschedule-time"
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

      {/* Remove from Queue Confirmation Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent>
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
