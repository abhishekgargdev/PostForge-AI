import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  PaginatedMediaResponse,
  toMediaResponse,
} from "@/lib/media/serialize";
import { listMediaQuerySchema } from "@/lib/validation/media";
import MediaLibrary from "@/models/MediaLibrary";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const query = listMediaQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    if (!query.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: query.error.issues[0]?.message ?? "Invalid query",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 },
      );
    }

    const { page, limit, source } = query.data;
    const filter: Record<string, unknown> = { userId: user.id };

    if (source !== "all") {
      filter.source = source;
    }

    await connectDB();

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      MediaLibrary.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<Array<Parameters<typeof toMediaResponse>[0]>>(),
      MediaLibrary.countDocuments(filter),
    ]);

    const data: PaginatedMediaResponse = {
      items: items.map(toMediaResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to fetch media";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "LIST_MEDIA_FAILED" },
      },
      { status: 500 },
    );
  }
}
