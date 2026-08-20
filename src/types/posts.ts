export const POST_STATUSES = [
  "draft",
  "generated",
  "selected",
  "queued",
  "confirmed",
  "scheduled",
  "due",
  "publishing",
  "posted",
  "published",
  "failed",
  "retry",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
