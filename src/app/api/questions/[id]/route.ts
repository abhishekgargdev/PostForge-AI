import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Question from "@/models/Question";

const updateQuestionSchema = z.object({
  text: z.string().trim().min(1, "Question text is required").optional(),
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
    const parsed = updateQuestionSchema.safeParse(body);

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

    const question = await Question.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: parsed.data },
      { new: true },
    );

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Question not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: question._id.toString(),
        text: question.text,
        isActive: question.isActive,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to update question";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "UPDATE_QUESTION_FAILED" },
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

    const question = await Question.findOneAndDelete({ _id: id, userId: user.id });

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Question not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to delete question";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "DELETE_QUESTION_FAILED" },
      },
      { status: 500 },
    );
  }
}
