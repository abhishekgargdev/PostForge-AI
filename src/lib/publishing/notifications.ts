import Notification from "@/models/Notification";
import type { IPostPlatform } from "@/models/PostPlatform";
import type { SocialPlatform } from "@/models/SocialAccount";

export async function createPublishFailureNotification(input: {
  userId: string;
  postId: string;
  platform: SocialPlatform;
  errorMessage: string;
}) {
  await Notification.create({
    userId: input.userId,
    type: "publish_failed",
    title: "Scheduled post failed to publish",
    message: `Your scheduled post could not be published to ${input.platform} after 3 attempts. ${input.errorMessage}`,
    isRead: false,
  });
}

export function formatPlatformFailureMessage(
  platform: SocialPlatform,
  errorMessage?: string,
) {
  return errorMessage ?? `Failed to publish to ${platform}.`;
}

export type { IPostPlatform };
