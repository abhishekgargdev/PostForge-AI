import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";

export async function GET() {
  try {
    await connectDB();

    return NextResponse.json({
      success: true,
      data: { db: "connected" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed";

    return NextResponse.json(
      {
        success: false,
        error: { message, code: "DB_CONNECTION_FAILED" },
      },
      { status: 500 },
    );
  }
}
