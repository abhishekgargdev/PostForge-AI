import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type LoaderProps = {
  className?: string;
  label?: string;
};

export function Loader({ className, label = "Loading" }: LoaderProps) {
  return (
    <Loader2Icon
      aria-label={label}
      className={cn("size-4 animate-spin", className)}
    />
  );
}

type SectionSkeletonProps = {
  rows?: number;
  className?: string;
};

export function SectionSkeleton({
  rows = 3,
  className,
}: SectionSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
