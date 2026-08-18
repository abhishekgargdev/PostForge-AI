import { z } from "zod";

import { POST_GOALS } from "@/lib/validation/ai";
import { POST_TONES } from "@/lib/validation/posts";

export const dayOfWeekParamSchema = z.coerce
  .number()
  .int()
  .min(0, "dayOfWeek must be between 0 and 6")
  .max(6, "dayOfWeek must be between 0 and 6");

export const upsertDayPreferenceSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required"),
  goal: z.enum(POST_GOALS),
  tone: z.enum(POST_TONES).default("professional"),
  isActive: z.boolean().default(true),
});
