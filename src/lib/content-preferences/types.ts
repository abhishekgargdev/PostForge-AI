import type { PostGoal } from "@/lib/validation/ai";

export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export type DayContentPreference = {
  topic: string;
  goal: PostGoal;
};

export type WeeklyContentPreferences = Partial<
  Record<Weekday, DayContentPreference>
>;

export function getWeekdayForDate(date: Date): Weekday {
  return WEEKDAYS[date.getDay()];
}
