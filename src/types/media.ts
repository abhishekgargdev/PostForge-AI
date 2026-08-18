export const MEDIA_FILE_TYPES = ["image", "video"] as const;
export type MediaFileType = (typeof MEDIA_FILE_TYPES)[number];

export const MEDIA_SOURCES = ["upload", "ai-generated"] as const;
export type MediaSource = (typeof MEDIA_SOURCES)[number];
