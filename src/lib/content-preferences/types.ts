import type { PostGoal } from "@/lib/validation/ai";
import type { PostTone } from "@/lib/validation/posts";

export const DAY_OF_WEEK_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

export type DayOfWeek = (typeof DAY_OF_WEEK_VALUES)[number];

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export type TodayDayPreference = {
  topic: string;
  goal: PostGoal;
  tone: PostTone;
};

export function getDayOfWeekInTimezone(
  timezone: string,
  date = new Date(),
): DayOfWeek {
  const weekdayLong = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  }).format(date);

  const weekdayMap: Record<string, DayOfWeek> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  return weekdayMap[weekdayLong] ?? (date.getDay() as DayOfWeek);
}
