import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateText } from "@/lib/ai/gemini-client";
import { isAuthError, requireAuth } from "@/lib/auth";
import { POST_GOALS } from "@/lib/validation/ai";
import { POST_TONES } from "@/lib/validation/posts";
import { SOCIAL_PLATFORMS } from "@/types/platforms";

const generateBulkSchema = z.object({
  topics: z.array(z.string().trim().min(1)).min(1, "At least one topic is required"),
  numPosts: z.number().int().min(1).max(20).default(5),
  platforms: z.array(z.enum(SOCIAL_PLATFORMS)).min(1, "At least one platform is required"),
  tone: z.enum(POST_TONES).default("professional"),
  goal: z.enum(POST_GOALS).default("educate"),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const parsed = generateBulkSchema.safeParse(body);

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

    const { topics, numPosts, platforms, tone, goal } = parsed.data;
    const promises = Array.from({ length: numPosts }).map(async (_, index) => {
      // Rotate through the selected topics
      const topic = topics[index % topics.length];
      
      // Generate copies for each platform
      const platformEntries = await Promise.all(
        platforms.map(async (platform) => {
          const content = await generateText({
            platform,
            tone,
            topic: `Topic: ${topic}. Write a professional, highly engaging post discussing this topic.`,
            goal,
          });
          return [platform, content] as const;
        })
      );

      return {
        topic,
        platformContent: Object.fromEntries(platformEntries),
      };
    });

    const results = await Promise.all(promises);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to generate posts";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "GENERATE_BULK_FAILED" },
      },
      { status: 500 },
    );
  }
}
