"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { PlusIcon, SparklesIcon } from "lucide-react";
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
import { POST_STATUSES, type PostStatus } from "@/models/Post";

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
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
          <p className="text-sm text-muted-foreground">
            Drafts, scheduled posts, and published content in one place.
          </p>
        </div>

        <Button render={<Link href="/posts/new" />} className="h-11">
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
            <Button render={<Link href="/posts/new" />} className="h-11">
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
                      {truncate(post.content, 80)}
                    </CardTitle>
                    <PostStatusBadge status={post.status} />
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-2">{post.content}</p>
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
  );
}
