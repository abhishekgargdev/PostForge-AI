export const SOCIAL_PLATFORMS = ["linkedin", "twitter", "facebook"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
