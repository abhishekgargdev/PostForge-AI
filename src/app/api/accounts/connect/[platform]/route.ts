import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
} from "@/lib/oauth/pkce";
import { buildLinkedInAuthorizationUrl } from "@/lib/oauth/linkedin";
import {
  setOAuthCookies,
} from "@/lib/oauth/cookies";
import {
  isOAuthPlatform,
  isSocialPlatform,
} from "@/lib/oauth/platforms";

type RouteContext = {
  params: Promise<{ platform: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    const { platform } = await context.params;

    if (!isSocialPlatform(platform)) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Unsupported platform", code: "INVALID_PLATFORM" },
        },
        { status: 400 },
      );
    }

    if (!isOAuthPlatform(platform)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `${platform} OAuth is not implemented yet`,
            code: "NOT_IMPLEMENTED",
          },
        },
        { status: 501 },
      );
    }

    const state = generateOAuthState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    await setOAuthCookies(platform, {
      state,
      codeVerifier,
      userId: user.id,
    });

    const authorizationUrl =
      platform === "linkedin"
        ? buildLinkedInAuthorizationUrl({ state, codeChallenge })
        : null;

    if (!authorizationUrl) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Platform connect unavailable", code: "NOT_IMPLEMENTED" },
        },
        { status: 501 },
      );
    }

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    if (isAuthError(error)) {
      return error.response;
    }

    const message =
      error instanceof Error ? error.message : "Unable to start OAuth flow";

    return NextResponse.redirect(
      new URL(
        `/settings/accounts?error=${encodeURIComponent(message)}`,
        request.url,
      ),
    );
  }
}
