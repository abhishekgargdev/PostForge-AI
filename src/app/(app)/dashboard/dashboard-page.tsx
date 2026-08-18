"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import type { AnalyticsOverview } from "@/lib/analytics/overview";
import {
  formatPlatformLabel,
  getStatusBadgeVariant,
} from "@/lib/posts/serialize";
import { PublishedPostsChart } from "@/components/dashboard/published-posts-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionSkeleton } from "@/components/ui/loaders";

const statCards = [
  { key: "totalPosts" as const, title: "Total Posts" },
  { key: "scheduled" as const, title: "Scheduled" },
  { key: "publishedThisWeek" as const, title: "Published This Week" },
  { key: "drafts" as const, title: "Drafts" },
];

function truncate(text: string, length = 100) {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).trim()}...`;
}

export function DashboardPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await apiClient<AnalyticsOverview>("/api/analytics/overview");
      setOverview(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load dashboard",
      );
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Post counts, platform activity, and recent updates at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.key} size="sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SectionSkeleton rows={1} rowClassName="h-9 w-20" />
              ) : (
                <p className="text-3xl font-semibold tracking-tight">
                  {overview?.counts[card.key] ?? 0}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" size="sm">
          <CardHeader>
            <CardTitle className="text-base">Published per day</CardTitle>
            <CardDescription>Last 14 days across all platforms</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SectionSkeleton rows={1} rowClassName="h-44 rounded-lg" />
            ) : overview ? (
              <PublishedPostsChart data={overview.publishedByDay} />
            ) : null}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">By platform</CardTitle>
            <CardDescription>PostPlatform publish outcomes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <SectionSkeleton rows={3} rowClassName="h-16 rounded-lg" />
            ) : overview ? (
              overview.platformMetrics.map((metric) => (
                <div
                  key={metric.platform}
                  className="rounded-lg border p-3"
                >
                  <p className="text-sm font-medium">
                    {formatPlatformLabel(metric.platform)}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Published: {metric.published}</span>
                    <span>Pending: {metric.pending}</span>
                    <span>Failed: {metric.failed}</span>
                    <span>Scheduled: {metric.scheduled}</span>
                  </div>
                </div>
              ))
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card size="sm">
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Recent posts</CardTitle>
            <CardDescription>Latest updates from your workspace</CardDescription>
          </div>
          <Button
            render={<Link href="/posts" />}
            nativeButton={false}
            variant="outline"
            className="h-11"
          >
            View all
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SectionSkeleton rows={5} rowClassName="h-14 rounded-lg" />
          ) : overview && overview.recentPosts.length > 0 ? (
            <ul className="divide-y">
              {overview.recentPosts.map((post) => (
                <li key={post.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {truncate(post.content)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated {format(new Date(post.updatedAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(post.status)}>
                      {post.status}
                    </Badge>
                    {post.platforms.map((platform) => (
                      <Badge key={platform} variant="outline">
                        {formatPlatformLabel(platform)}
                      </Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-3 py-4">
              <p className="text-sm text-muted-foreground">
                No posts yet. Create your first draft to see activity here.
              </p>
              <Button
                render={<Link href="/posts/new" />}
                nativeButton={false}
                className="h-11"
              >
                Create post
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
