import { NextRequest, NextResponse } from "next/server";

import { getEnv } from "@/lib/env";

export function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const { CRON_SECRET } = getEnv();

  return authHeader === `Bearer ${CRON_SECRET}`;
}

export function unauthorizedCronResponse() {
  return NextResponse.json(
    {
      success: false,
      error: { message: "Unauthorized cron request", code: "UNAUTHORIZED" },
    },
    { status: 401 },
  );
}
