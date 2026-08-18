import { z } from "zod";

import { TEMPLATE_PLATFORMS } from "@/models/Template";

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  platform: z.enum(TEMPLATE_PLATFORMS),
  promptTemplate: z.string().trim().min(1, "Prompt template is required"),
  contentExample: z.string().trim().optional(),
  category: z.string().trim().max(60).optional(),
  isPublic: z.boolean().optional().default(false),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const listTemplatesQuerySchema = z.object({
  platform: z.enum(TEMPLATE_PLATFORMS).optional(),
  category: z.string().trim().optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
