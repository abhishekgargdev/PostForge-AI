import mongoose from "mongoose";
import {
  eachDayOfInterval,
  format,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";

import { toPostResponse, type PostResponse } from "@/lib/posts/serialize";
import Post from "@/models/Post";
import PostPlatform from "@/models/PostPlatform";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/models/SocialAccount";

export type PlatformMetrics = {
  platform: SocialPlatform;
  published: number;
  failed: number;
  pending: number;
  scheduled: number;
};

export type PublishedDayPoint = {
  date: string;
  label: string;
  count: number;
};

export type AnalyticsOverview = {
  counts: {
    totalPosts: number;
    scheduled: number;
    publishedThisWeek: number;
    drafts: number;
  };
  platformMetrics: PlatformMetrics[];
  publishedByDay: PublishedDayPoint[];
  recentPosts: PostResponse[];
};

type PlatformStatusAggRow = {
  _id: {
    platform: SocialPlatform;
    status: string;
  };
  count: number;
};

type PublishedDayAggRow = {
  _id: string;
  count: number;
};

function buildPlatformMetrics(rows: PlatformStatusAggRow[]): PlatformMetrics[] {
  const byPlatform = new Map<SocialPlatform, PlatformMetrics>();

  for (const platform of SOCIAL_PLATFORMS) {
    byPlatform.set(platform, {
      platform,
      published: 0,
      failed: 0,
      pending: 0,
      scheduled: 0,
    });
  }

  for (const row of rows) {
    const metrics = byPlatform.get(row._id.platform);
    if (!metrics) {
      continue;
    }

    switch (row._id.status) {
      case "published":
        metrics.published = row.count;
        break;
      case "failed":
        metrics.failed = row.count;
        break;
      case "pending":
        metrics.pending = row.count;
        break;
      case "scheduled":
        metrics.scheduled = row.count;
        break;
      default:
        break;
    }
  }

  return SOCIAL_PLATFORMS.map((platform) => byPlatform.get(platform)!);
}

function buildPublishedByDay(
  rows: PublishedDayAggRow[],
  rangeStart: Date,
  rangeEnd: Date,
): PublishedDayPoint[] {
  const countsByDate = new Map(rows.map((row) => [row._id, row.count]));

  return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map((day) => {
    const date = format(day, "yyyy-MM-dd");

    return {
      date,
      label: format(day, "MMM d"),
      count: countsByDate.get(date) ?? 0,
    };
  });
}

export async function getAnalyticsOverview(
  userId: string,
): Promise<AnalyticsOverview> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const chartEnd = startOfDay(new Date());
  const chartStart = startOfDay(subDays(chartEnd, 13));

  const postLookupStages = [
    {
      $lookup: {
        from: "posts",
        localField: "postId",
        foreignField: "_id",
        as: "post",
      },
    },
    { $unwind: "$post" },
    { $match: { "post.userId": userObjectId } },
  ] as const;

  const [
    totalPosts,
    scheduled,
    publishedThisWeek,
    drafts,
    recentPostsRaw,
    platformRows,
    dailyRows,
  ] = await Promise.all([
    Post.countDocuments({ userId: userObjectId }),
    Post.countDocuments({ userId: userObjectId, status: "scheduled" }),
    Post.countDocuments({
      userId: userObjectId,
      status: "published",
      publishedAt: { $gte: weekStart },
    }),
    Post.countDocuments({ userId: userObjectId, status: "draft" }),
    Post.find({ userId: userObjectId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean<Array<Parameters<typeof toPostResponse>[0]>>(),
    PostPlatform.aggregate<PlatformStatusAggRow>([
      ...postLookupStages,
      {
        $group: {
          _id: { platform: "$platform", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]),
    PostPlatform.aggregate<PublishedDayAggRow>([
      ...postLookupStages,
      {
        $match: {
          status: "published",
          publishedAt: { $gte: chartStart, $lte: chartEnd },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$publishedAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    counts: {
      totalPosts,
      scheduled,
      publishedThisWeek,
      drafts,
    },
    platformMetrics: buildPlatformMetrics(platformRows),
    publishedByDay: buildPublishedByDay(dailyRows, chartStart, chartEnd),
    recentPosts: recentPostsRaw.map(toPostResponse),
  };
}
