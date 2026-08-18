import { z } from "zod";

import { POST_TONES } from "@/lib/validation/posts";
import { SOCIAL_PLATFORMS } from "@/types/platforms";

export const POST_GOALS = [
  "educate",
  "promote",
  "announce",
  "engage",
  "celebrate",
] as const;

export type PostGoal = (typeof POST_GOALS)[number];

export const POST_GOAL_LABELS: Record<PostGoal, string> = {
  educate: "Educate",
  promote: "Promote",
  announce: "Announce",
  engage: "Engage / Ask a question",
  celebrate: "Celebrate / Share a win",
};

export const generateTextSchema = z
  .object({
    platform: z.enum(SOCIAL_PLATFORMS),
    tone: z.enum(POST_TONES),
    topic: z.string().trim().optional(),
    goal: z.enum(POST_GOALS).optional(),
    keyPoints: z.string().trim().optional(),
    customPrompt: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (value.customPrompt) {
      return;
    }

    if (!value.topic?.length) {
      context.addIssue({
        code: "custom",
        message: "Topic is required",
        path: ["topic"],
      });
    }

    if (!value.goal) {
      context.addIssue({
        code: "custom",
        message: "Goal is required",
        path: ["goal"],
      });
    }
  });

export type GenerateTextInput = z.infer<typeof generateTextSchema>;
