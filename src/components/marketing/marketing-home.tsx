"use client";

import Link from "next/link";
import {
  CalendarClockIcon,
  ImageIcon,
  Link2Icon,
  SparklesIcon,
  ArrowRightIcon,
  LinkedinIcon,
  FacebookIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

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
    gradient: "from-violet-500/20 to-indigo-500/20",
  },
  {
    icon: ImageIcon,
    title: "Add visuals in seconds",
    description:
      "Generate on-brand images with AI or pick from your library, then attach one shared visual to every post.",
    gradient: "from-cyan-500/20 to-blue-500/20",
  },
  {
    icon: CalendarClockIcon,
    title: "Publish on your schedule",
    description:
      "Save drafts, schedule ahead, or publish now — one workflow whether you're planning the week or going live today.",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    icon: Link2Icon,
    title: "Connect where you post",
    description:
      "LinkedIn publishing is live today. Connect your account once and ship from PostForge without copy-pasting.",
    gradient: "from-emerald-500/20 to-teal-500/20",
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
            className="rounded-full border border-forge/30 bg-forge/5 px-3 py-1 text-xs font-medium text-ink dark:text-cloud"
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
      <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3 text-left dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Topic</p>
        <p className="text-xs font-medium text-ink dark:text-cloud">Launch update for our scheduling workflow</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {["Educate", "Professional"].map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
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
      <div className="rounded-xl border border-neutral-200 bg-white p-3 text-left dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">LinkedIn preview</p>
        <p className="mt-1 text-xs leading-5 text-ink dark:text-cloud">
          Here&apos;s how we cut drafting time in half while keeping every post on-brand.
        </p>
        <span className="mt-2.5 inline-flex rounded-full bg-forge px-2.5 py-1 text-[10px] font-medium text-white">
          Publish Now
        </span>
      </div>
    ),
  },
] as const;

const adapterDemos = {
  linkedin: {
    platform: "LinkedIn",
    user: "Abhishek Garg",
    role: "Founder, PostForge AI",
    avatar: "/postforge.png",
    text: `🚀 Big news! We are thrilled to announce the official launch of PostForge AI.

PostForge AI is a multi-platform content creation and scheduling tool powered by Gemini AI. It allows you to draft once and tailor the tone, hashtags, and formatting specifically for every platform in one seamless workflow.

Say goodbye to copying and pasting. Connect your accounts, customize your brand voice, and scale your reach.

👉 Get started today at postforge.ai

#SocialMediaMarketing #AIContent #SaaSLaunch #Productivity`,
  },
  twitter: {
    platform: "X / Twitter",
    user: "@abhishekgarg",
    role: "Posting from PostForge",
    avatar: "/postforge.png",
    text: `Announcing PostForge AI! 🚀

Draft once, forge posts for every platform. Connect your accounts, generate tailored content with Gemini AI, and schedule in seconds. No more copying and pasting.

Get started at postforge.ai 👇`,
  },
  facebook: {
    platform: "Facebook",
    user: "PostForge AI Workspace",
    role: "Just now • Public",
    avatar: "/postforge.png",
    text: `✨ Announcing PostForge AI! ✨

We're super excited to introduce PostForge AI, the easiest way to write once and post everywhere. 🚀

With built-in Gemini AI, PostForge automatically tailors your post for LinkedIn, X, and Facebook so it matches the vibe of each platform. Connect your accounts and publish on your schedule!

Learn more at postforge.ai 🔗`,
  },
};

function HeroContent() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 md:pb-28 md:pt-24">
      {/* Background Radial Glow */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 flex justify-center overflow-hidden"
        aria-hidden
      >
        <div className="h-[500px] w-[800px] rounded-full bg-gradient-forge opacity-[0.12] blur-[120px]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="space-y-8 text-center lg:text-left">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-forge/20 bg-forge/5 px-3 py-1 text-xs font-semibold text-forge">
              <SparklesIcon className="size-3.5 animate-pulse" />
              Invite-Only Creator Workspace
            </div>
            <GradientText
              as="h1"
              className="font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]"
            >
              PostForge AI
            </GradientText>
          </motion.div>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
            className="mx-auto max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-400 lg:mx-0 md:text-lg"
          >
            Write once, forge posts for every platform. PostForge adapts your copy for LinkedIn, X, and Facebook in one single flow.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.16 }}
            className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start"
          >
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              className="h-12 min-w-48 bg-gradient-forge text-sm font-semibold text-white shadow-lg shadow-forge/20 transition-all hover:scale-[1.02] hover:opacity-95 active:scale-[0.98]"
            >
              Access Workspace
              <ArrowRightIcon className="ml-1.5 size-4" />
            </Button>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Authorized personnel only.
            </p>
          </motion.div>

          {/* Core metrics */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="grid grid-cols-3 gap-4 border-t border-neutral-200/60 pt-8 dark:border-neutral-800 max-w-md mx-auto lg:mx-0"
          >
            <div>
              <p className="text-xl font-bold text-ink dark:text-cloud md:text-2xl">10x</p>
              <p className="text-xs text-neutral-500">Drafting Speed</p>
            </div>
            <div>
              <p className="text-xl font-bold text-ink dark:text-cloud md:text-2xl">100%</p>
              <p className="text-xs text-neutral-500">Tailored Copy</p>
            </div>
            <div>
              <p className="text-xl font-bold text-ink dark:text-cloud md:text-2xl">1 Click</p>
              <p className="text-xs text-neutral-500">Auto-Publish</p>
            </div>
          </motion.div>
        </div>

        <HeroGenerationDemo />
      </div>
    </section>
  );
}

export function MarketingHome() {
  const [activeTab, setActiveTab] = useState<keyof typeof adapterDemos>("linkedin");
  const reduceMotion = useReducedMotion();

  return (
    <PageTransition className="min-h-full bg-cloud dark:bg-neutral-950">
      <div className="flex min-h-full flex-col">
        {/* Navigation bar */}
        <header className="sticky top-0 z-20 border-b border-neutral-200/80 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md dark:border-neutral-900">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-16">
            <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold text-ink dark:text-cloud">
              <img src="/postforge.png" alt="PostForge Logo" className="size-8 rounded-lg object-cover shadow-sm" />
              <GradientText as="span">PostForge AI</GradientText>
            </Link>
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              variant="outline"
              className="h-10 px-5 text-sm font-semibold border-neutral-200 dark:border-neutral-800"
            >
              Log In
            </Button>
          </div>
        </header>

        <main className="flex-1">
          <HeroContent />

          {/* Interactive Showcase Section */}
          <section className="border-t border-neutral-200 bg-white px-4 py-16 dark:border-neutral-900 dark:bg-neutral-900/30 md:py-24">
            <div className="mx-auto max-w-4xl">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-ink dark:text-cloud md:text-3xl">
                  Tailored specifically for each platform
                </h2>
                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400 md:text-base">
                  PostForge doesn&apos;t just copy-paste. It utilizes Gemini AI to reconstruct the same prompt into the ideal native format.
                </p>
              </div>

              {/* Interactive Tabs */}
              <div className="mt-10 flex flex-col items-stretch gap-6 md:flex-row">
                <div className="flex flex-row justify-center gap-1.5 md:flex-col md:justify-start md:w-56 shrink-0">
                  {(Object.keys(adapterDemos) as Array<keyof typeof adapterDemos>).map((key) => {
                    const platformData = adapterDemos[key];
                    const isActive = activeTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={cn(
                          "flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all border w-full text-left justify-start md:text-sm",
                          isActive
                            ? "bg-gradient-forge text-white border-transparent shadow-md shadow-forge/15"
                            : "bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
                        )}
                      >
                        {key === "linkedin" && <LinkedinIcon className="size-4" />}
                        {key === "twitter" && (
                          <span className="size-4 flex items-center justify-center font-bold font-mono">X</span>
                        )}
                        {key === "facebook" && <FacebookIcon className="size-4" />}
                        {platformData.platform}
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 rounded-2xl border border-neutral-200 bg-cloud dark:border-neutral-800 dark:bg-neutral-950 p-4 md:p-6 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest bg-neutral-200/50 dark:bg-neutral-800/80 px-2 py-0.5 rounded">
                      Preview
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={reduceMotion ? false : { opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduceMotion ? false : { opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <img src={adapterDemos[activeTab].avatar} alt={adapterDemos[activeTab].user} className="size-10 rounded-full object-cover shadow-sm border border-neutral-200/40 dark:border-neutral-800/40" />
                        <div>
                          <h4 className="text-sm font-bold text-ink dark:text-cloud">
                            {adapterDemos[activeTab].user}
                          </h4>
                          <p className="text-[11px] text-neutral-500">
                            {adapterDemos[activeTab].role}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-neutral-200/50 dark:border-neutral-800/60 pt-4">
                        <p className="text-xs md:text-sm text-ink dark:text-neutral-300 whitespace-pre-wrap leading-6 font-normal">
                          {adapterDemos[activeTab].text}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="border-t border-neutral-200/80 bg-cloud dark:border-neutral-900 dark:bg-neutral-950/20 px-4 py-16 md:py-24">
            <div className="mx-auto max-w-6xl">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-ink dark:text-cloud md:text-3xl">
                  Features that forge results
                </h2>
                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400 md:text-base">
                  All-in-one publishing system built with absolute simplicity and speed in mind.
                </p>
              </div>

              <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
                {features.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <article
                      key={feature.title}
                      className="group relative rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <div className={cn(
                        "mb-5 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm bg-gradient-forge"
                      )}>
                        <Icon className="size-5 transition-transform group-hover:scale-110" aria-hidden />
                      </div>
                      <h3 className="text-lg font-bold text-ink dark:text-cloud">
                        {feature.title}
                      </h3>
                      <p className="mt-2.5 text-xs leading-5 text-neutral-500 dark:text-neutral-400 md:text-sm">
                        {feature.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="border-t border-neutral-200 bg-white dark:border-neutral-900 dark:bg-neutral-900/10 px-4 py-16 md:py-24">
            <div className="mx-auto max-w-6xl">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-ink dark:text-cloud md:text-3xl">
                  Simple 3-step workflow
                </h2>
                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400 md:text-base">
                  Get your message out to all social networks in less than a minute.
                </p>
              </div>

              <ol className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
                {steps.map((step, index) => (
                  <li
                    key={step.number}
                    className={cn(
                      "relative rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 shadow-sm",
                      index < steps.length - 1 &&
                        "md:after:absolute md:after:left-full md:after:top-1/2 md:after:hidden md:after:h-px md:after:w-8 md:after:-translate-y-1/2 md:after:bg-neutral-200 dark:md:after:bg-neutral-800 lg:after:block",
                    )}
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-forge/10 font-mono text-xs font-bold text-forge dark:bg-forge/20">
                      {step.number}
                    </span>
                    <h3 className="mt-4 text-base font-bold text-ink dark:text-cloud">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                      {step.description}
                    </p>
                    <div className="mt-5">{step.preview}</div>
                  </li>
                ))}
              </ol>

              <div className="mt-12 flex justify-center">
                <Button
                  render={<Link href="/login" />}
                  nativeButton={false}
                  className="h-12 min-w-48 bg-gradient-forge text-sm font-semibold text-white shadow-lg shadow-forge/20 hover:opacity-95"
                >
                  Enter Workspace
                </Button>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-200 bg-white px-4 py-10 dark:border-neutral-900 dark:bg-neutral-950">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <img src="/postforge.png" alt="PostForge Logo" className="size-6 rounded-md object-cover shadow-sm" />
                <p className="font-heading text-base font-bold text-ink dark:text-cloud">
                  <GradientText as="span">PostForge AI</GradientText>
                </p>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Forge once. Publish everywhere. Built with Next.js & Gemini AI.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-xs font-semibold text-forge hover:underline min-h-11 flex items-center"
              >
                Access Dashboard
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
