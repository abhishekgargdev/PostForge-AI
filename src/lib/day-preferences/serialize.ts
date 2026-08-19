import { POST_GOAL_LABELS } from "@/lib/validation/ai";
import type { IDayPreference } from "@/models/DayPreference";

export type DayPreferenceResponse = {
  id: string;
  dayOfWeek: number;
  topic: string;
  goal: IDayPreference["goal"];
  goalLabel: string;
  tone: IDayPreference["tone"];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toDayPreferenceResponse(
  preference: Pick<
    IDayPreference,
    | "dayOfWeek"
    | "topic"
    | "goal"
    | "tone"
    | "isActive"
    | "createdAt"
    | "updatedAt"
  > & { _id: { toString(): string } },
): DayPreferenceResponse {
  return {
    id: preference._id.toString(),
    dayOfWeek: preference.dayOfWeek,
    topic: preference.topic,
    goal: preference.goal,
    goalLabel: POST_GOAL_LABELS[preference.goal],
    tone: preference.tone,
    isActive: preference.isActive,
    createdAt: preference.createdAt.toISOString(),
    updatedAt: preference.updatedAt.toISOString(),
  };
}
