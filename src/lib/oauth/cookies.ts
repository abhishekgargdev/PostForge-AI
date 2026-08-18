import { cookies } from "next/headers";

import type { OAuthPlatform } from "@/lib/oauth/platforms";

function cookieName(platform: OAuthPlatform, suffix: string) {
  return `oauth_${platform}_${suffix}`;
}

export async function setOAuthCookies(
  platform: OAuthPlatform,
  values: {
    state: string;
    codeVerifier: string;
    userId: string;
  },
) {
  const cookieStore = await cookies();
  const maxAge = 60 * 10;
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };

  cookieStore.set(cookieName(platform, "state"), values.state, options);
  cookieStore.set(
    cookieName(platform, "verifier"),
    values.codeVerifier,
    options,
  );
  cookieStore.set(cookieName(platform, "user"), values.userId, options);
}

export async function readOAuthCookies(platform: OAuthPlatform) {
  const cookieStore = await cookies();

  return {
    state: cookieStore.get(cookieName(platform, "state"))?.value,
    codeVerifier: cookieStore.get(cookieName(platform, "verifier"))?.value,
    userId: cookieStore.get(cookieName(platform, "user"))?.value,
  };
}

export async function clearOAuthCookies(platform: OAuthPlatform) {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName(platform, "state"));
  cookieStore.delete(cookieName(platform, "verifier"));
  cookieStore.delete(cookieName(platform, "user"));
}
