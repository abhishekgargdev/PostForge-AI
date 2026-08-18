import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { getAuthCookieOptions } from "@/lib/jwt";

export async function POST() {
  const { COOKIE_NAME } = getEnv();
  const response = NextResponse.json({
    success: true,
    data: { loggedOut: true },
  });

  response.cookies.set(COOKIE_NAME, "", {
    ...getAuthCookieOptions(0),
    maxAge: 0,
  });

  return response;
}
