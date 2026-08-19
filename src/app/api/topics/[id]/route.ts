import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Topic from "@/models/Topic";

const updateTopicSchema = z.object({
  text: z.string().trim().min(1, "Topic text is required").optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    const body = await request.json();
    const parsed = updateTopicSchema.safeParse(body);

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

    const topic = await Topic.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: parsed.data },
      { new: true },
    );

    if (!topic) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Topic not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: topic._id.toString(),
        text: topic.text,
        isActive: topic.isActive,
        createdAt: topic.createdAt.toISOString(),
        updatedAt: topic.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to update topic";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "UPDATE_TOPIC_FAILED" },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    await connectDB();

    const topic = await Topic.findOneAndDelete({ _id: id, userId: user.id });

    if (!topic) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Topic not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Topic deleted successfully",
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to delete topic";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "DELETE_TOPIC_FAILED" },
      },
      { status: 500 },
    );
  }
}
