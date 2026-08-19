import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IQuestion {
  userId: mongoose.Types.ObjectId;
  text: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
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

const Question =
  (models.Question as Model<IQuestion>) ||
  model<IQuestion>("Question", questionSchema);

export default Question;
