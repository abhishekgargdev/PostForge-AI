import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateCampaignBatch } from "@/lib/ai/content-planner";
import { isAuthError, requireAuth } from "@/lib/auth";
import { SOCIAL_PLATFORMS } from "@/types/platforms";
import { STYLES, FORMATS, AUDIENCES } from "@/lib/validation/ai";

const generateBatchSchema = z.object({
  topics: z.array(z.string().trim().min(1)).min(1, "At least one topic is required"),
  count: z.number().int().min(1).max(20).default(10),
  style: z.enum(STYLES).default("Professional"),
  format: z.enum(FORMATS).default("Auto Select"),
  targetAudience: z.enum(AUDIENCES).default("Auto"),
  platforms: z.array(z.enum(SOCIAL_PLATFORMS)).min(1, "At least one platform is required"),
  generateImages: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = generateBatchSchema.safeParse(body);

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

    const { topics, count, style, format, targetAudience, platforms, generateImages } = parsed.data;

    const results = await generateCampaignBatch({
      topics,
      count,
      style,
      format,
      targetAudience,
      platforms,
      generateImages,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        posts: results.succeeded,
        failed: results.failed,
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Batch generation failed";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "GENERATE_BATCH_FAILED" },
      },
      { status: 500 },
    );
  }
}
