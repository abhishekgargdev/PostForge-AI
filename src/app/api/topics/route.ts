import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Topic from "@/models/Topic";

const createTopicSchema = z.object({
  text: z.string().trim().min(1, "Topic text is required"),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await connectDB();

    const topics = await Topic.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: topics.map((t) => ({
        id: t._id.toString(),
        text: t.text,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to fetch topics";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "LIST_TOPICS_FAILED" },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = createTopicSchema.safeParse(body);

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

    const topic = await Topic.create({
      userId: user.id,
      text: parsed.data.text,
      isActive: parsed.data.isActive,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: topic._id.toString(),
          text: topic.text,
          isActive: topic.isActive,
          createdAt: topic.createdAt.toISOString(),
          updatedAt: topic.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to create topic";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "CREATE_TOPIC_FAILED" },
      },
      { status: 500 },
    );
  }
}
