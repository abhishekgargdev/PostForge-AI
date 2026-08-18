import mongoose, { Schema, model, models, type Model } from "mongoose";

import {
  MEDIA_FILE_TYPES,
  MEDIA_SOURCES,
  type MediaFileType,
  type MediaSource,
} from "@/types/media";
export {
  MEDIA_FILE_TYPES,
  MEDIA_SOURCES,
  type MediaFileType,
  type MediaSource,
};

export interface IMediaLibrary {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileType: MediaFileType;
  fileUrl: string;
  thumbnailUrl?: string;
  source: MediaSource;
  aiPrompt?: string;
  cloudinaryPublicId: string;
  createdAt: Date;
}

const mediaLibrarySchema = new Schema<IMediaLibrary>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileName: { type: String, required: true, trim: true },
    fileType: {
      type: String,
      enum: MEDIA_FILE_TYPES,
      required: true,
    },
    fileUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    source: {
      type: String,
      enum: MEDIA_SOURCES,
      required: true,
    },
    aiPrompt: { type: String },
    cloudinaryPublicId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

mediaLibrarySchema.index({ userId: 1, createdAt: -1 });
mediaLibrarySchema.index({ userId: 1, source: 1 });

const MediaLibrary =
  (models.MediaLibrary as Model<IMediaLibrary>) ||
  model<IMediaLibrary>("MediaLibrary", mediaLibrarySchema);

export default MediaLibrary;
