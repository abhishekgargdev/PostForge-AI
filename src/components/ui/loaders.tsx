import { Loader2Icon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const loaderSizes = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
} as const;

type LoaderProps = {
  className?: string;
  label?: string;
  size?: keyof typeof loaderSizes;
};

export function Loader({
  className,
  label = "Loading",
  size = "md",
}: LoaderProps) {
  return (
    <Loader2Icon
      aria-label={label}
      className={cn("animate-spin", loaderSizes[size], className)}
    />
  );
}

type SectionSkeletonProps = {
  rows?: number;
  className?: string;
  rowClassName?: string;
};

export function SectionSkeleton({
  rows = 3,
  className,
  rowClassName,
}: SectionSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className={cn("h-10 w-full", rowClassName)} />
      ))}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Loader size="lg" label="Loading page" />
    </div>
  );
}
