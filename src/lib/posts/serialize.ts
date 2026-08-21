import type { IPost, PostStatus } from "@/models/Post";
import type { SocialPlatform } from "@/models/SocialAccount";

export type PostResponse = {
  id: string;
  userId: string;
  content: string;
  aiPrompt?: string;
  platforms: SocialPlatform[];
  status: PostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  imageUrl?: string;
  mediaLibraryId?: string;
  postType: "post" | "article";
  articleUrl?: string;
  articleTitle?: string;
  articleDescription?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedPostsResponse = {
  posts: PostResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type PostLike = Pick<
  IPost,
  | "content"
  | "aiPrompt"
  | "platforms"
  | "status"
  | "scheduledAt"
  | "publishedAt"
  | "imageUrl"
  | "mediaLibraryId"
  | "postType"
  | "articleUrl"
  | "articleTitle"
  | "articleDescription"
  | "createdAt"
  | "updatedAt"
> & {
  _id: { toString(): string };
  userId: { toString(): string };
};

export function toPostResponse(post: PostLike): PostResponse {
  return {
    id: post._id.toString(),
    userId: post.userId.toString(),
    content: post.content,
    aiPrompt: post.aiPrompt,
    platforms: post.platforms ?? [],
    status: post.status,
    scheduledAt: post.scheduledAt?.toISOString(),
    publishedAt: post.publishedAt?.toISOString(),
    imageUrl: post.imageUrl,
    mediaLibraryId: post.mediaLibraryId?.toString(),
    postType: post.postType || "post",
    articleUrl: post.articleUrl,
    articleTitle: post.articleTitle,
    articleDescription: post.articleDescription,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export function getStatusBadgeVariant(
  status: PostStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "published":
      return "default";
    case "draft":
      return "secondary";
    case "scheduled":
      return "outline";
    case "failed":
      return "destructive";
    case "publishing":
    default:
      return "default";
  }
}

export function formatPlatformLabel(platform: SocialPlatform): string {
  switch (platform) {
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

export function formatPostScheduleLabel(post: Pick<PostResponse, "status" | "scheduledAt">) {
  if (post.status === "scheduled" && post.scheduledAt) {
    return `Scheduled for ${new Date(post.scheduledAt).toLocaleString()}`;
  }

  return null;
}
