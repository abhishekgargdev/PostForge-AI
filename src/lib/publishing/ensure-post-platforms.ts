import type { HydratedDocument } from "mongoose";

import type { IPost } from "@/models/Post";
import PostPlatform from "@/models/PostPlatform";
import type { SocialPlatform } from "@/models/SocialAccount";

import { resolveSocialAccountForPlatform } from "@/lib/publishing/resolve-social-account";

export async function ensurePostPlatformsForPost(
  post: HydratedDocument<IPost>,
  platformContent?: Partial<Record<SocialPlatform, string>>,
) {
  const postId = post._id;
  const userId = post.userId.toString();

  for (const platform of post.platforms) {
    const existing = await PostPlatform.findOne({ postId, platform });
    const resolvedContent =
      platformContent?.[platform]?.trim() ||
      existing?.adaptedContent ||
      post.content;

    if (existing) {
      if (existing.adaptedContent !== resolvedContent) {
        existing.adaptedContent = resolvedContent;
        await existing.save();
      }
      continue;
    }

    const socialAccount = await resolveSocialAccountForPlatform(
      userId,
      platform,
    );

    await PostPlatform.create({
      postId,
      socialAccountId: socialAccount._id,
      platform,
      adaptedContent: resolvedContent,
      status: "pending",
      retryCount: 0,
    });
  }
}
