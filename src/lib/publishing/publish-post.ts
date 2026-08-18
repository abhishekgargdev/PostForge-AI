import { connectDB } from "@/lib/db";
import { ensurePostPlatformsForPost } from "@/lib/publishing/ensure-post-platforms";
import { createPublishFailureNotification } from "@/lib/publishing/notifications";
import {
  syncPostStatusFromPlatforms,
} from "@/lib/publishing/sync-post-status";
import Post from "@/models/Post";
import PostPlatform, { type IPostPlatform } from "@/models/PostPlatform";
import SocialAccount, { type ISocialAccount } from "@/models/SocialAccount";
import type { SocialPlatform } from "@/models/SocialAccount";

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
  _context: PublishContext,
): Promise<PlatformPublishSuccess> {
  const id = `sim-linkedin-${Date.now()}`;
  return {
    platformPostId: id,
    platformUrl: `https://www.linkedin.com/feed/update/${id}`,
  };
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
    summary.processedPosts += 1;
    post.status = "publishing";
    await post.save();

    await ensurePostPlatformsForPost(post);

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
    } else if (updatedPost?.status === "failed") {
      summary.failedPosts += 1;
    }
  }

  return summary;
}
