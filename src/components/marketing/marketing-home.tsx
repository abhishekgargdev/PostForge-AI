"use client";

import Link from "next/link";
import {
  CalendarClockIcon,
  ImageIcon,
  Link2Icon,
  SparklesIcon,
  ArrowRightIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { HeroGenerationDemo } from "@/components/marketing/hero-generation-demo";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { PageTransition } from "@/components/ui/page-transition";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: SparklesIcon,
    title: "Draft once, sound like you",
    description:
      "Answer a few quick questions and get platform-ready copy that matches your tone — no blank-page stress.",
  },
  {
    icon: ImageIcon,
    title: "Add visuals in seconds",
    description:
      "Generate on-brand images with AI or pick from your library, then attach one shared visual to every post.",
  },
  {
    icon: CalendarClockIcon,
    title: "Publish on your schedule",
    description:
      "Save drafts, schedule ahead, or publish now — one workflow whether you're planning the week or going live today.",
  },
  {
    icon: Link2Icon,
    title: "Connect where you post",
    description:
      "LinkedIn publishing is live today. Connect your account once and ship from PostForge without copy-pasting.",
  },
] as const;

const steps = [
  {
    number: "1",
    title: "Pick your platforms",
    description:
      "Choose LinkedIn, X, Facebook, or all connected accounts in one tap.",
    preview: (
      <div className="flex flex-wrap gap-2">
        {["LinkedIn", "X", "Facebook"].map((label) => (
          <span
            key={label}
            className="rounded-full border border-forge/30 bg-forge/5 px-3 py-1.5 text-xs font-medium text-ink"
          >
            {label}
          </span>
        ))}
      </div>
    ),
  },
  {
    number: "2",
    title: "Answer a couple of questions",
    description:
      "Topic, goal, tone — the same guided flow you use in the app, with your day-of-week defaults ready when you need them.",
    preview: (
      <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3 text-left">
        <p className="text-xs font-medium text-neutral-500">Topic</p>
        <p className="text-sm text-ink">Launch update for our scheduling workflow</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {["Educate", "Professional"].map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-neutral-100 px-2.5 py-1 text-[0.7rem] font-medium text-neutral-700"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    number: "3",
    title: "Review and publish",
    description:
      "Edit each platform draft, attach an image, then save, schedule, or publish — all from one screen.",
    preview: (
      <div className="rounded-xl border border-neutral-200 bg-white p-3 text-left">
        <p className="text-xs font-medium text-neutral-500">LinkedIn preview</p>
        <p className="mt-2 text-sm leading-6 text-ink">
          Here&apos;s how we cut drafting time in half while keeping every post on-brand.
        </p>
        <span className="mt-3 inline-flex rounded-full bg-forge px-3 py-1.5 text-xs font-medium text-white">
          Publish Now
        </span>
      </div>
    ),
  },
] as const;

function HeroContent() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-10 md:pb-24 md:pt-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-forge opacity-[0.08]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="space-y-6 text-center lg:text-left">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <GradientText
              as="h1"
              className="font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              PostForge AI
            </GradientText>
          </motion.div>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
            className="mx-auto max-w-xl text-lg leading-8 text-neutral-600 lg:mx-0"
          >
            Write once, forge posts for every platform — AI-drafted, on-brand,
            and ready to publish.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.16 }}
            className="flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
          >
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              className="h-11 min-w-44 bg-gradient-forge px-6 text-white hover:opacity-90"
            >
              Log In
              <ArrowRightIcon className="size-4" />
            </Button>
            <p className="text-sm text-neutral-500">
              Invite-only workspace — no public signup.
            </p>
          </motion.div>
        </div>

        <HeroGenerationDemo />
      </div>
    </section>
  );
}

export function MarketingHome() {
  return (
    <PageTransition className="min-h-full bg-cloud">
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-20 border-b border-neutral-200/80 bg-cloud/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-16">
            <Link href="/" className="font-heading text-lg font-semibold text-ink">
              <GradientText as="span">PostForge AI</GradientText>
            </Link>
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              variant="outline"
              className="h-11 px-4"
            >
              Log In
            </Button>
          </div>
        </header>

        <main className="flex-1">
          <HeroContent />

          <section className="border-t border-neutral-200 bg-white px-4 py-14 md:py-20">
            <div className="mx-auto max-w-6xl">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="font-heading text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                  What you can do with PostForge
                </h2>
                <p className="mt-3 text-sm text-neutral-600 md:text-base">
                  Less time rewriting, more time posting — built for people who
                  manage more than one channel.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
                {features.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <article
                      key={feature.title}
                      className="rounded-2xl border border-neutral-200 bg-cloud/50 p-5 md:p-6"
                    >
                      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-forge text-white">
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <h3 className="text-lg font-semibold text-ink">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {feature.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="border-t border-neutral-200 px-4 py-14 md:py-20">
            <div className="mx-auto max-w-6xl">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="font-heading text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                  How it works
                </h2>
                <p className="mt-3 text-sm text-neutral-600 md:text-base">
                  The same three-step wizard you&apos;ll use after logging in —
                  no surprises once you&apos;re inside.
                </p>
              </div>

              <ol className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
                {steps.map((step, index) => (
                  <li
                    key={step.number}
                    className={cn(
                      "relative rounded-2xl border border-neutral-200 bg-white p-5 md:p-6",
                      index < steps.length - 1 &&
                        "md:after:absolute md:after:left-full md:after:top-1/2 md:after:hidden md:after:h-px md:after:w-6 md:after:-translate-y-1/2 md:after:bg-neutral-200 lg:after:block",
                    )}
                  >
                    <span className="inline-flex size-9 items-center justify-center rounded-full bg-forge/10 font-mono text-sm font-semibold text-forge">
                      {step.number}
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {step.description}
                    </p>
                    <div className="mt-5">{step.preview}</div>
                  </li>
                ))}
              </ol>

              <div className="mt-10 flex justify-center">
                <Button
                  render={<Link href="/login" />}
                  nativeButton={false}
                  className="h-11 min-w-44 bg-gradient-forge px-6 text-white hover:opacity-90"
                >
                  Log In
                </Button>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-neutral-200 bg-white px-4 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="space-y-1">
              <p className="font-heading text-base font-semibold text-ink">
                <GradientText as="span">PostForge AI</GradientText>
              </p>
              <p className="text-sm text-neutral-500">
                Forge once. Publish everywhere.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center text-sm font-medium text-forge hover:underline"
            >
              Log In
            </Link>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
