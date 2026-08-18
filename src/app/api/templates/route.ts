import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { buildVisibleTemplatesFilter } from "@/lib/templates/access";
import { toTemplateResponse } from "@/lib/templates/serialize";
import {
  createTemplateSchema,
  listTemplatesQuerySchema,
} from "@/lib/validation/templates";
import Template from "@/models/Template";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const query = listTemplatesQuerySchema.safeParse(
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

    await connectDB();

    const filter: Record<string, unknown> = buildVisibleTemplatesFilter(user.id);

    if (query.data.platform) {
      filter.platform = query.data.platform;
    }

    if (query.data.category) {
      filter.category = query.data.category;
    }

    const templates = await Template.find(filter)
      .sort({ isPublic: -1, usageCount: -1, updatedAt: -1 })
      .lean<Array<Parameters<typeof toTemplateResponse>[0]>>();

    return NextResponse.json({
      success: true,
      data: templates.map((template) => toTemplateResponse(template, user.id)),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to fetch templates";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "LIST_TEMPLATES_FAILED" },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = createTemplateSchema.safeParse(body);

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

    const template = await Template.create({
      userId: new mongoose.Types.ObjectId(user.id),
      name: parsed.data.name,
      platform: parsed.data.platform,
      promptTemplate: parsed.data.promptTemplate,
      contentExample: parsed.data.contentExample,
      category: parsed.data.category,
      isPublic: parsed.data.isPublic ?? false,
      usageCount: 0,
    });

    return NextResponse.json(
      {
        success: true,
        data: toTemplateResponse(template.toObject(), user.id),
      },
      { status: 201 },
    );
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to create template";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "CREATE_TEMPLATE_FAILED" },
      },
      { status: 500 },
    );
  }
}
