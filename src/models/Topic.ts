import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface ITopic {
  userId: mongoose.Types.ObjectId;
  text: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const topicSchema = new Schema<ITopic>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: { type: String, required: true, trim: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

const Topic =
  (models.Topic as Model<ITopic>) ||
  model<ITopic>("Topic", topicSchema);

export default Topic;
