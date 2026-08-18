import { NextRequest, NextResponse } from "next/server";

import { verifyTokenEdge } from "@/lib/jwt";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/posts",
  "/media",
  "/analytics",
  "/settings",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const cookieName = process.env.COOKIE_NAME?.trim();
  const jwtSecret = process.env.JWT_SECRET?.trim();

  if (!cookieName || !jwtSecret) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const token = request.cookies.get(cookieName)?.value;
  const payload = token
    ? await verifyTokenEdge(token, jwtSecret)
    : null;
  const isAuthenticated = Boolean(payload);

  if (pathname.startsWith("/login") && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtectedPath(pathname) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/posts/:path*",
    "/media/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
};
