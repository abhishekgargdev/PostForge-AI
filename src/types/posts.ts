export const POST_STATUSES = [
  "draft",
  "confirmed",
  "scheduled",
  "publishing",
  "published",
  "failed",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
