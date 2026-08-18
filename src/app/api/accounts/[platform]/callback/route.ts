import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import {
  buildLinkedInAccountFields,
  exchangeLinkedInCode,
  fetchLinkedInUserInfo,
} from "@/lib/oauth/linkedin";
import {
  clearOAuthCookies,
  readOAuthCookies,
} from "@/lib/oauth/cookies";
import { isOAuthPlatform, isSocialPlatform } from "@/lib/oauth/platforms";
import { connectDB } from "@/lib/db";
import SocialAccount from "@/models/SocialAccount";

type RouteContext = {
  params: Promise<{ platform: string }>;
};

function redirectWithError(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(
      `/settings/accounts?error=${encodeURIComponent(message)}`,
      request.url,
    ),
  );
}

function redirectWithSuccess(request: NextRequest, platform: string) {
  return NextResponse.redirect(
    new URL(
      `/settings/accounts?connected=${encodeURIComponent(platform)}`,
      request.url,
    ),
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { platform } = await context.params;

  if (!isSocialPlatform(platform) || !isOAuthPlatform(platform)) {
    return redirectWithError(request, "Unsupported platform.");
  }

  const { searchParams } = request.nextUrl;
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    await clearOAuthCookies(platform);
    return redirectWithError(
      request,
      errorDescription ?? error ?? "OAuth authorization was denied.",
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthCookies = await readOAuthCookies(platform);

  if (!code || !state) {
    return redirectWithError(request, "Missing OAuth callback parameters.");
  }

  if (
    !oauthCookies.state ||
    !oauthCookies.codeVerifier ||
    !oauthCookies.userId ||
    oauthCookies.state !== state
  ) {
    await clearOAuthCookies(platform);
    return redirectWithError(request, "Invalid OAuth state. Please try again.");
  }

  try {
    if (platform === "linkedin") {
      const token = await exchangeLinkedInCode({
        code,
        codeVerifier: oauthCookies.codeVerifier,
      });
      const profile = await fetchLinkedInUserInfo(token.access_token);
      const accountFields = buildLinkedInAccountFields({ token, profile });

      await connectDB();

      await SocialAccount.findOneAndUpdate(
        {
          userId: new mongoose.Types.ObjectId(oauthCookies.userId),
          platform: "linkedin",
          platformUserId: accountFields.platformUserId,
        },
        {
          $set: accountFields,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    }

    await clearOAuthCookies(platform);
    return redirectWithSuccess(request, platform);
  } catch (callbackError) {
    await clearOAuthCookies(platform);
    const message =
      callbackError instanceof Error
        ? callbackError.message
        : "OAuth callback failed.";
    return redirectWithError(request, message);
  }
}
