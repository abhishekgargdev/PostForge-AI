import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateImage } from "@/lib/ai/gemini-client";
import { isAuthError, requireAuth } from "@/lib/auth";
import { uploadImageBuffer } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import MediaLibrary, { type IMediaLibrary } from "@/models/MediaLibrary";

const generateImageSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required"),
});

type MediaRecord = {
  id: string;
  userId: string;
  fileName: string;
  fileType: IMediaLibrary["fileType"];
  fileUrl: string;
  thumbnailUrl?: string;
  source: IMediaLibrary["source"];
  aiPrompt?: string;
  cloudinaryPublicId: string;
  createdAt: Date;
};

function toMediaRecord(
  media: IMediaLibrary & { _id: { toString(): string } },
): MediaRecord {
  return {
    id: media._id.toString(),
    userId: media.userId.toString(),
    fileName: media.fileName,
    fileType: media.fileType,
    fileUrl: media.fileUrl,
    thumbnailUrl: media.thumbnailUrl,
    source: media.source,
    aiPrompt: media.aiPrompt,
    cloudinaryPublicId: media.cloudinaryPublicId,
    createdAt: media.createdAt,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

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

    const imageBuffer = await generateImage({ prompt: parsed.data.prompt });
    const upload = await uploadImageBuffer(
      imageBuffer,
      "postforge/ai-generated",
    );

    await connectDB();

    const fileName = `ai-${Date.now()}.png`;

    const media = await MediaLibrary.create({
      userId: user.id,
      fileName,
      fileType: "image",
      fileUrl: upload.secureUrl,
      source: "ai-generated",
      aiPrompt: parsed.data.prompt,
      cloudinaryPublicId: upload.publicId,
    });

    return NextResponse.json({
      success: true,
      data: toMediaRecord(media.toObject()),
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
