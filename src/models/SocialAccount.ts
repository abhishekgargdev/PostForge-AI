import mongoose, { Schema, model, models, type Model } from "mongoose";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/types/platforms";
export { SOCIAL_PLATFORMS, type SocialPlatform };

export interface ISocialAccount {
  userId: mongoose.Types.ObjectId;
  platform: SocialPlatform;
  platformUserId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  isConnected: boolean;
  lastSyncedAt?: Date;
}

const socialAccountSchema = new Schema<ISocialAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: SOCIAL_PLATFORMS,
      required: true,
    },
    platformUserId: { type: String, required: true },
    username: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiresAt: { type: Date },
    isConnected: { type: Boolean, required: true, default: true },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true },
);

socialAccountSchema.index({ userId: 1, platform: 1 });
socialAccountSchema.index(
  { userId: 1, platform: 1, platformUserId: 1 },
  { unique: true },
);

const SocialAccount =
  (models.SocialAccount as Model<ISocialAccount>) ||
  model<ISocialAccount>("SocialAccount", socialAccountSchema);

export default SocialAccount;
