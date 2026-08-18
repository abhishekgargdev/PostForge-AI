import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  generateText,
  isGeminiKeysExhaustedError,
} from "@/lib/ai/gemini-client";
import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { createAiGenerationFailureNotification } from "@/lib/notifications/create";
import { SOCIAL_PLATFORMS } from "@/models/SocialAccount";

const generateTextSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required"),
  platform: z.enum(SOCIAL_PLATFORMS),
  tone: z.string().trim().min(1, "Tone is required"),
});

export async function POST(request: NextRequest) {
  let userId: string | undefined;

  try {
    const user = await requireAuth(request);
    userId = user.id;

    const body = await request.json();
    const parsed = generateTextSchema.safeParse(body);

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

    const content = await generateText(parsed.data);

    return NextResponse.json({
      success: true,
      data: { content },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    if (userId && isGeminiKeysExhaustedError(error)) {
      await connectDB();
      await createAiGenerationFailureNotification({
        userId,
        generationType: "text",
        errorMessage:
          error instanceof Error ? error.message : "Unknown Gemini API error",
      });
    }

    const message =
      error instanceof Error ? error.message : "Unable to generate text";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "GENERATE_TEXT_FAILED" },
      },
      { status: 500 },
    );
  }
}
