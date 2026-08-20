import { NextRequest, NextResponse } from "next/server";

import mongoose from "mongoose";
import { isAuthError, requireAuth } from "@/lib/auth";
import {
  PaginatedPostsResponse,
  toPostResponse,
} from "@/lib/posts/serialize";
import {
  createPostSchema,
  listPostsQuerySchema,
  parseScheduledAt,
} from "@/lib/validation/posts";
import { connectDB } from "@/lib/db";
import { ensurePostPlatformsForPost } from "@/lib/publishing/ensure-post-platforms";
import Post from "@/models/Post";
import PostPlatform from "@/models/PostPlatform";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const query = listPostsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    if (!query.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: query.error.issues[0]?.message ?? "Invalid query",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 },
      );
    }

    const { page, limit, status } = query.data;
    const filter: Record<string, unknown> = { userId: user.id };
    let sortOptions: Record<string, 1 | -1> = { updatedAt: -1 };

    if (status === "queue") {
      filter.status = { $in: ["scheduled", "publishing", "failed"] };
      sortOptions = { scheduledAt: 1 };
    } else if (status !== "all") {
      filter.status = status;
    }

    await connectDB();

    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean<
          Array<
            Parameters<typeof toPostResponse>[0]
          >
        >(),
      Post.countDocuments(filter),
    ]);

    const postIds = posts.map((p) => p._id.toString());
    const platformsData = await PostPlatform.find({ postId: { $in: postIds } as any }).lean();

    const postsWithPlatforms = posts.map((p) => {
      const resp = toPostResponse(p);
      const details = platformsData
        .filter((pp) => pp.postId.toString() === p._id.toString())
        .map((pp) => ({
          platform: pp.platform,
          status: pp.status,
          errorMessage: pp.errorMessage,
          retryCount: pp.retryCount,
        }));
      return {
        ...resp,
        platformsDetail: details,
      };
    });

    const data = {
      posts: postsWithPlatforms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to fetch posts";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "LIST_POSTS_FAILED" },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message ?? "Invalid input",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 },
      );
    }

    await connectDB();

    const scheduledAt = parseScheduledAt(parsed.data.scheduledAt);
    const publishedAt =
      parsed.data.status === "published" ? new Date() : undefined;

    const post = await Post.create({
      userId: user.id,
      content: parsed.data.content,
      aiPrompt: parsed.data.aiPrompt,
      platforms: parsed.data.platforms,
      imageUrl: parsed.data.imageUrl || undefined,
      mediaLibraryId: parsed.data.mediaLibraryId
        ? new mongoose.Types.ObjectId(parsed.data.mediaLibraryId)
        : undefined,
      status: parsed.data.status,
      scheduledAt,
      publishedAt,
      topic: parsed.data.topic,
      category: parsed.data.category,
      subtopic: parsed.data.subtopic,
      format: parsed.data.format,
      timezone: parsed.data.timezone || user.timezone || "UTC",
      imageStatus: parsed.data.imageStatus,
    });

    if (
      parsed.data.platformContent &&
      Object.keys(parsed.data.platformContent).length > 0
    ) {
      await ensurePostPlatformsForPost(post, parsed.data.platformContent);
    } else if (parsed.data.status === "scheduled") {
      await ensurePostPlatformsForPost(post);
    }

    return NextResponse.json(
      {
        success: true,
        data: toPostResponse(post.toObject()),
      },
      { status: 201 },
    );
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to create post";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "CREATE_POST_FAILED" },
      },
      { status: 500 },
    );
  }
}
