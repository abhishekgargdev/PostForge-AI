"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  FileTextIcon,
  SparklesIcon,
  InboxIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import type { AnalyticsOverview } from "@/lib/analytics/overview";
import { formatPlatformLabel } from "@/lib/posts/serialize";
import { PostStatusBadge } from "@/components/posts/post-status-badge";
import { PublishedPostsChart } from "@/components/dashboard/published-posts-chart";
import { DailyQuestionWidget } from "@/components/dashboard/daily-question-widget";
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
import { cn } from "@/lib/utils";

const statCards = [
  {
    key: "totalPosts" as const,
    title: "Total Posts",
    icon: SparklesIcon,
    tint: "bg-forge/10 text-forge",
  },
  {
    key: "confirmed" as const,
    title: "Confirmed Queue",
    icon: InboxIcon,
    tint: "bg-teal-50 text-teal-700",
  },
  {
    key: "scheduled" as const,
    title: "Scheduled",
    icon: CalendarClockIcon,
    tint: "bg-circuit/10 text-circuit",
  },
  {
    key: "publishedThisWeek" as const,
    title: "Published This Week",
    icon: CheckCircle2Icon,
    tint: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "drafts" as const,
    title: "Drafts",
    icon: FileTextIcon,
    tint: "bg-neutral-100 text-neutral-600",
  },
];

function truncate(text: string, length = 100) {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).trim()}...`;
}

function StatCard({
  title,
  icon: Icon,
  tint,
  value,
  isLoading,
}: {
  title: string;
  icon: typeof SparklesIcon;
  tint: string;
  value: number;
  isLoading: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="h-full"
    >
      <Card
        size="sm"
        className="h-full transition-shadow duration-200 hover:shadow-md motion-reduce:hover:shadow-none"
      >
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-neutral-500">
            {title}
          </CardTitle>
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              tint,
            )}
          >
            <Icon className="size-5" strokeWidth={2} aria-hidden />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SectionSkeleton rows={1} rowClassName="h-9 w-20" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight text-ink">
              {value}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            title={card.title}
            icon={card.icon}
            tint={card.tint}
            isLoading={isLoading}
            value={overview?.counts[card.key] ?? 0}
          />
        ))}
      </div>

      <DailyQuestionWidget onPostCreated={fetchOverview} />

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
                  className="rounded-lg border border-neutral-200 p-3"
                >
                  <p className="text-sm font-medium">
                    {formatPlatformLabel(metric.platform)}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-500">
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
            <ul className="divide-y divide-neutral-200">
              {overview.recentPosts.map((post) => (
                <li
                  key={post.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {truncate(post.content)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated {format(new Date(post.updatedAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PostStatusBadge status={post.status} />
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
            <EmptyState
              icon={SparklesIcon}
              title="No posts yet"
              description="Create your first post and activity will show up here."
              action={
                <Button
                  render={<Link href="/posts/new" />}
                  nativeButton={false}
                  className="h-11"
                >
                  Create post
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
