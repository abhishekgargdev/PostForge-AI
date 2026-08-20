import { connectDB } from "@/lib/db";
import { decryptToken } from "@/lib/crypto/tokens";
import { publishLinkedInPost } from "@/lib/oauth/linkedin";
import { ensurePostPlatformsForPost } from "@/lib/publishing/ensure-post-platforms";
import {
  createPublishFailureNotification,
  createPublishSuccessNotification,
} from "@/lib/notifications/create";
import {
  syncPostStatusFromPlatforms,
} from "@/lib/publishing/sync-post-status";
import Post from "@/models/Post";
import PostPlatform, { type IPostPlatform } from "@/models/PostPlatform";
import SocialAccount, { type ISocialAccount } from "@/models/SocialAccount";
import type { SocialPlatform } from "@/models/SocialAccount";
import Topic from "@/models/Topic";
import User from "@/models/User";
import MediaLibrary from "@/models/MediaLibrary";
import { generateText, generateImage } from "@/lib/ai/gemini-client";
import { uploadImageBuffer, buildThumbnailUrl } from "@/lib/cloudinary";

const MAX_PUBLISH_RETRIES = 3;

export type PublishPlatformResult = {
  success: boolean;
  postPlatformId: string;
  platform: SocialPlatform;
  errorMessage?: string;
  platformUrl?: string;
};

type PublishContext = {
  postPlatform: IPostPlatform;
  socialAccount: ISocialAccount;
  content: string;
  imageUrl?: string;
};

type PlatformPublishSuccess = {
  platformPostId: string;
  platformUrl: string;
};

async function publishToLinkedIn(
  context: PublishContext,
): Promise<PlatformPublishSuccess> {
  if (!context.socialAccount.isConnected) {
    throw new Error(
      "LinkedIn is not connected. Connect your account in Settings before publishing.",
    );
  }

  if (context.socialAccount.platformUserId.startsWith("simulated-")) {
    throw new Error("LinkedIn simulated account cannot publish to the real API.");
  }

  const accessToken = decryptToken(context.socialAccount.accessToken);

  return publishLinkedInPost({
    accessToken,
    platformUserId: context.socialAccount.platformUserId,
    content: context.content,
    imageUrl: context.imageUrl,
  });
}

async function publishToTwitter(
  _context: PublishContext,
): Promise<PlatformPublishSuccess> {
  const id = `sim-twitter-${Date.now()}`;
  return {
    platformPostId: id,
    platformUrl: `https://twitter.com/i/web/status/${id}`,
  };
}

async function publishToFacebook(
  _context: PublishContext,
): Promise<PlatformPublishSuccess> {
  const id = `sim-facebook-${Date.now()}`;
  return {
    platformPostId: id,
    platformUrl: `https://www.facebook.com/${id}`,
  };
}

const platformPublishers: Record<
  SocialPlatform,
  (context: PublishContext) => Promise<PlatformPublishSuccess>
> = {
  linkedin: publishToLinkedIn,
  twitter: publishToTwitter,
  facebook: publishToFacebook,
};

export async function publishPostToPlatform(
  postPlatformId: string,
): Promise<PublishPlatformResult> {
  await connectDB();

  const postPlatform = await PostPlatform.findById(postPlatformId);
  if (!postPlatform) {
    throw new Error("PostPlatform not found.");
  }

  const [post, socialAccount] = await Promise.all([
    Post.findById(postPlatform.postId),
    SocialAccount.findById(postPlatform.socialAccountId),
  ]);

  if (!post) {
    throw new Error("Post not found.");
  }

  if (!socialAccount) {
    throw new Error("Social account not found.");
  }

  try {
    const publisher = platformPublishers[postPlatform.platform];
    const result = await publisher({
      postPlatform,
      socialAccount,
      content: postPlatform.adaptedContent,
      imageUrl: post.imageUrl,
    });

    postPlatform.status = "published";
    postPlatform.publishedAt = new Date();
    postPlatform.platformPostId = result.platformPostId;
    postPlatform.platformUrl = result.platformUrl;
    postPlatform.errorMessage = undefined;
    await postPlatform.save();

    return {
      success: true,
      postPlatformId,
      platform: postPlatform.platform,
      platformUrl: result.platformUrl,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Publishing failed.";

    postPlatform.status = "failed";
    postPlatform.errorMessage = errorMessage;
    await postPlatform.save();

    return {
      success: false,
      postPlatformId,
      platform: postPlatform.platform,
      errorMessage,
    };
  }
}

export async function publishPostToPlatformWithRetry(
  postPlatformId: string,
  options: { incrementRetryOnFailure?: boolean; notifyOnMaxRetries?: boolean } = {},
) {
  const result = await publishPostToPlatform(postPlatformId);

  if (result.success || !options.incrementRetryOnFailure) {
    return result;
  }

  const postPlatform = await PostPlatform.findById(postPlatformId);
  if (!postPlatform) {
    return result;
  }

  postPlatform.retryCount += 1;

  if (postPlatform.retryCount >= MAX_PUBLISH_RETRIES) {
    postPlatform.status = "failed";
    await postPlatform.save();

    if (options.notifyOnMaxRetries) {
      const post = await Post.findById(postPlatform.postId);
      if (post) {
        await createPublishFailureNotification({
          userId: post.userId.toString(),
          postId: post._id.toString(),
          platform: postPlatform.platform,
          errorMessage: result.errorMessage ?? "Publishing failed.",
        });
      }
    }
  } else {
    postPlatform.status = "pending";
    await postPlatform.save();
  }

  return result;
}

export async function publishAllPendingPlatformsForPost(postId: string) {
  const pendingPlatforms = await PostPlatform.find({
    postId,
    status: "pending",
  });

  const results: PublishPlatformResult[] = [];

  for (const postPlatform of pendingPlatforms) {
    results.push(
      await publishPostToPlatform(postPlatform._id.toString()),
    );
  }

  await syncPostStatusFromPlatforms(postId);

  return results;
}

export type ScheduledPublishSummary = {
  processedPosts: number;
  publishedPosts: number;
  failedPosts: number;
  platformAttempts: number;
  platformSuccesses: number;
  platformFailures: number;
};

export async function processDueScheduledPosts(): Promise<ScheduledPublishSummary> {
  await connectDB();

  const now = new Date();
  const duePosts = await Post.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
  });

  const summary: ScheduledPublishSummary = {
    processedPosts: 0,
    publishedPosts: 0,
    failedPosts: 0,
    platformAttempts: 0,
    platformSuccesses: 0,
    platformFailures: 0,
  };

  for (const post of duePosts) {
    const claimedPost = await Post.findOneAndUpdate(
      { _id: post._id, status: "scheduled" },
      { $set: { status: "publishing" } },
      { new: true }
    );

    if (!claimedPost) {
      continue;
    }

    summary.processedPosts += 1;

    await ensurePostPlatformsForPost(claimedPost);

    const retryablePlatforms = await PostPlatform.find({
      postId: post._id,
      $or: [
        { status: "pending" },
        { status: "failed", retryCount: { $lt: MAX_PUBLISH_RETRIES } },
      ],
    });

    for (const postPlatform of retryablePlatforms) {
      summary.platformAttempts += 1;
      const result = await publishPostToPlatformWithRetry(
        postPlatform._id.toString(),
        {
          incrementRetryOnFailure: true,
          notifyOnMaxRetries: true,
        },
      );

      if (result.success) {
        summary.platformSuccesses += 1;
      } else {
        summary.platformFailures += 1;
      }
    }

    const updatedPost = await syncPostStatusFromPlatforms(post._id.toString());

    if (updatedPost?.status === "published") {
      summary.publishedPosts += 1;
      await createPublishSuccessNotification({
        userId: post.userId.toString(),
        postId: post._id.toString(),
        contentPreview: post.content,
      });
    } else if (updatedPost?.status === "failed") {
      summary.failedPosts += 1;
    }
  }

  return summary;
}

export async function processConfirmedQueue(): Promise<ScheduledPublishSummary> {
  await connectDB();

  const confirmedPosts = await Post.find({
    status: "confirmed",
  })
    .sort({ createdAt: 1 })
    .limit(2);

  const summary: ScheduledPublishSummary = {
    processedPosts: 0,
    publishedPosts: 0,
    failedPosts: 0,
    platformAttempts: 0,
    platformSuccesses: 0,
    platformFailures: 0,
  };

  for (const post of confirmedPosts) {
    const claimedPost = await Post.findOneAndUpdate(
      { _id: post._id, status: "confirmed" },
      { $set: { status: "publishing" } },
      { new: true }
    );

    if (!claimedPost) {
      continue;
    }

    summary.processedPosts += 1;

    await ensurePostPlatformsForPost(claimedPost);

    const retryablePlatforms = await PostPlatform.find({
      postId: post._id,
      $or: [
        { status: "pending" },
        { status: "failed", retryCount: { $lt: MAX_PUBLISH_RETRIES } },
      ],
    });

    for (const postPlatform of retryablePlatforms) {
      summary.platformAttempts += 1;
      const result = await publishPostToPlatformWithRetry(
        postPlatform._id.toString(),
        {
          incrementRetryOnFailure: true,
          notifyOnMaxRetries: true,
        },
      );

      if (result.success) {
        summary.platformSuccesses += 1;
      } else {
        summary.platformFailures += 1;
      }
    }

    const updatedPost = await syncPostStatusFromPlatforms(post._id.toString());

    if (updatedPost?.status === "published") {
      summary.publishedPosts += 1;
      await createPublishSuccessNotification({
        userId: post.userId.toString(),
        postId: post._id.toString(),
        contentPreview: post.content,
      });
    } else if (updatedPost?.status === "failed") {
      summary.failedPosts += 1;
    }
  }

  return summary;
}

export async function autoGenerateDailyDrafts() {
  await connectDB();

  const users = await User.find({});
  let totalGenerated = 0;

  for (const user of users) {
    const socialAccounts = await SocialAccount.find({
      userId: user._id,
      isConnected: true,
    });

    if (socialAccounts.length === 0) {
      continue;
    }

    const platforms = socialAccounts.map((acc) => acc.platform);

    const activeTopics = await Topic.find({
      userId: user._id,
      isActive: true,
    });

    if (activeTopics.length === 0) {
      continue;
    }

    const randomIndex = Math.floor(Math.random() * activeTopics.length);
    const topic = activeTopics[randomIndex];

    try {
      const draftsMap: Partial<Record<SocialPlatform, string>> = {};

      for (const platform of platforms) {
        const generatedCopy = await generateText({
          platform,
          tone: "professional",
          topic: `Topic to address: ${topic.text}. Write a professional, insightful post discussing this topic.`,
          goal: "educate",
        });
        draftsMap[platform] = generatedCopy;
      }

      let media: any = undefined;
      let upload: any = undefined;
      const imgPrompt = `A high quality, professional, conceptual modern graphic representing: ${topic.text}`;

      try {
        const imageBuffer = await generateImage({ prompt: imgPrompt });
        upload = await uploadImageBuffer(imageBuffer, "postforge/ai-generated");
        const thumbnailUrl = buildThumbnailUrl(upload.publicId);
        const fileName = `ai-auto-${Date.now()}.png`;

        media = await MediaLibrary.create({
          userId: user._id,
          fileName,
          fileType: "image",
          fileUrl: upload.secureUrl,
          thumbnailUrl,
          source: "ai-generated",
          aiPrompt: imgPrompt,
          cloudinaryPublicId: upload.publicId,
        });
      } catch (imgError) {
        console.error("Failed to generate image for daily auto draft:", imgError);
      }

      const primaryContent = platforms
        .map((p) => draftsMap[p])
        .find(Boolean) || "";

      const post = await Post.create({
        userId: user._id,
        content: primaryContent,
        aiPrompt: `Daily Auto-Generated Draft from Topic: ${topic.text}`,
        platforms,
        imageUrl: upload?.secureUrl,
        mediaLibraryId: media?._id,
        status: "draft",
      });

      await ensurePostPlatformsForPost(post, draftsMap);
      totalGenerated += 1;
    } catch (err) {
      console.error(`Failed to auto-generate draft for user ${user._id}:`, err);
    }
  }

  return { totalGenerated };
}

