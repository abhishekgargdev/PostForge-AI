"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const DOT_COUNT = 8;
const BURST_DISTANCE = 24;

type SparkBurstProps = {
  play: boolean;
  className?: string;
};

export function SparkBurst({ play, className }: SparkBurstProps) {
  const reduceMotion = useReducedMotion();

  if (!play || reduceMotion) {
    return null;
  }

  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      aria-hidden
    >
      {Array.from({ length: DOT_COUNT }).map((_, index) => {
        const angle = (index / DOT_COUNT) * Math.PI * 2;
        const x = Math.cos(angle) * BURST_DISTANCE;
        const y = Math.sin(angle) * BURST_DISTANCE;

        return (
          <motion.span
            key={index}
            className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-circuit"
            initial={{ opacity: 0.9, scale: 0.4, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: 1.4, x, y }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
