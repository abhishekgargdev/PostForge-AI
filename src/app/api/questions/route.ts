import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Question from "@/models/Question";

const createQuestionSchema = z.object({
  text: z.string().trim().min(1, "Question text is required"),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await connectDB();

    const questions = await Question.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: questions.map((q) => ({
        id: q._id.toString(),
        text: q.text,
        isActive: q.isActive,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to fetch questions";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "LIST_QUESTIONS_FAILED" },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = createQuestionSchema.safeParse(body);

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

    const question = await Question.create({
      userId: user.id,
      text: parsed.data.text,
      isActive: parsed.data.isActive,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: question._id.toString(),
          text: question.text,
          isActive: question.isActive,
          createdAt: question.createdAt.toISOString(),
          updatedAt: question.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to create question";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "CREATE_QUESTION_FAILED" },
      },
      { status: 500 },
    );
  }
}
