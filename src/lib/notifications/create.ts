import mongoose from "mongoose";

import { formatPlatformLabel } from "@/lib/posts/serialize";
import Notification from "@/models/Notification";
import type { SocialPlatform } from "@/models/SocialAccount";

function truncate(text: string, length: number) {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).trim()}...`;
}

export async function createPublishSuccessNotification(input: {
  userId: string;
  postId: string;
  contentPreview: string;
}) {
  await Notification.create({
    userId: new mongoose.Types.ObjectId(input.userId),
    type: "publish_success",
    title: "Scheduled post published",
    message: `Your scheduled post went live: "${truncate(input.contentPreview, 100)}"`,
    isRead: false,
  });
}

export async function createPublishFailureNotification(input: {
  userId: string;
  postId: string;
  platform: SocialPlatform;
  errorMessage: string;
}) {
  await Notification.create({
    userId: new mongoose.Types.ObjectId(input.userId),
    type: "publish_failed",
    title: "Scheduled post failed to publish",
    message: `Your scheduled post could not be published to ${formatPlatformLabel(input.platform)} after 3 attempts. ${input.errorMessage}`,
    isRead: false,
  });
}

export async function createAiGenerationFailureNotification(input: {
  userId: string;
  generationType: "text" | "image";
  errorMessage: string;
}) {
  const label = input.generationType === "text" ? "post text" : "an image";

  await Notification.create({
    userId: new mongoose.Types.ObjectId(input.userId),
    type: "ai_generation_failed",
    title: "AI generation failed",
    message: `All Gemini API keys were exhausted while generating ${label}. ${input.errorMessage}`,
    isRead: false,
  });
}
