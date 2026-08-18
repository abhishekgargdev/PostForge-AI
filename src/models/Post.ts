import mongoose, { Schema, model, models, type Model } from "mongoose";

export const POST_STATUSES = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export interface IPost {
  userId: mongoose.Types.ObjectId;
  content: string;
  aiPrompt?: string;
  status: PostStatus;
  scheduledAt?: Date;
  publishedAt?: Date;
  imageUrl?: string;
  mediaLibraryId?: mongoose.Types.ObjectId;
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
  },
  { timestamps: true },
);

postSchema.index({ userId: 1, status: 1 });
postSchema.index({ userId: 1, scheduledAt: 1 });
postSchema.index({ status: 1, scheduledAt: 1 });

const Post = (models.Post as Model<IPost>) || model<IPost>("Post", postSchema);

export default Post;
