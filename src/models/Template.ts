import mongoose, { Schema, model, models, type Model } from "mongoose";

import { TEMPLATE_PLATFORMS, type TemplatePlatform } from "@/types/templates";
export { TEMPLATE_PLATFORMS, type TemplatePlatform };

export interface ITemplate {
  userId?: mongoose.Types.ObjectId | null;
  name: string;
  platform: TemplatePlatform;
  promptTemplate: string;
  contentExample?: string;
  category?: string;
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const templateSchema = new Schema<ITemplate>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    platform: {
      type: String,
      enum: TEMPLATE_PLATFORMS,
      required: true,
      default: "all",
    },
    promptTemplate: { type: String, required: true },
    contentExample: { type: String },
    category: { type: String, trim: true },
    isPublic: { type: Boolean, required: true, default: false },
    usageCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

templateSchema.index({ isPublic: 1, platform: 1 });
templateSchema.index({ userId: 1, platform: 1 });
templateSchema.index({ category: 1, isPublic: 1 });

const Template =
  (models.Template as Model<ITemplate>) ||
  model<ITemplate>("Template", templateSchema);

export default Template;
