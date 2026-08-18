export const TEMPLATE_PLATFORMS = [
  "all",
  "linkedin",
  "twitter",
  "facebook",
] as const;
export type TemplatePlatform = (typeof TEMPLATE_PLATFORMS)[number];
