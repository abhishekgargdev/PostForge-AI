import { connectDB } from "@/lib/db";
import { decryptToken } from "@/lib/crypto/tokens";
import { publishLinkedInPost } from "@/lib/social/linkedin";
import { ensurePostPlatformsForPost } from "@/lib/publishing/ensure-post-platforms";
import {
  createPublishFailureNotification,
  createPublishSuccessNotification,
} from "@/lib/notifications/create";
import {
  syncPostStatusFromPlatforms,
} from "@/lib/publishing/sync-post-status";
import Post, { type IPost } from "@/models/Post";
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
  post: IPost;
  postPlatform: IPostPlatform;
  socialAccount: ISocialAccount;
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

  const result = await publishLinkedInPost({
    post: context.post,
    postPlatform: context.postPlatform,
    socialAccount: context.socialAccount,
  });

  if (!result.success) {
    throw new Error(result.message);
  }

  return {
    platformPostId: result.platformPostId,
    platformUrl: result.platformUrl,
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

async function runWithConcurrencyLimit<T>(
  limit: number,
  items: T[],
  fn: (item: T) => Promise<void>
): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

export async function publishPostToPlatform(
  postPlatformId: string,
): Promise<PublishPlatformResult> {
  await connectDB();

  const initialPlatform = await PostPlatform.findById(postPlatformId);
  if (!initialPlatform) {
    throw new Error("PostPlatform not found.");
  }

  if (initialPlatform.platformPostId) {
    return {
      success: true,
      postPlatformId,
      platform: initialPlatform.platform,
      platformUrl: initialPlatform.platformUrl,
    };
  }

  // Atomically claim this platform
  const postPlatform = await PostPlatform.findOneAndUpdate(
    {
      _id: postPlatformId,
      status: { $in: ["pending", "failed", "publishing"] },
    },
    {
      $set: {
        status: "publishing",
      },
    },
    { new: true }
  );

  if (!postPlatform) {
    return {
      success: false,
      postPlatformId,
      platform: initialPlatform.platform,
      errorMessage: "PostPlatform already claimed or completed by another process.",
    };
  }

  const [post, socialAccount] = await Promise.all([
    Post.findById(postPlatform.postId),
    SocialAccount.findById(socialAccountIdToUse(postPlatform)),
  ]);

  function socialAccountIdToUse(p: IPostPlatform) {
    return p.socialAccountId;
  }

  if (!post) {
    postPlatform.status = "failed";
    postPlatform.errorMessage = "Parent post not found.";
    await postPlatform.save();
    throw new Error("Post not found.");
  }

  if (!socialAccount) {
    postPlatform.status = "failed";
    postPlatform.errorMessage = "Social account not found.";
    await postPlatform.save();
    throw new Error("Social account not found.");
  }

  try {
    const publisher = platformPublishers[postPlatform.platform];
    const result = await publisher({
      post,
      postPlatform,
      socialAccount,
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
  // Update lastPublishAttemptAt before attempting
  await PostPlatform.findByIdAndUpdate(postPlatformId, {
    $set: { lastPublishAttemptAt: new Date() },
  });

  const result = await publishPostToPlatform(postPlatformId);

  // If another run already claimed it, return early without retry updates
  if (result.errorMessage?.includes("already claimed")) {
    return result;
  }

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
    // Keep as failed so sync rollup knows retry is pending
    postPlatform.status = "failed";
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
  const startTime = new Date();
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

  let numberClaimed = 0;
  let numberSkipped = 0;

  const platformsToProcess: { postPlatformId: string; parentPostId: string }[] = [];

  for (const post of duePosts) {
    const claimedPost = await Post.findOneAndUpdate(
      { _id: post._id, status: "scheduled" },
      { $set: { status: "publishing" } },
      { new: true }
    );

    if (!claimedPost) {
      numberSkipped += 1;
      continue;
    }

    numberClaimed += 1;
    summary.processedPosts += 1;

    await ensurePostPlatformsForPost(claimedPost);

    const retryablePlatforms = await PostPlatform.find({
      postId: post._id,
      $or: [
        { status: "pending" },
        { status: "publishing" },
        { status: "failed", retryCount: { $lt: MAX_PUBLISH_RETRIES } },
      ],
    });

    for (const pp of retryablePlatforms) {
      platformsToProcess.push({
        postPlatformId: pp._id.toString(),
        parentPostId: post._id.toString(),
      });
    }
  }

  const parentPostIdsToSync = new Set<string>();

  await runWithConcurrencyLimit(3, platformsToProcess, async (item) => {
    try {
      summary.platformAttempts += 1;
      parentPostIdsToSync.add(item.parentPostId);

      const result = await publishPostToPlatformWithRetry(
        item.postPlatformId,
        {
          incrementRetryOnFailure: true,
          notifyOnMaxRetries: true,
        }
      );

      if (result.success) {
        summary.platformSuccesses += 1;
      } else {
        if (!result.errorMessage?.includes("already claimed")) {
          summary.platformFailures += 1;
        }
      }
    } catch (err) {
      console.error(`Error processing scheduled post platform ${item.postPlatformId}:`, err);
      summary.platformFailures += 1;
    }
  });

  for (const parentPostId of parentPostIdsToSync) {
    try {
      const updatedPost = await syncPostStatusFromPlatforms(parentPostId);
      if (updatedPost?.status === "published") {
        summary.publishedPosts += 1;
        const postDoc = await Post.findById(parentPostId);
        if (postDoc) {
          await createPublishSuccessNotification({
            userId: postDoc.userId.toString(),
            postId: postDoc._id.toString(),
            contentPreview: postDoc.content,
          });
        }
      } else if (updatedPost?.status === "failed") {
        summary.failedPosts += 1;
      }
    } catch (syncErr) {
      console.error(`Error syncing post status for scheduled post ${parentPostId}:`, syncErr);
    }
  }

  const finishedTime = new Date();
  console.log(`[CRON RUN] executionStartedAt: ${startTime.toISOString()}, executionFinishedAt: ${finishedTime.toISOString()}, numberFound: ${duePosts.length}, numberClaimed: ${numberClaimed}, numberSkipped: ${numberSkipped}, numberPublished: ${summary.platformSuccesses}, numberFailed: ${summary.platformFailures}`);

  return summary;
}

export async function processConfirmedQueue(): Promise<ScheduledPublishSummary> {
  const startTime = new Date();
  await connectDB();

  const confirmedPosts = await Post.find({
    status: "confirmed",
  })
    .sort({ createdAt: 1 })
    .limit(5);

  const summary: ScheduledPublishSummary = {
    processedPosts: 0,
    publishedPosts: 0,
    failedPosts: 0,
    platformAttempts: 0,
    platformSuccesses: 0,
    platformFailures: 0,
  };

  let numberClaimed = 0;
  let numberSkipped = 0;

  const platformsToProcess: { postPlatformId: string; parentPostId: string }[] = [];

  for (const post of confirmedPosts) {
    const claimedPost = await Post.findOneAndUpdate(
      { _id: post._id, status: "confirmed" },
      { $set: { status: "publishing" } },
      { new: true }
    );

    if (!claimedPost) {
      numberSkipped += 1;
      continue;
    }

    numberClaimed += 1;
    summary.processedPosts += 1;

    await ensurePostPlatformsForPost(claimedPost);

    const retryablePlatforms = await PostPlatform.find({
      postId: post._id,
      $or: [
        { status: "pending" },
        { status: "publishing" },
        { status: "failed", retryCount: { $lt: MAX_PUBLISH_RETRIES } },
      ],
    });

    for (const pp of retryablePlatforms) {
      platformsToProcess.push({
        postPlatformId: pp._id.toString(),
        parentPostId: post._id.toString(),
      });
    }
  }

  const parentPostIdsToSync = new Set<string>();

  await runWithConcurrencyLimit(3, platformsToProcess, async (item) => {
    try {
      summary.platformAttempts += 1;
      parentPostIdsToSync.add(item.parentPostId);

      const result = await publishPostToPlatformWithRetry(
        item.postPlatformId,
        {
          incrementRetryOnFailure: true,
          notifyOnMaxRetries: true,
        }
      );

      if (result.success) {
        summary.platformSuccesses += 1;
      } else {
        if (!result.errorMessage?.includes("already claimed")) {
          summary.platformFailures += 1;
        }
      }
    } catch (err) {
      console.error(`Error processing confirmed post platform ${item.postPlatformId}:`, err);
      summary.platformFailures += 1;
    }
  });

  for (const parentPostId of parentPostIdsToSync) {
    try {
      const updatedPost = await syncPostStatusFromPlatforms(parentPostId);
      if (updatedPost?.status === "published") {
        summary.publishedPosts += 1;
        const postDoc = await Post.findById(parentPostId);
        if (postDoc) {
          await createPublishSuccessNotification({
            userId: postDoc.userId.toString(),
            postId: postDoc._id.toString(),
            contentPreview: postDoc.content,
          });
        }
      } else if (updatedPost?.status === "failed") {
        summary.failedPosts += 1;
      }
    } catch (syncErr) {
      console.error(`Error syncing post status for confirmed post ${parentPostId}:`, syncErr);
    }
  }

  const finishedTime = new Date();
  console.log(`[CRON QUEUE RUN] executionStartedAt: ${startTime.toISOString()}, executionFinishedAt: ${finishedTime.toISOString()}, numberFound: ${confirmedPosts.length}, numberClaimed: ${numberClaimed}, numberSkipped: ${numberSkipped}, numberPublished: ${summary.platformSuccesses}, numberFailed: ${summary.platformFailures}`);

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

    const getRandomTopic = () => {
      const idx = Math.floor(Math.random() * activeTopics.length);
      return activeTopics[idx];
    };

    // 1. Generate regular Text/Image Post
    const postTopic = getRandomTopic();
    try {
      const draftsMap: Partial<Record<SocialPlatform, string>> = {};

      for (const platform of platforms) {
        const generatedCopy = await generateText({
          platform,
          tone: "professional",
          topic: `Topic to address: ${postTopic.text}. Write a professional, insightful post discussing this topic.`,
          goal: "educate",
        });
        draftsMap[platform] = generatedCopy;
      }

      let media: any = undefined;
      let upload: any = undefined;
      const imgPrompt = `A high quality, professional, conceptual modern graphic representing: ${postTopic.text}`;

      try {
        const imgResult = await generateImage({ prompt: imgPrompt, userId: user._id.toString() });
        if (imgResult.success) {
          upload = await uploadImageBuffer(imgResult.imageBuffer, "postforge/ai-generated");
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
        }
      } catch (imgError) {
        console.error("Failed to generate image for daily auto draft:", imgError);
      }

      const primaryContent = platforms
        .map((p) => draftsMap[p])
        .find(Boolean) || "";

      const post = await Post.create({
        userId: user._id,
        content: primaryContent,
        aiPrompt: `Daily Auto-Generated Draft from Topic: ${postTopic.text}\n\nImage Generation Prompt: ${imgPrompt}`,
        platforms,
        imageUrl: upload?.secureUrl,
        mediaLibraryId: media?._id,
        status: "draft",
        postType: "post",
      });

      await ensurePostPlatformsForPost(post, draftsMap);
      totalGenerated += 1;
    } catch (err) {
      console.error(`Failed to auto-generate post draft for user ${user._id}:`, err);
    }

    // 2. Generate Article Post
    const articleTopic = getRandomTopic();
    try {
      const draftsMap: Partial<Record<SocialPlatform, string>> = {};

      for (const platform of platforms) {
        const generatedCopy = await generateText({
          platform,
          tone: "professional",
          topic: `Topic to address: ${articleTopic.text}. Write a professional, educational commentary/introduction for a shared article about this topic.`,
          goal: "educate",
        });
        draftsMap[platform] = generatedCopy;
      }

      // Generate article title and description
      const articleTitle = await generateText({
        platform: "linkedin",
        tone: "professional",
        topic: `Write a headline/title for an article about: ${articleTopic.text}. Return ONLY the headline.`,
        goal: "educate"
      }).then(t => t.trim().replace(/^"|"$/g, ''));

      const articleDescription = await generateText({
        platform: "linkedin",
        tone: "professional",
        topic: `Write a short 1-sentence summary description for an article about: ${articleTopic.text}. Return ONLY the description.`,
        goal: "educate"
      }).then(d => d.trim().replace(/^"|"$/g, ''));

      const slug = articleTopic.text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const articleUrl = `https://postforge-ai.vercel.app/articles/${slug}-${Date.now()}`;

      const primaryContent = platforms
        .map((p) => draftsMap[p])
        .find(Boolean) || "";

      const post = await Post.create({
        userId: user._id,
        content: primaryContent,
        aiPrompt: `Daily Auto-Generated Article from Topic: ${articleTopic.text}`,
        platforms,
        status: "draft",
        postType: "article",
        articleUrl,
        articleTitle,
        articleDescription,
      });

      await ensurePostPlatformsForPost(post, draftsMap);
      totalGenerated += 1;
    } catch (err) {
      console.error(`Failed to auto-generate article draft for user ${user._id}:`, err);
    }
  }

  return { totalGenerated };
}

