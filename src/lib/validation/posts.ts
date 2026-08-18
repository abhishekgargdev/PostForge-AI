import { z } from "zod";

import { POST_STATUSES } from "@/models/Post";
import { SOCIAL_PLATFORMS } from "@/models/SocialAccount";

export const POST_TONES = [
  "professional",
  "casual",
  "humorous",
  "inspirational",
] as const;

export type PostTone = (typeof POST_TONES)[number];

const scheduledAtSchema = z.union([z.string().datetime(), z.date()]);

export const createPostSchema = z
  .object({
    content: z.string().trim().min(1, "Content is required"),
    aiPrompt: z.string().trim().optional(),
    platforms: z
      .array(z.enum(SOCIAL_PLATFORMS))
      .min(1, "Select at least one platform"),
    platformContent: z
      .record(z.enum(SOCIAL_PLATFORMS), z.string().trim().min(1))
      .optional(),
    imageUrl: z.string().url().optional(),
    mediaLibraryId: z.string().trim().optional(),
    status: z.enum(POST_STATUSES).default("draft"),
    scheduledAt: scheduledAtSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.status === "scheduled" && !value.scheduledAt) {
      context.addIssue({
        code: "custom",
        message: "scheduledAt is required when status is scheduled",
        path: ["scheduledAt"],
      });
    }
  });

export const updatePostSchema = createPostSchema.partial().superRefine(
  (value, context) => {
    if (value.status === "scheduled" && !value.scheduledAt) {
      context.addIssue({
        code: "custom",
        message: "scheduledAt is required when status is scheduled",
        path: ["scheduledAt"],
      });
    }
  },
);

export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum([...POST_STATUSES, "all"]).default("all"),
});

export function parseScheduledAt(value: string | Date | undefined) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
}
