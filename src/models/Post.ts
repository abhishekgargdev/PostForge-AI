import mongoose, { Schema, model, models, type Model } from "mongoose";

import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/models/SocialAccount";

import { POST_STATUSES, type PostStatus } from "@/types/posts";
export { POST_STATUSES, type PostStatus };

export interface IPost {
  userId: mongoose.Types.ObjectId;
  content: string;
  aiPrompt?: string;
  platforms: SocialPlatform[];
  status: PostStatus;
  scheduledAt?: Date;
  publishedAt?: Date;
  imageUrl?: string;
  mediaLibraryId?: mongoose.Types.ObjectId;
  topic?: string;
  category?: string;
  subtopic?: string;
  format?: string;
  timezone?: string;
  publishAttempts: number;
  lastPublishAttemptAt?: Date;
  lastPublishError?: string;
  externalPostId?: string;
  retryCount: number;
  imageStatus?: "pending" | "success" | "failed" | "none";
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    aiPrompt: { type: String },
    platforms: {
      type: [String],
      enum: SOCIAL_PLATFORMS,
      default: [],
    },
    status: {
      type: String,
      enum: POST_STATUSES,
      required: true,
      default: "draft",
    },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    imageUrl: { type: String },
    mediaLibraryId: {
      type: Schema.Types.ObjectId,
      ref: "MediaLibrary",
    },
    topic: { type: String },
    category: { type: String },
    subtopic: { type: String },
    format: { type: String },
    timezone: { type: String, default: "UTC" },
    publishAttempts: { type: Number, required: true, default: 0 },
    lastPublishAttemptAt: { type: Date },
    lastPublishError: { type: String },
    externalPostId: { type: String },
    retryCount: { type: Number, required: true, default: 0 },
    imageStatus: {
      type: String,
      enum: ["pending", "success", "failed", "none"],
      default: "none",
    },
  },
  { timestamps: true },
);

postSchema.index({ userId: 1, status: 1 });
postSchema.index({ userId: 1, scheduledAt: 1 });
postSchema.index({ status: 1, scheduledAt: 1 });

const Post = (models.Post as Model<IPost>) || model<IPost>("Post", postSchema);

export default Post;
