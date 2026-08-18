import type { ITemplate, TemplatePlatform } from "@/models/Template";

export type TemplateResponse = {
  id: string;
  userId?: string;
  name: string;
  platform: TemplatePlatform;
  promptTemplate: string;
  contentExample?: string;
  category?: string;
  isPublic: boolean;
  usageCount: number;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

type TemplateLike = Pick<
  ITemplate,
  | "name"
  | "platform"
  | "promptTemplate"
  | "contentExample"
  | "category"
  | "isPublic"
  | "usageCount"
> & {
  _id: { toString(): string };
  userId?: { toString(): string } | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toTemplateResponse(
  template: TemplateLike,
  viewerUserId: string,
): TemplateResponse {
  const ownerId = template.userId?.toString();

  return {
    id: template._id.toString(),
    userId: ownerId,
    name: template.name,
    platform: template.platform,
    promptTemplate: template.promptTemplate,
    contentExample: template.contentExample,
    category: template.category,
    isPublic: template.isPublic,
    usageCount: template.usageCount,
    isOwner: ownerId === viewerUserId,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export function formatTemplatePlatform(platform: TemplatePlatform) {
  switch (platform) {
    case "all":
      return "All platforms";
    case "linkedin":
      return "LinkedIn";
    case "twitter":
      return "Twitter/X";
    case "facebook":
      return "Facebook";
    default:
      return platform;
  }
}
