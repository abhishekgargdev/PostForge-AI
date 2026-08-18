import type { HydratedDocument } from "mongoose";

import type { IPost } from "@/models/Post";
import PostPlatform from "@/models/PostPlatform";

import { resolveSocialAccountForPlatform } from "@/lib/publishing/resolve-social-account";

export async function ensurePostPlatformsForPost(
  post: HydratedDocument<IPost>,
) {
  const postId = post._id;
  const userId = post.userId.toString();

  for (const platform of post.platforms) {
    const existing = await PostPlatform.findOne({ postId, platform });

    if (existing) {
      if (existing.adaptedContent !== post.content) {
        existing.adaptedContent = post.content;
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
      adaptedContent: post.content,
      status: "pending",
      retryCount: 0,
    });
  }
}
