import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth";
import { deleteImage } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import MediaLibrary from "@/models/MediaLibrary";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    await connectDB();

    const media = await MediaLibrary.findOne({ _id: id, userId: user.id });

    if (!media) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Media not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    await deleteImage(media.cloudinaryPublicId);
    await media.deleteOne();

    return NextResponse.json({
      success: true,
      data: { deleted: true, id },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to delete media";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "DELETE_MEDIA_FAILED" },
      },
      { status: 500 },
    );
  }
}
