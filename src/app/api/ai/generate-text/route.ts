import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateText } from "@/lib/ai/gemini-client";
import { isAuthError, requireAuth } from "@/lib/auth";
import { SOCIAL_PLATFORMS } from "@/models/SocialAccount";

const generateTextSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required"),
  platform: z.enum(SOCIAL_PLATFORMS),
  tone: z.string().trim().min(1, "Tone is required"),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);

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
