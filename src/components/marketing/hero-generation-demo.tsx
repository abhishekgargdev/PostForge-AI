"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { SparkBurst } from "@/components/ui/spark-burst";
import { cn } from "@/lib/utils";

const SAMPLE_POST =
  "Shipped a smarter way to draft once and publish everywhere — AI adapts your copy for LinkedIn, X, and Facebook without losing your voice.";

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", className: "bg-[#0A66C2]/10 text-[#0A66C2]" },
  { id: "twitter", label: "X", className: "bg-ink/5 text-ink" },
  { id: "facebook", label: "Facebook", className: "bg-[#1877F2]/10 text-[#1877F2]" },
] as const;

export function HeroGenerationDemo() {
  const reduceMotion = useReducedMotion();
  const [displayText, setDisplayText] = useState("");
  const [activePlatform, setActivePlatform] = useState(0);
  const [burst, setBurst] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayText(SAMPLE_POST);
      return;
    }

    let cancelled = false;
    let charIndex = 0;
    let platformIndex = 0;
    let typingTimer: number | undefined;
    let phaseTimer: number | undefined;

    function resetCycle() {
      charIndex = 0;
      platformIndex = 0;
      setDisplayText("");
      setActivePlatform(0);
      setBurst(false);
      setIsGenerating(true);
    }

    function typeNextCharacter() {
      if (cancelled) {
        return;
      }

      charIndex += 1;
      setDisplayText(SAMPLE_POST.slice(0, charIndex));

      if (charIndex < SAMPLE_POST.length) {
        typingTimer = window.setTimeout(typeNextCharacter, 18);
        return;
      }

      setIsGenerating(false);
      setBurst(true);
      phaseTimer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        setBurst(false);
        platformIndex += 1;

        if (platformIndex < PLATFORMS.length) {
          setActivePlatform(platformIndex);
          charIndex = 0;
          setDisplayText("");
          setIsGenerating(true);
          typingTimer = window.setTimeout(typeNextCharacter, 280);
          return;
        }

        phaseTimer = window.setTimeout(() => {
          if (!cancelled) {
            resetCycle();
            typingTimer = window.setTimeout(typeNextCharacter, 400);
          }
        }, 1400);
      }, 700);
    }

    resetCycle();
    typingTimer = window.setTimeout(typeNextCharacter, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(typingTimer);
      window.clearTimeout(phaseTimer);
    };
  }, [reduceMotion]);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-forge opacity-20 blur-2xl" aria-hidden />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
        className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-forge/10"
      >
        <div className="border-b border-neutral-100 bg-cloud px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Review & publish
            </p>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide",
                isGenerating
                  ? "bg-forge/10 text-forge"
                  : "bg-circuit/10 text-circuit",
              )}
            >
              {isGenerating ? "Generating" : "Ready"}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            {PLATFORMS.map((platform, index) => (
              <span
                key={platform.id}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-opacity",
                  platform.className,
                  index === activePlatform ? "opacity-100" : "opacity-45",
                )}
              >
                {platform.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative px-4 py-5">
          <SparkBurst play={burst} className="left-1/2 top-8 -translate-x-1/2" />
          <p className="min-h-28 whitespace-pre-wrap text-sm leading-6 text-ink">
            {displayText}
            {isGenerating ? (
              <motion.span
                aria-hidden
                className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-forge"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            ) : null}
          </p>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-cloud/70 p-3">
            <div className="size-12 shrink-0 rounded-lg bg-gradient-forge opacity-80" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-ink">Shared image</p>
              <p className="text-xs text-neutral-500">
                One visual, every platform
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
