import mongoose, { Schema, model, models, type Model } from "mongoose";

import { POST_GOALS } from "@/lib/validation/ai";
import { POST_TONES } from "@/lib/validation/posts";

export interface IDayPreference {
  userId: mongoose.Types.ObjectId;
  dayOfWeek: number;
  topic: string;
  goal: (typeof POST_GOALS)[number];
  tone: (typeof POST_TONES)[number];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dayPreferenceSchema = new Schema<IDayPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    topic: { type: String, required: true, trim: true },
    goal: {
      type: String,
      required: true,
      enum: POST_GOALS,
    },
    tone: {
      type: String,
      required: true,
      enum: POST_TONES,
      default: "professional",
    },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

dayPreferenceSchema.index({ userId: 1, dayOfWeek: 1 }, { unique: true });

const DayPreference =
  (models.DayPreference as Model<IDayPreference>) ||
  model<IDayPreference>("DayPreference", dayPreferenceSchema);

export default DayPreference;
