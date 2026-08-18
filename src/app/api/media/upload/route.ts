import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth";
import { buildThumbnailUrl, uploadImageBuffer } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { toMediaResponse } from "@/lib/media/serialize";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/validation/media";
import MediaLibrary from "@/models/MediaLibrary";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Image file is required", code: "VALIDATION_ERROR" },
        },
        { status: 400 },
      );
    }

    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Only JPEG, PNG, WebP, and GIF images are supported",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Image must be 10MB or smaller",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await uploadImageBuffer(buffer, "postforge/uploads");
    const thumbnailUrl = buildThumbnailUrl(upload.publicId);

    await connectDB();

    const media = await MediaLibrary.create({
      userId: user.id,
      fileName: file.name,
      fileType: "image",
      fileUrl: upload.secureUrl,
      thumbnailUrl,
      source: "upload",
      cloudinaryPublicId: upload.publicId,
    });

    return NextResponse.json(
      {
        success: true,
        data: toMediaResponse(media.toObject()),
      },
      { status: 201 },
    );
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to upload media";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "UPLOAD_MEDIA_FAILED" },
      },
      { status: 500 },
    );
  }
}
