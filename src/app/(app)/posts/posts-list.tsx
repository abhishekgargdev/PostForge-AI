"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  PlusIcon,
  SparklesIcon,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Send,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import {
  formatPlatformLabel,
  formatPostScheduleLabel,
  type PaginatedPostsResponse,
  type PostResponse,
} from "@/lib/posts/serialize";
import { PostStatusBadge } from "@/components/posts/post-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionSkeleton } from "@/components/ui/loaders";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { POST_STATUSES, type PostStatus } from "@/types/posts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loaders";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/types/platforms";
import { convertLocalToUtc, convertUtcToLocalString } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: Array<PostStatus | "all"> = ["all", ...POST_STATUSES];

function truncate(text: string, length = 120) {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).trim()}...`;
}

export function PostsList() {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPost, setSelectedPost] = useState<PostResponse | null>(null);
  const [activeDialog, setActiveDialog] = useState<"view" | "edit" | "delete" | "publish" | null>(null);
  const [userTimezone, setUserTimezone] = useState("UTC");

  // Edit form state
  const [editContent, setEditContent] = useState("");
  const [editPlatforms, setEditPlatforms] = useState<SocialPlatform[]>([]);
  const [editStatus, setEditStatus] = useState<PostStatus>("draft");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editPostType, setEditPostType] = useState<"post" | "article">("post");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editArticleUrl, setEditArticleUrl] = useState("");
  const [editArticleTitle, setEditArticleTitle] = useState("");
  const [editArticleDescription, setEditArticleDescription] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load timezone on mount
  useEffect(() => {
    apiClient<{ timezone: string }>("/api/auth/me")
      .then((me) => setUserTimezone(me.timezone || "UTC"))
      .catch(() => setUserTimezone("UTC"));
  }, []);

  const handleOpenDialog = (post: PostResponse, type: "view" | "edit" | "delete" | "publish") => {
    setSelectedPost(post);
    setActiveDialog(type);

    if (type === "edit") {
      setEditContent(post.content);
      setEditPlatforms(post.platforms);
      setEditStatus(post.status);
      setEditPostType(post.postType || "post");
      setEditImageUrl(post.imageUrl || "");
      setEditArticleUrl(post.articleUrl || "");
      setEditArticleTitle(post.articleTitle || "");
      setEditArticleDescription(post.articleDescription || "");
      if (post.scheduledAt) {
        setEditScheduledAt(convertUtcToLocalString(post.scheduledAt, userTimezone));
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowLocal = convertUtcToLocalString(tomorrow, userTimezone);
        const [datePart] = tomorrowLocal.split("T");
        setEditScheduledAt(`${datePart}T09:00`);
      }
    }
  };

  const handleCloseDialog = () => {
    setActiveDialog(null);
    setSelectedPost(null);
  };

  const toggleEditPlatform = (platform: SocialPlatform) => {
    setEditPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    setIsActionLoading(true);
    try {
      await apiClient(`/api/posts/${selectedPost.id}`, {
        method: "DELETE",
      });
      toast.success("Post deleted successfully");
      handleCloseDialog();
      void fetchPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete post");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePublishPostNow = async () => {
    if (!selectedPost) return;
    setIsActionLoading(true);
    try {
      const result = await apiClient<{ post: PostResponse }>(
        `/api/posts/${selectedPost.id}/publish`,
        { method: "POST" }
      );
      toast.success(
        result.post.status === "published"
          ? "Post published successfully"
          : result.post.status === "failed"
            ? "Publishing failed on all platforms"
            : "Post is publishing"
      );
      handleCloseDialog();
      void fetchPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to publish post");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaveEditPost = async () => {
    if (!selectedPost) return;

    if (!editContent.trim()) {
      toast.error("Content is required");
      return;
    }

    if (editPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }

    let isoScheduledAt = undefined;
    if (editStatus === "scheduled") {
      if (!editScheduledAt) {
        toast.error("Scheduled date and time is required");
        return;
      }
      const scheduleDate = convertLocalToUtc(editScheduledAt, userTimezone);
      if (Number.isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
        toast.error("Scheduled time must be in the future");
        return;
      }
      isoScheduledAt = scheduleDate.toISOString();
    }

    if (editPostType === "article") {
      if (!editArticleUrl.trim()) {
        toast.error("Article URL is required");
        return;
      }
      try {
        new URL(editArticleUrl);
      } catch {
        toast.error("Invalid Article URL");
        return;
      }
    }

    setIsActionLoading(true);
    try {
      await apiClient(`/api/posts/${selectedPost.id}`, {
        method: "PUT",
        body: JSON.stringify({
          content: editContent,
          platforms: editPlatforms,
          status: editStatus,
          scheduledAt: isoScheduledAt,
          timezone: userTimezone,
          postType: editPostType,
          imageUrl: editImageUrl.trim() || null,
          articleUrl: editPostType === "article" ? editArticleUrl.trim() : null,
          articleTitle: editPostType === "article" ? editArticleTitle.trim() || null : null,
          articleDescription: editPostType === "article" ? editArticleDescription.trim() || null : null,
        }),
      });
      toast.success("Post updated successfully");
      handleCloseDialog();
      void fetchPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update post");
    } finally {
      setIsActionLoading(false);
    }
  };

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        status: statusFilter,
      });

      const data = await apiClient<PaginatedPostsResponse>(
        `/api/posts?${params.toString()}`,
      );

      setPosts(data.posts);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load posts",
      );
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
          <p className="text-sm text-muted-foreground">
            Drafts, scheduled posts, and published content in one place.
          </p>
        </div>

        <Button render={<Link href="/posts/new" />} nativeButton={false} className="h-11">
          <PlusIcon />
          Create post
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-2 sm:w-56">
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as PostStatus | "all")
            }
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "all"
                    ? "All statuses"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
      </div>

      {isLoading ? (
        <>
          <div className="grid gap-4 md:hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <SectionSkeleton key={index} rows={1} rowClassName="h-32 rounded-xl" />
            ))}
          </div>
          <div className="hidden md:block">
            <SectionSkeleton rows={6} rowClassName="h-12" />
          </div>
        </>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={SparklesIcon}
          title="No posts yet"
          description="Your drafts, scheduled posts, and published content will live here."
          action={
            <Button render={<Link href="/posts/new" />} nativeButton={false} className="h-11">
              <PlusIcon className="size-5" strokeWidth={2} />
              Create post
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:hidden">
            {posts.map((post) => (
              <Card key={post.id} size="sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="line-clamp-2 text-base">
                      {post.postType === "article" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-forge uppercase tracking-wide bg-forge/10 px-2 py-0.5 rounded mr-2">
                          Article
                        </span>
                      ) : null}
                      {truncate(post.content, 80)}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <PostStatusBadge status={post.status} />
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" aria-label="Open actions menu">
                              <MoreVertical className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handleOpenDialog(post, "view")}>
                            <Eye className="mr-2 size-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDialog(post, "edit")}>
                            <Edit className="mr-2 size-4" /> Edit Post
                          </DropdownMenuItem>
                          {post.status !== "published" && post.status !== "publishing" && (
                            <DropdownMenuItem onClick={() => handleOpenDialog(post, "publish")}>
                              <Send className="mr-2 size-4" /> Post Now
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => handleOpenDialog(post, "delete")}>
                            <Trash2 className="mr-2 size-4" /> Delete Post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardDescription>
                    {formatPostScheduleLabel(post) ??
                      `Updated ${format(new Date(post.updatedAt), "MMM d, yyyy h:mm a")}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {post.platforms.map((platform) => (
                    <Badge key={platform} variant="outline">
                      {formatPlatformLabel(platform)}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Platforms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule / Updated</TableHead>
                  <TableHead className="w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="max-w-md">
                      <div className="flex items-center gap-2">
                        {post.postType === "article" ? (
                          <Badge className="bg-forge/10 text-forge border-transparent hover:bg-forge/15 text-[10px] font-bold uppercase tracking-wide shrink-0">
                            Article
                          </Badge>
                        ) : null}
                        <p className="line-clamp-2">{post.content}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {post.platforms.map((platform) => (
                          <Badge key={platform} variant="outline">
                            {formatPlatformLabel(platform)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <PostStatusBadge status={post.status} />
                        {post.status === "scheduled" && post.scheduledAt ? (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(post.scheduledAt), "MMM d, yyyy h:mm a")}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatPostScheduleLabel(post) ??
                        format(new Date(post.updatedAt), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" aria-label="Open actions menu">
                              <MoreVertical className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handleOpenDialog(post, "view")}>
                            <Eye className="mr-2 size-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDialog(post, "edit")}>
                            <Edit className="mr-2 size-4" /> Edit Post
                          </DropdownMenuItem>
                          {post.status !== "published" && post.status !== "publishing" && (
                            <DropdownMenuItem onClick={() => handleOpenDialog(post, "publish")}>
                              <Send className="mr-2 size-4" /> Post Now
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => handleOpenDialog(post, "delete")}>
                            <Trash2 className="mr-2 size-4" /> Delete Post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={isLoading || page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={isLoading || page >= totalPages}
          onClick={() =>
            setPage((current) => Math.min(totalPages, current + 1))
          }
        >
          Next
        </Button>
      </div>
    </div>

      {/* View Dialog */}
      <Dialog open={activeDialog === "view"} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
            <DialogDescription>Full details and configuration of this post.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Type
                </span>
                <div>
                  <Badge className="capitalize">
                    {selectedPost?.postType || "post"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Status
                </span>
                <div>
                  {selectedPost && <PostStatusBadge status={selectedPost.status} />}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Content
              </span>
              <div className="rounded-xl border bg-neutral-50 p-3 text-sm whitespace-pre-wrap dark:bg-ink dark:border-neutral-800">
                {selectedPost?.content}
              </div>
            </div>

            {selectedPost?.postType === "article" && selectedPost.articleUrl && (
              <div className="space-y-3 rounded-xl border bg-neutral-50/50 p-3 dark:bg-ink/50 dark:border-neutral-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
                    Article Link
                  </span>
                  <a
                    href={selectedPost.articleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs font-medium text-forge hover:underline truncate"
                  >
                    {selectedPost.articleUrl}
                  </a>
                </div>
                {selectedPost.articleTitle && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
                      Article Title
                    </span>
                    <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      {selectedPost.articleTitle}
                    </p>
                  </div>
                )}
                {selectedPost.articleDescription && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
                      Article Description
                    </span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {selectedPost.articleDescription}
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedPost?.imageUrl && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Attached Image
                </span>
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-neutral-100 dark:bg-ink dark:border-neutral-800">
                  <img
                    src={selectedPost.imageUrl}
                    alt="Attached visual"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Platforms
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedPost?.platforms.map((platform) => (
                  <Badge key={platform} variant="outline">
                    {formatPlatformLabel(platform)}
                  </Badge>
                ))}
              </div>
            </div>

            {selectedPost?.scheduledAt && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Scheduled Time
                </span>
                <p className="text-sm">
                  {format(new Date(selectedPost.scheduledAt), "MMM d, yyyy h:mm a")} ({userTimezone})
                </p>
              </div>
            )}

            {selectedPost?.aiPrompt && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  AI Generation Prompt / Metadata
                </span>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                  {selectedPost.aiPrompt}
                </p>
              </div>
            )}
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={activeDialog === "edit"} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>Update your content, type, platforms, and scheduling settings.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-post-type">Post Type</Label>
                <select
                  id="edit-post-type"
                  value={editPostType}
                  onChange={(e) => setEditPostType(e.target.value as "post" | "article")}
                  className="w-full h-11 px-3 text-sm bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-forge dark:bg-ink dark:border-neutral-800"
                >
                  <option value="post">Regular Post</option>
                  <option value="article">Article Share</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as PostStatus)}
                  className="w-full h-11 px-3 text-sm bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-forge dark:bg-ink dark:border-neutral-800"
                >
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-content">Content / Commentary</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="text-sm"
                placeholder="Write your post content..."
              />
            </div>

            {/* If Article, show article fields */}
            {editPostType === "article" && (
              <div className="space-y-3 p-3 rounded-xl border bg-neutral-50/50 dark:bg-ink/50 dark:border-neutral-800">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Article details</p>
                <div className="space-y-1">
                  <Label htmlFor="edit-article-url">Article URL</Label>
                  <Input
                    id="edit-article-url"
                    type="url"
                    value={editArticleUrl}
                    onChange={(e) => setEditArticleUrl(e.target.value)}
                    placeholder="https://example.com/my-article"
                    className="h-10 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-article-title">Article Title</Label>
                  <Input
                    id="edit-article-title"
                    type="text"
                    value={editArticleTitle}
                    onChange={(e) => setEditArticleTitle(e.target.value)}
                    placeholder="Enter headline..."
                    className="h-10 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-article-description">Article Description</Label>
                  <Textarea
                    id="edit-article-description"
                    value={editArticleDescription}
                    onChange={(e) => setEditArticleDescription(e.target.value)}
                    placeholder="Short summary description..."
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {/* Direct Image URL input */}
            <div className="space-y-1">
              <Label htmlFor="edit-image-url">Direct Image URL (Optional)</Label>
              <Input
                id="edit-image-url"
                type="url"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg (paste direct image links here)"
                className="h-11 text-xs"
              />
            </div>

            {/* Platform Selection */}
            <div className="space-y-1">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const isSelected = editPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => toggleEditPlatform(platform)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                        isSelected
                          ? "bg-forge text-white border-transparent"
                          : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 dark:bg-ink dark:text-neutral-400 dark:border-neutral-800"
                      )}
                    >
                      {formatPlatformLabel(platform)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule time if scheduled */}
            {editStatus === "scheduled" && (
              <div className="space-y-1">
                <Label htmlFor="edit-scheduled-at">Schedule Time</Label>
                <Input
                  id="edit-scheduled-at"
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                  className="h-11 text-xs"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={handleCloseDialog} disabled={isActionLoading}>
              Cancel
            </Button>
            <Button className="h-11 bg-gradient-forge text-white" onClick={handleSaveEditPost} disabled={isActionLoading}>
              {isActionLoading ? <Loader size="sm" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={activeDialog === "delete"} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={handleCloseDialog} disabled={isActionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" className="h-11" onClick={handleDeletePost} disabled={isActionLoading}>
              {isActionLoading ? <Loader size="sm" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Confirmation Dialog */}
      <Dialog open={activeDialog === "publish"} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Publish Post Now</DialogTitle>
            <DialogDescription>
              Are you sure you want to publish this post immediately to all selected platforms?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={handleCloseDialog} disabled={isActionLoading}>
              Cancel
            </Button>
            <Button className="h-11 bg-gradient-forge text-white" onClick={handlePublishPostNow} disabled={isActionLoading}>
              {isActionLoading ? <Loader size="sm" /> : "Publish Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
