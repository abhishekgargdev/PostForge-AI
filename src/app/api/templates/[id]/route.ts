import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  canModifyTemplate,
  canViewTemplate,
} from "@/lib/templates/access";
import { toTemplateResponse } from "@/lib/templates/serialize";
import { updateTemplateSchema } from "@/lib/validation/templates";
import Template from "@/models/Template";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    await connectDB();

    const template = await Template.findById(id);

    if (!template || !canViewTemplate(template, user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Template not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: toTemplateResponse(template.toObject(), user.id),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to fetch template";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "GET_TEMPLATE_FAILED" },
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateTemplateSchema.safeParse(body);

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

    const template = await Template.findById(id);

    if (!template || !canModifyTemplate(template, user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Template not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    if (parsed.data.name !== undefined) {
      template.name = parsed.data.name;
    }

    if (parsed.data.platform !== undefined) {
      template.platform = parsed.data.platform;
    }

    if (parsed.data.promptTemplate !== undefined) {
      template.promptTemplate = parsed.data.promptTemplate;
    }

    if (parsed.data.contentExample !== undefined) {
      template.contentExample = parsed.data.contentExample;
    }

    if (parsed.data.category !== undefined) {
      template.category = parsed.data.category;
    }

    if (parsed.data.isPublic !== undefined) {
      template.isPublic = parsed.data.isPublic;
    }

    await template.save();

    return NextResponse.json({
      success: true,
      data: toTemplateResponse(template.toObject(), user.id),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to update template";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "UPDATE_TEMPLATE_FAILED" },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    await connectDB();

    const template = await Template.findById(id);

    if (!template || !canModifyTemplate(template, user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Template not found", code: "NOT_FOUND" },
        },
        { status: 404 },
      );
    }

    await template.deleteOne();

    return NextResponse.json({
      success: true,
      data: { deleted: true, id },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to delete template";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "DELETE_TEMPLATE_FAILED" },
      },
      { status: 500 },
    );
  }
}
