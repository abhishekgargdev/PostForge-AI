import mongoose, { Schema, model, models, type Model } from "mongoose";

import type { WeeklyContentPreferences } from "@/lib/content-preferences/types";

export interface IUser {
  email: string;
  passwordHash: string;
  fullName: string;
  avatarUrl?: string;
  timezone: string;
  weeklyContentPreferences?: WeeklyContentPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    timezone: { type: String, required: true, default: "UTC" },
    weeklyContentPreferences: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true },
);

const User = (models.User as Model<IUser>) || model<IUser>("User", userSchema);

export default User;
