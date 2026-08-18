import mongoose from "mongoose";

import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { toPostResponse } from "@/lib/posts/serialize";
import {
  parseScheduledAt,
  updatePostSchema,
} from "@/lib/validation/posts";
import Post from "@/models/Post";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getOwnedPost(userId: string, postId: string) {
  await connectDB();
  return Post.findOne({ _id: postId, userId });
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const post = await getOwnedPost(user.id, id);

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Post not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: toPostResponse(post.toObject()),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to fetch post";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "GET_POST_FAILED" },
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);

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

    const post = await getOwnedPost(user.id, id);

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Post not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    if (parsed.data.content !== undefined) {
      post.content = parsed.data.content;
    }
    if (parsed.data.aiPrompt !== undefined) {
      post.aiPrompt = parsed.data.aiPrompt;
    }
    if (parsed.data.platforms !== undefined) {
      post.platforms = parsed.data.platforms;
    }
    if (parsed.data.imageUrl !== undefined) {
      post.imageUrl = parsed.data.imageUrl;
    }
    if (parsed.data.mediaLibraryId !== undefined) {
      post.mediaLibraryId = parsed.data.mediaLibraryId
        ? new mongoose.Types.ObjectId(parsed.data.mediaLibraryId)
        : undefined;
    }
    if (parsed.data.status !== undefined) {
      post.status = parsed.data.status;
      if (parsed.data.status === "published" && !post.publishedAt) {
        post.publishedAt = new Date();
      }
    }
    if (parsed.data.scheduledAt !== undefined) {
      post.scheduledAt = parseScheduledAt(parsed.data.scheduledAt);
    }

    await post.save();

    return NextResponse.json({
      success: true,
      data: toPostResponse(post.toObject()),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to update post";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "UPDATE_POST_FAILED" },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const post = await getOwnedPost(user.id, id);

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Post not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    await post.deleteOne();

    return NextResponse.json({
      success: true,
      data: { deleted: true, id },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to delete post";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "DELETE_POST_FAILED" },
      },
      { status: 500 },
    );
  }
}
