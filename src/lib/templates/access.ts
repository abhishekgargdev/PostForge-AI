import mongoose from "mongoose";

import type { ITemplate } from "@/models/Template";

export function buildVisibleTemplatesFilter(userId: string) {
  return {
    $or: [
      { isPublic: true },
      { userId: new mongoose.Types.ObjectId(userId) },
    ],
  };
}

export function canViewTemplate(
  template: Pick<ITemplate, "isPublic" | "userId">,
  userId: string,
) {
  if (template.isPublic) {
    return true;
  }

  return template.userId?.toString() === userId;
}

export function canModifyTemplate(
  template: Pick<ITemplate, "userId">,
  userId: string,
) {
  return template.userId?.toString() === userId;
}
