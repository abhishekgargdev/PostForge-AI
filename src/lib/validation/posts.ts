import { z } from "zod";

import { POST_STATUSES } from "@/types/posts";
import { SOCIAL_PLATFORMS } from "@/types/platforms";

export const POST_TONES = [
  "professional",
  "casual",
  "humorous",
  "inspirational",
] as const;

export type PostTone = (typeof POST_TONES)[number];

const scheduledAtSchema = z.union([z.string().datetime(), z.date()]);

const emptyStringToNullOrUndefined = (val: unknown) => (val === "" ? null : val);

const createPostShape = {
  content: z.string().trim().min(1, "Content is required"),
  aiPrompt: z.string().trim().optional(),
  platforms: z
    .array(z.enum(SOCIAL_PLATFORMS))
    .min(1, "Select at least one platform"),
  platformContent: z
    .record(z.enum(SOCIAL_PLATFORMS), z.string().trim().min(1))
    .optional(),
  imageUrl: z.preprocess(emptyStringToNullOrUndefined, z.string().url().optional().nullable()),
  mediaLibraryId: z.preprocess(emptyStringToNullOrUndefined, z.string().trim().optional().nullable()),
  status: z.enum(POST_STATUSES).default("draft"),
  scheduledAt: scheduledAtSchema.optional(),
  topic: z.string().trim().optional(),
  category: z.string().trim().optional(),
  subtopic: z.string().trim().optional(),
  format: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
  imageStatus: z.enum(["pending", "success", "failed", "none"]).default("none"),
};

export const createPostSchema = z
  .object(createPostShape)
  .superRefine((value, context) => {
    if (value.status === "scheduled" && !value.scheduledAt) {
      context.addIssue({
        code: "custom",
        message: "scheduledAt is required when status is scheduled",
        path: ["scheduledAt"],
      });
    }
  });

export const updatePostSchema = z
  .object(createPostShape)
  .partial()
  .superRefine((value, context) => {
    if (value.status === "scheduled" && !value.scheduledAt) {
      context.addIssue({
        code: "custom",
        message: "scheduledAt is required when status is scheduled",
        path: ["scheduledAt"],
      });
    }
  });

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
