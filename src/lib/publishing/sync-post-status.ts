import Post from "@/models/Post";
import PostPlatform from "@/models/PostPlatform";

export async function syncPostStatusFromPlatforms(postId: string) {
  const post = await Post.findById(postId);
  if (!post) {
    return null;
  }

  const platforms = await PostPlatform.find({ postId });

  if (platforms.length === 0) {
    return post;
  }

  const allPublished = platforms.every((item) => item.status === "published");
  const allFailed = platforms.every((item) => item.status === "failed" && item.retryCount >= 3);
  const hasRetryable = platforms.some(
    (item) =>
      item.status === "pending" ||
      item.status === "publishing" ||
      (item.status === "failed" && item.retryCount < 3)
  );

  if (allPublished) {
    post.status = "published";
    post.publishedAt = post.publishedAt ?? new Date();
  } else if (allFailed) {
    post.status = "failed";
  } else if (hasRetryable) {
    post.status = "scheduled";
  } else {
    post.status = "published";
    post.publishedAt = post.publishedAt ?? new Date();
  }

  await post.save();
  return post;
}

export async function getPendingPostPlatforms(postId: string) {
  return PostPlatform.find({
    postId,
    status: "pending",
  });
}

export async function getRetryablePostPlatforms(postId: string) {
  return PostPlatform.find({
    postId,
    $or: [
      { status: "pending" },
      { status: "publishing" },
      { status: "failed", retryCount: { $lt: 3 } },
    ],
  });
}
