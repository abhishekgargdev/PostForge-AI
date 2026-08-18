import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/models/SocialAccount";

export const OAUTH_IMPLEMENTED_PLATFORMS = ["linkedin"] as const;
export type OAuthPlatform = (typeof OAUTH_IMPLEMENTED_PLATFORMS)[number];

export function isOAuthPlatform(platform: string): platform is OAuthPlatform {
  return OAUTH_IMPLEMENTED_PLATFORMS.includes(platform as OAuthPlatform);
}

export function isSocialPlatform(platform: string): platform is SocialPlatform {
  return SOCIAL_PLATFORMS.includes(platform as SocialPlatform);
}

export function getLinkedInRedirectUri(appUrl: string) {
  return `${appUrl.replace(/\/$/, "")}/api/accounts/linkedin/callback`;
}

export const LINKEDIN_SCOPES = ["openid", "profile", "w_member_social"] as const;

export const PLATFORM_CHAR_LIMITS: Record<SocialPlatform, number> = {
  linkedin: 3000,
  twitter: 280,
  facebook: 63000,
};

export function validatePlatformCharacterLimit(
  platform: SocialPlatform,
  content: string,
) {
  const limit = PLATFORM_CHAR_LIMITS[platform];
  if (content.length > limit) {
    throw new Error(
      `${platform} posts must be ${limit} characters or fewer (currently ${content.length}).`,
    );
  }
}
