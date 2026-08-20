import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertLocalToUtc(localDateTimeStr: string, timezone: string): Date {
  const [datePart, timePart] = localDateTimeStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute));

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const getFormattedParts = (d: Date) => {
    const parts = formatter.formatToParts(d);
    const map: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== "literal") {
        map[p.type] = Number(p.value);
      }
    }
    return map;
  };

  for (let i = 0; i < 3; i++) {
    const formatted = getFormattedParts(guess);
    const formattedUtc = Date.UTC(
      formatted.year,
      formatted.month - 1,
      formatted.day,
      formatted.hour === 24 ? 0 : formatted.hour,
      formatted.minute
    );

    const targetUtc = Date.UTC(year, month - 1, day, hour, minute);
    const diff = targetUtc - formattedUtc;
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }

  return guess;
}

export function convertUtcToLocalString(utcDate: Date | string, timezone: string): string {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      map[p.type] = p.value;
    }
  }

  let hour = map.hour;
  if (hour === "24") {
    hour = "00";
  }

  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
}
