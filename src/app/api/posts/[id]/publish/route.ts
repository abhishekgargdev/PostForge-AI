import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ensurePostPlatformsForPost } from "@/lib/publishing/ensure-post-platforms";
import { publishAllPendingPlatformsForPost } from "@/lib/publishing/publish-post";
import { toPostResponse } from "@/lib/posts/serialize";
import Post from "@/models/Post";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const PUBLISHABLE_STATUSES = new Set(["draft", "failed", "scheduled"]);

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    await connectDB();

    const post = await Post.findOne({ _id: id, userId: user.id });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Post not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    if (!PUBLISHABLE_STATUSES.has(post.status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Post with status "${post.status}" cannot be published manually`,
            code: "INVALID_STATUS",
          },
        },
        { status: 400 },
      );
    }

    if (post.platforms.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Select at least one platform before publishing",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 },
      );
    }

    await ensurePostPlatformsForPost(post);

    post.status = "publishing";
    await post.save();

    const results = await publishAllPendingPlatformsForPost(post._id.toString());
    const refreshedPost = await Post.findById(post._id);

    return NextResponse.json({
      success: true,
      data: {
        post: toPostResponse(refreshedPost!.toObject()),
        results,
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to publish post";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "PUBLISH_POST_FAILED" },
      },
      { status: 500 },
    );
  }
}
