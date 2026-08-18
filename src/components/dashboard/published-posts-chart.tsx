import type { PublishedDayPoint } from "@/lib/analytics/overview";
import { cn } from "@/lib/utils";

type PublishedPostsChartProps = {
  data: PublishedDayPoint[];
  className?: string;
};

export function PublishedPostsChart({
  data,
  className,
}: PublishedPostsChartProps) {
  const maxCount = Math.max(...data.map((point) => point.count), 1);
  const hasAnyPosts = data.some((point) => point.count > 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className="flex h-44 items-end gap-1 sm:gap-2"
        role="img"
        aria-label="Bar chart of posts published per day for the last 14 days"
      >
        {data.map((point) => {
          const heightPercent =
            point.count === 0 ? 0 : Math.max((point.count / maxCount) * 100, 8);

          return (
            <div
              key={point.date}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span className="h-4 text-[10px] leading-4 text-muted-foreground sm:text-xs">
                {point.count > 0 ? point.count : ""}
              </span>
              <div className="flex h-28 w-full items-end">
                <div
                  className={cn(
                    "w-full rounded-t-md bg-primary/80 transition-[height]",
                    point.count === 0 && "bg-muted",
                  )}
                  style={{ height: `${heightPercent}%` }}
                  title={`${point.label}: ${point.count} published`}
                />
              </div>
              <span className="truncate text-[10px] text-muted-foreground sm:text-xs">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>

      {!hasAnyPosts ? (
        <p className="text-sm text-muted-foreground">
          No platform publishes in the last 14 days yet.
        </p>
      ) : null}
    </div>
  );
}
