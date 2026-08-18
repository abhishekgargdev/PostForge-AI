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
  const allFailed = platforms.every((item) => item.status === "failed");
  const hasPending = platforms.some((item) => item.status === "pending");

  if (allPublished) {
    post.status = "published";
    post.publishedAt = post.publishedAt ?? new Date();
  } else if (allFailed) {
    post.status = "failed";
  } else if (hasPending) {
    if (post.status !== "scheduled") {
      post.status = "publishing";
    }
  } else if (platforms.some((item) => item.status === "published")) {
    post.status = "published";
    post.publishedAt = post.publishedAt ?? new Date();
  } else {
    post.status = "failed";
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
    $or: [{ status: "pending" }, { status: "failed", retryCount: { $lt: 3 } }],
  });
}
