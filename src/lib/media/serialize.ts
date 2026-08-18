import type { IMediaLibrary } from "@/models/MediaLibrary";

export type MediaResponse = {
  id: string;
  userId: string;
  fileName: string;
  fileType: IMediaLibrary["fileType"];
  fileUrl: string;
  thumbnailUrl?: string;
  source: IMediaLibrary["source"];
  aiPrompt?: string;
  cloudinaryPublicId: string;
  createdAt: string;
};

export type PaginatedMediaResponse = {
  items: MediaResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type MediaLike = Pick<
  IMediaLibrary,
  | "fileName"
  | "fileType"
  | "fileUrl"
  | "thumbnailUrl"
  | "source"
  | "aiPrompt"
  | "cloudinaryPublicId"
  | "createdAt"
> & {
  _id: { toString(): string };
  userId: { toString(): string };
};

export function toMediaResponse(media: MediaLike): MediaResponse {
  return {
    id: media._id.toString(),
    userId: media.userId.toString(),
    fileName: media.fileName,
    fileType: media.fileType,
    fileUrl: media.fileUrl,
    thumbnailUrl: media.thumbnailUrl,
    source: media.source,
    aiPrompt: media.aiPrompt,
    cloudinaryPublicId: media.cloudinaryPublicId,
    createdAt: media.createdAt.toISOString(),
  };
}

export function getMediaPreviewUrl(media: Pick<MediaResponse, "thumbnailUrl" | "fileUrl">) {
  return media.thumbnailUrl ?? media.fileUrl;
}

export function formatMediaSourceLabel(
  source: IMediaLibrary["source"],
): string {
  return source === "ai-generated" ? "AI" : "Upload";
}
