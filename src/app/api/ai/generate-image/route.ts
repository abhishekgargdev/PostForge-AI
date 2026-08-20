import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  generateImage,
  isGeminiKeysExhaustedError,
} from "@/lib/ai/gemini-client";
import { isAuthError, requireAuth } from "@/lib/auth";
import { buildThumbnailUrl, uploadImageBuffer } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { createAiGenerationFailureNotification } from "@/lib/notifications/create";
import { toMediaResponse } from "@/lib/media/serialize";
import MediaLibrary from "@/models/MediaLibrary";

import Post from "@/models/Post";

const generateImageSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required"),
  postId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let userId: string | undefined;

  try {
    const user = await requireAuth(request);
    userId = user.id;

    const body = await request.json();
    const parsed = generateImageSchema.safeParse(body);

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

    const { prompt, postId } = parsed.data;

    // Set post status to pending if we have a postId
    if (postId) {
      await connectDB();
      await Post.findByIdAndUpdate(postId, { imageStatus: "pending" });
    }

    const result = await generateImage({ prompt, userId });

    if (!result.success) {
      if (postId) {
        await connectDB();
        await Post.findByIdAndUpdate(postId, { imageStatus: "failed" });
      }
      return NextResponse.json(
        {
          success: false,
          error: {
            message: result.message,
            code: result.errorCode,
          },
        },
        { status: 500 },
      );
    }

    const upload = await uploadImageBuffer(
      result.imageBuffer,
      "postforge/ai-generated",
    );
    const thumbnailUrl = buildThumbnailUrl(upload.publicId);

    await connectDB();

    const fileName = `ai-${Date.now()}.png`;

    const media = await MediaLibrary.create({
      userId: user.id,
      fileName,
      fileType: "image",
      fileUrl: upload.secureUrl,
      thumbnailUrl,
      source: "ai-generated",
      aiPrompt: prompt,
      cloudinaryPublicId: upload.publicId,
    });

    if (postId) {
      await Post.findByIdAndUpdate(postId, {
        imageUrl: upload.secureUrl,
        mediaLibraryId: media._id,
        imageStatus: "success",
      });
    }

    return NextResponse.json({
      success: true,
      data: toMediaResponse(media.toObject()),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to generate image";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "GENERATE_IMAGE_FAILED" },
      },
      { status: 500 },
    );
  }
}
