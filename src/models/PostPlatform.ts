import mongoose, { Schema, model, models, type Model } from "mongoose";

import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/models/SocialAccount";

export const POST_PLATFORM_STATUSES = [
  "pending",
  "scheduled",
  "publishing",
  "published",
  "failed",
] as const;
export type PostPlatformStatus = (typeof POST_PLATFORM_STATUSES)[number];

export interface IPostPlatform {
  postId: mongoose.Types.ObjectId;
  socialAccountId: mongoose.Types.ObjectId;
  platform: SocialPlatform;
  adaptedContent: string;
  platformPostId?: string;
  platformUrl?: string;
  status: PostPlatformStatus;
  errorMessage?: string;
  retryCount: number;
  publishedAt?: Date;
  lastPublishAttemptAt?: Date;
}

const postPlatformSchema = new Schema<IPostPlatform>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    socialAccountId: {
      type: Schema.Types.ObjectId,
      ref: "SocialAccount",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: SOCIAL_PLATFORMS,
      required: true,
    },
    adaptedContent: { type: String, required: true },
    platformPostId: { type: String },
    platformUrl: { type: String },
    status: {
      type: String,
      enum: POST_PLATFORM_STATUSES,
      required: true,
      default: "pending",
    },
    errorMessage: { type: String },
    retryCount: { type: Number, required: true, default: 0 },
    publishedAt: { type: Date },
    lastPublishAttemptAt: { type: Date },
  },
  { timestamps: true },
);

postPlatformSchema.index({ postId: 1, platform: 1 }, { unique: true });
postPlatformSchema.index({ postId: 1, status: 1 });
postPlatformSchema.index({ status: 1, publishedAt: 1 });

const PostPlatform =
  (models.PostPlatform as Model<IPostPlatform>) ||
  model<IPostPlatform>("PostPlatform", postPlatformSchema);

export default PostPlatform;
