import { z } from "zod";

import { MEDIA_SOURCES } from "@/models/MediaLibrary";

export const listMediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  source: z.enum([...MEDIA_SOURCES, "all"]).default("all"),
});

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
