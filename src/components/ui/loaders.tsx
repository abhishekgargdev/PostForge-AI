"use client";

import { motion, useReducedMotion } from "framer-motion";

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
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <span
        aria-label={label}
        role="status"
        className={cn(
          "inline-block rounded-full border-2 border-forge border-t-transparent",
          loaderSizes[size],
          className,
        )}
      />
    );
  }

  return (
    <motion.span
      aria-label={label}
      role="status"
      className={cn("inline-block rounded-full", loaderSizes[size], className)}
      style={{
        background:
          "conic-gradient(from 0deg, var(--color-forge, #6D5DFC), var(--color-circuit, #22D3EE), var(--color-forge, #6D5DFC))",
        WebkitMask:
          "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
        mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
      }}
      animate={{ rotate: 360 }}
      transition={{
        repeat: Infinity,
        duration: 0.9,
        ease: "linear",
      }}
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
