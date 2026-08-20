"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { format, addDays, isWeekend } from "date-fns";
import {
  Sparkles,
  Check,
  Plus,
  Trash2,
  Calendar,
  X,
  RefreshCw,
  Eye,
  AlertTriangle,
  Square,
  CheckSquare,
  FileText,
  Sliders,
  Play,
  ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { cn, convertLocalToUtc, convertUtcToLocalString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader, SectionSkeleton } from "@/components/ui/loaders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/types/platforms";
import { formatPlatformLabel, type PostResponse } from "@/lib/posts/serialize";
import { PlatformChip } from "@/components/posts/platform-chip";
import type { AccountSummary } from "@/lib/accounts/serialize";
import type { MediaResponse } from "@/lib/media/serialize";
import { STYLES, FORMATS, AUDIENCES } from "@/lib/validation/ai";
import type { PostGoal } from "@/lib/validation/ai";
import type { PostTone } from "@/lib/validation/posts";

type GeneratedPost = {
  id: string;
  topic: string;
  category: string;
  subtopic: string;
  format: string;
  targetAudience: string;
  contentAngle: string;
  platformContent: Partial<Record<SocialPlatform, string>>;
  scheduledAt: string; // YYYY-MM-DDTHH:mm local string
  selected: boolean;
  isRegenerating: boolean;
  imageUrl?: string;
  mediaLibraryId?: string;
  isGeneratingImage: boolean;
  imageStatus: "pending" | "success" | "failed" | "none";
  isTimeCustomized: boolean;
};

function addWeekdays(startDate: Date, daysToAdd: number): Date {
  let date = new Date(startDate);
  let count = 0;
  while (count < daysToAdd) {
    date = addDays(date, 1);
    if (!isWeekend(date)) {
      count++;
    }
  }
  return date;
}

function calculateScheduledTime(
  start: Date,
  index: number,
  intervalType: string,
  customDays: number
): Date {
  let date = new Date(start);
  if (index === 0) {
    if (intervalType === "every_weekday" && isWeekend(date)) {
      while (isWeekend(date)) {
        date = addDays(date, 1);
      }
    }
    return date;
  }

  if (intervalType === "every_weekday") {
    return addWeekdays(date, index);
  } else {
    let days = 1;
    if (intervalType === "every_2_days") days = 2;
    else if (intervalType === "every_3_days") days = 3;
    else if (intervalType === "custom") days = customDays;

    return addDays(date, index * days);
  }
}

type FailedGeneration = {
  planIndex: number;
  topic: string;
  reason: string;
};

export default function StudioPage() {
  const router = useRouter();
  const [connectedPlatforms, setConnectedPlatforms] = useState<SocialPlatform[]>([]);
  const [userTimezone, setUserTimezone] = useState("UTC");

  // Section 1 - Topics
  const [topicInput, setTopicInput] = useState("");
  const [topics, setTopics] = useState<string[]>([]);

  // Section 2 - Settings
  const [count, setCount] = useState(10);
  const [style, setStyle] = useState<string>("Professional");
  const [selectedFormat, setSelectedFormat] = useState<string>("Auto Select");
  const [targetAudience, setTargetAudience] = useState<string>("Auto");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["linkedin"]);
  const [generateImages, setGenerateImages] = useState(false);

  // Section 3 - Generation State
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState("");
  const [succeededPosts, setSucceededPosts] = useState<GeneratedPost[]>([]);
  const [failedPosts, setFailedPosts] = useState<FailedGeneration[]>([]);

  // Section 4 - Actions
  const [isQueueing, setIsQueueing] = useState(false);
  const [previewPostId, setPreviewPostId] = useState<string | null>(null);

  // Scheduling State
  const [scheduleMode, setScheduleMode] = useState<"manual" | "auto">("auto");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [intervalType, setIntervalType] = useState<"every_day" | "every_2_days" | "every_3_days" | "every_weekday" | "custom">("every_day");
  const [customIntervalDays, setCustomIntervalDays] = useState(2);

  // Initialize
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [accounts, me] = await Promise.all([
          apiClient<AccountSummary[]>("/api/accounts"),
          apiClient<{ timezone: string }>("/api/auth/me").catch(() => ({ timezone: "UTC" })),
        ]);

        const connected = accounts
          .filter((acc) => acc.isConnected)
          .map((acc) => acc.platform);

        setConnectedPlatforms(connected);
        if (connected.length > 0) {
          setPlatforms([connected[0]]);
        }
        const tz = me.timezone || "UTC";
        setUserTimezone(tz);

        const tomorrow = addDays(new Date(), 1);
        const tomorrowLocalString = convertUtcToLocalString(tomorrow, tz);
        setStartDate(tomorrowLocalString.split("T")[0] || "");
      } catch (error) {
        toast.error("Unable to load account context");
      } finally {
        setIsLoading(false);
      }
    }
    void loadData();
  }, []);

  // Recompute schedules when Auto Schedule parameters change
  useEffect(() => {
    if (scheduleMode === "manual") {
      return;
    }

    if (succeededPosts.length === 0 || !startDate || !startTime) return;

    const start = new Date(`${startDate}T${startTime}`);
    if (Number.isNaN(start.getTime())) return;

    setSucceededPosts((current) =>
      current.map((post, index) => {
        if (post.isTimeCustomized) return post;

        const calculatedDate = calculateScheduledTime(start, index, intervalType, customIntervalDays);
        const scheduledString = convertUtcToLocalString(calculatedDate, userTimezone);

        return {
          ...post,
          scheduledAt: scheduledString.slice(0, 16), // YYYY-MM-DDTHH:mm
        };
      })
    );
  }, [startDate, startTime, intervalType, customIntervalDays, userTimezone, scheduleMode, succeededPosts.length]);

  // Parse topics
  const handleParseTopics = () => {
    if (!topicInput.trim()) return;
    const parsed = topicInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const merged = [...topics];
    for (const t of parsed) {
      if (!merged.some((existing) => existing.toLowerCase() === t.toLowerCase())) {
        merged.push(t);
      }
    }
    setTopics(merged);
    setTopicInput("");
  };

  const handleRemoveTopic = (index: number) => {
    setTopics((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTogglePlatform = (platform: SocialPlatform) => {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  // Bulk generation trigger
  const handleGenerateBatch = async (topicsList = topics, batchCount = count) => {
    if (topicsList.length === 0) {
      toast.error("Please add at least one topic first.");
      return;
    }
    if (platforms.length === 0) {
      toast.error("Please select at least one target platform.");
      return;
    }

    setIsGenerating(true);
    setSucceededPosts([]);
    setFailedPosts([]);

    const phases = [
      "Analyzing topics…",
      "Planning content…",
      "Writing posts…",
      "Checking for duplicates…",
      "Done"
    ];

    // Simple progress simulation overlaying the sequential call stages
    let phaseIndex = 0;
    setGenerationPhase(phases[phaseIndex] || "");
    const interval = setInterval(() => {
      if (phaseIndex < phases.length - 2) {
        phaseIndex++;
        setGenerationPhase(phases[phaseIndex] || "");
      }
    }, 2800);

    try {
      const response = await apiClient<{
        posts: {
          topic: string;
          category: string;
          subtopic: string;
          format: string;
          targetAudience: string;
          contentAngle: string;
          platformContent: Record<SocialPlatform, string>;
          imageUrl?: string;
          mediaLibraryId?: string;
          imageStatus?: "pending" | "success" | "failed" | "none";
        }[];
        failed: FailedGeneration[];
      }>("/api/ai/generate-batch", {
        method: "POST",
        body: JSON.stringify({
          topics: topicsList,
          count: batchCount,
          style,
          format: selectedFormat,
          targetAudience,
          platforms,
          generateImages,
        }),
      });

      clearInterval(interval);
      setGenerationPhase("Done");

      // Spaced dates starting based on Auto Schedule parameters
      const start = new Date(`${startDate}T${startTime}`);
      const items: GeneratedPost[] = response.posts.map((post, index) => {
        let calculatedDate = start;
        if (scheduleMode === "auto" && !Number.isNaN(start.getTime())) {
          calculatedDate = calculateScheduledTime(start, index, intervalType, customIntervalDays);
        }
        const scheduledString = convertUtcToLocalString(calculatedDate, userTimezone);

        return {
          id: `post-${index}-${Date.now()}`,
          ...post,
          scheduledAt: scheduledString.slice(0, 16),
          selected: true,
          isRegenerating: false,
          isGeneratingImage: false,
          imageStatus: post.imageStatus || "none",
          isTimeCustomized: false,
        };
      });

      setSucceededPosts(items);
      setFailedPosts(response.failed || []);

      if (response.failed?.length > 0) {
        toast.warning(`${response.failed.length} posts failed to generate.`);
      } else {
        toast.success(`Successfully generated ${items.length} campaign posts!`);
      }
    } catch (error) {
      clearInterval(interval);
      toast.error(error instanceof Error ? error.message : "Batch generation failed.");
    } finally {
      setIsGenerating(false);
      setGenerationPhase("");
    }
  };

  // Retry failed posts
  const handleRetryFailed = async () => {
    const failedTopics = failedPosts.map((f) => f.topic);
    if (failedTopics.length === 0) return;
    await handleGenerateBatch(failedTopics, failedPosts.length);
  };

  // Post level actions
  const handleRegeneratePost = async (postId: string) => {
    const post = succeededPosts.find((p) => p.id === postId);
    if (!post) return;

    setSucceededPosts((current) =>
      current.map((p) => (p.id === postId ? { ...p, isRegenerating: true } : p))
    );

    try {
      const generatedCopy = await apiClient<{ content: string }>("/api/ai/generate-text", {
        method: "POST",
        body: JSON.stringify({
          platform: platforms[0] || "linkedin",
          tone: style.toLowerCase() as PostTone,
          topic: `Topic: ${post.topic}. Content Angle: ${post.contentAngle}. Target Audience: ${post.targetAudience}. Format: ${post.format}. Write a post.`,
          goal: "educate" as PostGoal,
        }),
      });

      setSucceededPosts((current) =>
        current.map((p) =>
          p.id === postId
            ? {
                ...p,
                platformContent: { ...p.platformContent, [platforms[0] || "linkedin"]: generatedCopy.content },
              }
            : p
        )
      );
      toast.success("Post copy regenerated successfully!");
    } catch (error) {
      toast.error("Failed to regenerate post copy.");
    } finally {
      setSucceededPosts((current) =>
        current.map((p) => (p.id === postId ? { ...p, isRegenerating: false } : p))
      );
    }
  };

  const handleGenerateImageForPost = async (postId: string) => {
    const post = succeededPosts.find((p) => p.id === postId);
    if (!post) return;

    const imgPrompt = `A high quality, professional, conceptual modern graphic representing: ${post.topic}`;

    setSucceededPosts((current) =>
      current.map((p) =>
        p.id === postId ? { ...p, isGeneratingImage: true, imageStatus: "pending" } : p
      )
    );

    try {
      const imgRes = await apiClient<MediaResponse>("/api/ai/generate-image", {
        method: "POST",
        body: JSON.stringify({ prompt: imgPrompt }),
      });

      setSucceededPosts((current) =>
        current.map((p) =>
          p.id === postId
            ? {
                ...p,
                imageUrl: imgRes.fileUrl,
                mediaLibraryId: imgRes.id,
                imageStatus: "success",
              }
            : p
        )
      );
      toast.success("Visual graphic generated!");
    } catch (error) {
      setSucceededPosts((current) =>
        current.map((p) => (p.id === postId ? { ...p, imageStatus: "failed" } : p))
      );
      toast.error(error instanceof Error ? error.message : "Graphic generation failed");
    } finally {
      setSucceededPosts((current) =>
        current.map((p) => (p.id === postId ? { ...p, isGeneratingImage: false } : p))
      );
    }
  };

  const handleDeletePost = (postId: string) => {
    setSucceededPosts((current) => current.filter((p) => p.id !== postId));
  };

  const handleToggleSelectPost = (postId: string) => {
    setSucceededPosts((current) =>
      current.map((p) => (p.id === postId ? { ...p, selected: !p.selected } : p))
    );
  };

  // Bulk actions toolbar
  const handleSelectAll = (select: boolean) => {
    setSucceededPosts((current) => current.map((p) => ({ ...p, selected: select })));
  };

  const handleDeleteSelected = () => {
    setSucceededPosts((current) => current.filter((p) => !p.selected));
    toast.success("Selected items deleted from view.");
  };

  const handleRegenerateSelected = async () => {
    const selected = succeededPosts.filter((p) => p.selected);
    for (const item of selected) {
      await handleRegeneratePost(item.id);
    }
  };

  // Save selected to database & scheduler
  const handleAddSelectedToQueue = async () => {
    const selected = succeededPosts.filter((p) => p.selected);
    if (selected.length === 0) {
      toast.error("Please select at least one post to queue.");
      return;
    }

    if (scheduleMode === "auto") {
      for (const item of selected) {
        const scheduleDate = convertLocalToUtc(item.scheduledAt, userTimezone);
        if (scheduleDate <= new Date()) {
          toast.error(`Post for topic "${item.topic}" is scheduled in the past (${item.scheduledAt}). Please reschedule it to a future date.`);
          return;
        }
      }
    }

    setIsQueueing(true);
    let queuedCount = 0;

    try {
      for (const item of selected) {
        const primaryContent = platforms
          .map((p) => item.platformContent[p])
          .find(Boolean) || "";

        const scheduleDate = convertLocalToUtc(item.scheduledAt, userTimezone);

        await apiClient<PostResponse>("/api/posts", {
          method: "POST",
          body: JSON.stringify({
            content: primaryContent,
            aiPrompt: `Studio Campaign: ${item.topic} | Angle: ${item.contentAngle}`,
            platforms,
            platformContent: item.platformContent,
            imageUrl: item.imageUrl,
            mediaLibraryId: item.mediaLibraryId,
            status: scheduleMode === "auto" ? "scheduled" : "draft",
            scheduledAt: scheduleMode === "auto" ? scheduleDate.toISOString() : undefined,
            timezone: userTimezone,
            topic: item.topic,
            category: item.category,
            subtopic: item.subtopic,
            format: item.format,
            imageStatus: item.imageStatus || "none",
          }),
        });
        queuedCount++;
      }

      toast.success(
        scheduleMode === "auto"
          ? `Successfully added ${queuedCount} posts to your scheduling queue!`
          : `Successfully saved ${queuedCount} posts as drafts!`
      );
      router.push("/posts");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save bulk campaign posts");
    } finally {
      setIsQueueing(false);
    }
  };

  const updatePostContent = (postId: string, platform: SocialPlatform, text: string) => {
    setSucceededPosts((current) =>
      current.map((p) =>
        p.id === postId
          ? {
              ...p,
              platformContent: { ...p.platformContent, [platform]: text },
            }
          : p
      )
    );
  };

  const updatePostSchedule = (postId: string, dateStr: string) => {
    setSucceededPosts((current) =>
      current.map((p) => (p.id === postId ? { ...p, scheduledAt: dateStr, isTimeCustomized: true } : p))
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <SectionSkeleton rows={1} rowClassName="h-8 w-48" />
        <SectionSkeleton rows={6} rowClassName="h-20 rounded-xl" />
      </div>
    );
  }

  const selectedCount = succeededPosts.filter((p) => p.selected).length;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">AI Content Studio</h1>
        <p className="text-sm text-muted-foreground">
          Batch generate structured social posts from a list of topics.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Settings column */}
        <div className="xl:col-span-1 space-y-6">
          {/* Section 1 - Topics */}
          <Card className="border-forge/30 ring-1 ring-forge/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1. Comma-separated topics</CardTitle>
              <CardDescription>Enter multiple keywords or campaigns to distribute.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Textarea
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="e.g. AI, Angular, Cybersecurity, Cloud Computing"
                  rows={2}
                  className="text-xs"
                  onBlur={handleParseTopics}
                />
                <Button type="button" variant="secondary" className="h-auto" onClick={handleParseTopics}>
                  <Plus className="size-4" />
                </Button>
              </div>

              {/* Topics chips rendering */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {topics.map((t, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1 bg-forge/10 border border-forge/20 text-ink text-xs font-semibold px-2.5 py-1 rounded-full"
                  >
                    {t}
                    <button type="button" onClick={() => handleRemoveTopic(index)}>
                      <X className="size-3 text-neutral-500 hover:text-red-500" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 2 - Settings */}
          <Card className="border-forge/30 ring-1 ring-forge/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2. Campaign parameters</CardTitle>
              <CardDescription>Target platforms, format variations, and styles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Count */}
              <div>
                <Label htmlFor="post-count" className="text-xs">Post count (1-20)</Label>
                <Input
                  id="post-count"
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="h-10 text-xs"
                />
              </div>

              {/* Style */}
              <div>
                <Label className="text-xs">Campaign style</Label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-forge"
                >
                  {STYLES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Format */}
              <div>
                <Label className="text-xs">Format layout</Label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-forge"
                >
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Audience */}
              <div>
                <Label className="text-xs">Target audience</Label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-forge"
                >
                  {AUDIENCES.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Platforms */}
              <div className="space-y-2">
                <Label className="text-xs">Platforms</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <PlatformChip
                      key={platform}
                      platform={platform}
                      selected={platforms.includes(platform)}
                      disabled={!connectedPlatforms.includes(platform)}
                      onToggle={() => handleTogglePlatform(platform)}
                    />
                  ))}
                </div>
              </div>

              {/* Image Toggle */}
              <div className="flex items-center justify-between gap-4 rounded-xl border p-4 bg-neutral-50/50">
                <div className="space-y-0.5">
                  <Label htmlFor="image-toggle" className="text-xs font-semibold">Generate Image</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Generates a conceptual AI graphic on results review card.
                  </p>
                </div>
                <input
                  id="image-toggle"
                  type="checkbox"
                  checked={generateImages}
                  onChange={(e) => setGenerateImages(e.target.checked)}
                  className="rounded text-forge focus:ring-forge size-4"
                />
              </div>

              {/* Scheduling Options */}
              <div className="space-y-3 pt-3 border-t">
                <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Scheduling Options
                </Label>
                <div>
                  <Label className="text-xs">Schedule Mode</Label>
                  <select
                    value={scheduleMode}
                    onChange={(e) => setScheduleMode(e.target.value as "manual" | "auto")}
                    className="w-full h-10 px-3 text-xs bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-forge"
                  >
                    <option value="auto">Auto Schedule</option>
                    <option value="manual">Manual (Save as Drafts)</option>
                  </select>
                </div>

                {scheduleMode === "auto" && (
                  <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="start-date" className="text-[11px]">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-10 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="start-time" className="text-[11px]">Start Time</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="h-10 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px]">Timezone</Label>
                      <Input
                        type="text"
                        disabled
                        value={userTimezone}
                        className="h-10 text-xs bg-neutral-50 text-neutral-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Interval</Label>
                      <select
                        value={intervalType}
                        onChange={(e) => setIntervalType(e.target.value as any)}
                        className="w-full h-10 px-3 text-xs bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-forge"
                      >
                        <option value="every_day">Every day</option>
                        <option value="every_2_days">Every 2 days</option>
                        <option value="every_3_days">Every 3 days</option>
                        <option value="every_weekday">Every weekday</option>
                        <option value="custom">Custom days</option>
                      </select>
                    </div>

                    {intervalType === "custom" && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        <Label htmlFor="custom-days" className="text-[11px]">Number of days</Label>
                        <Input
                          id="custom-days"
                          type="number"
                          min={1}
                          max={30}
                          value={customIntervalDays}
                          onChange={(e) => setCustomIntervalDays(Number(e.target.value))}
                          className="h-10 text-xs"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3 - Generate button */}
              <Button
                type="button"
                className="w-full h-11 bg-gradient-forge text-white"
                disabled={isGenerating || isQueueing || topics.length === 0}
                onClick={() => handleGenerateBatch()}
              >
                {isGenerating ? (
                  <>
                    <Loader size="sm" className="mr-2" />
                    {generationPhase}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Generate {count} Campaign Posts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Succeeded lists */}
          {succeededPosts.length === 0 && !isGenerating ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed min-h-[50vh]">
              <Sliders className="size-12 text-neutral-300 mb-4" />
              <CardTitle className="text-lg">Content Workspace empty</CardTitle>
              <CardDescription className="max-w-xs mt-1">
                Configure settings and topics in the planner list to start generating your LinkedIn batch copy.
              </CardDescription>
            </Card>
          ) : isGenerating ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed min-h-[50vh]">
              <Loader size="lg" className="text-forge mb-4" />
              <CardTitle className="text-lg">{generationPhase}</CardTitle>
              <CardDescription className="max-w-xs mt-1">
                Gemini is building your post plans and writing tailored social posts in a rotation sequence...
              </CardDescription>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Failures notification */}
              {failedPosts.length > 0 && (
                <div className="flex items-center justify-between gap-4 p-4 border border-amber-300 bg-amber-50 rounded-2xl text-amber-900 text-xs">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <strong>{failedPosts.length} posts failed to generate.</strong> Topic rotation encountered rate limits.
                  </span>
                  <Button type="button" size="sm" variant="secondary" onClick={handleRetryFailed}>
                    <RefreshCw className="mr-1.5 size-3" /> Retry Failed
                  </Button>
                </div>
              )}

              {/* Bulk Toolbar */}
              <Card className="border-forge/20 bg-cloud/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-3.5 px-5">
                  <div className="flex items-center gap-3 text-xs font-semibold text-neutral-600">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(selectedCount !== succeededPosts.length)}
                      className="flex items-center gap-1.5 hover:text-forge transition-colors"
                    >
                      {selectedCount === succeededPosts.length ? (
                        <CheckSquare className="size-4 text-forge" />
                      ) : (
                        <Square className="size-4" />
                      )}
                      Select All
                    </button>
                    <button type="button" className="hover:text-forge" onClick={() => handleSelectAll(false)}>
                      Clear
                    </button>
                    <span className="text-forge bg-forge/10 px-2 py-0.5 rounded-full">
                      {selectedCount} of {succeededPosts.length} selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={selectedCount === 0}
                      onClick={handleRegenerateSelected}
                    >
                      <RefreshCw className="mr-1 size-3" /> Regenerate Selected
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs hover:bg-red-50 hover:text-red-600"
                      disabled={selectedCount === 0}
                      onClick={handleDeleteSelected}
                    >
                      <Trash2 className="mr-1 size-3" /> Delete Selected
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="text-xs bg-gradient-forge text-white"
                      disabled={isQueueing || selectedCount === 0}
                      onClick={handleAddSelectedToQueue}
                    >
                      {isQueueing ? (
                        <>
                          <Loader size="sm" className="mr-1" /> Queueing...
                        </>
                      ) : (
                        <>
                          <Calendar className="mr-1 size-3" /> Add Selected to Queue
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Cards List */}
              <div className="space-y-4">
                {succeededPosts.map((post, index) => {
                  return (
                    <Card
                      key={post.id}
                      className={cn(
                        "relative transition-all",
                        post.selected ? "border-forge/40 ring-1 ring-forge/10" : "border-neutral-200"
                      )}
                    >
                      <CardHeader className="pb-3 border-b border-neutral-100/60">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => handleToggleSelectPost(post.id)}>
                              {post.selected ? (
                                <CheckSquare className="size-5 text-forge" />
                              ) : (
                                <Square className="size-5 text-neutral-300" />
                              )}
                            </button>
                            <div>
                              <span className="text-[10px] font-bold text-forge uppercase tracking-widest bg-forge/10 px-2 py-0.5 rounded">
                                Post {index + 1}
                              </span>
                              <CardTitle className="text-base mt-1 line-clamp-1">{post.topic}</CardTitle>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <PostStatusBadge status="draft" />
                          </div>
                        </div>

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 text-[10px] text-neutral-500 font-semibold uppercase tracking-wide">
                          <span>Format: {post.format}</span>
                          <span>·</span>
                          <span>Audience: {post.targetAudience}</span>
                          <span>·</span>
                          <span>Angle: {post.contentAngle}</span>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4 space-y-4">
                        {/* Editor tabs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Text Copy */}
                          <div className="md:col-span-2 space-y-3">
                            <Tabs defaultValue={platforms[0]}>
                              <TabsList className="bg-neutral-100 p-1 w-full justify-start h-9">
                                {platforms.map((p) => (
                                  <TabsTrigger key={p} value={p} className="text-xs h-7 px-3">
                                    {formatPlatformLabel(p)}
                                  </TabsTrigger>
                                ))}
                              </TabsList>
                              {platforms.map((p) => {
                                const content = post.platformContent[p] || "";
                                const charCount = content.length;
                                return (
                                  <TabsContent key={p} value={p} className="space-y-1 pt-1">
                                    <Textarea
                                      value={content}
                                      onChange={(e) => updatePostContent(post.id, p, e.target.value)}
                                      rows={7}
                                      className="text-xs bg-white"
                                    />
                                    <div className="text-right text-[10px] text-neutral-400 font-mono">
                                      {charCount.toLocaleString()} characters
                                    </div>
                                  </TabsContent>
                                );
                              })}
                            </Tabs>
                          </div>

                          {/* Image Box */}
                          <div className="md:col-span-1 flex flex-col justify-between border border-neutral-150 rounded-2xl p-4 bg-cloud/50 min-h-[180px]">
                            <div>
                              <Label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1 pb-1.5 border-b">
                                <ImageIcon className="size-3 text-forge" /> Shared Graphic
                              </Label>
                              {post.isGeneratingImage || post.imageStatus === "pending" ? (
                                <div className="mt-3 flex flex-col items-center justify-center gap-1 border border-dashed rounded-xl p-4 min-h-[100px]">
                                  <Loader size="sm" className="text-forge" />
                                  <p className="text-[9px] text-neutral-400">Forging graphic visual...</p>
                                </div>
                              ) : post.imageUrl ? (
                                <div className="mt-3 relative rounded-xl overflow-hidden border bg-white group">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={post.imageUrl} alt="AI visual preview" className="w-full max-h-24 object-contain" />
                                  <button
                                    type="button"
                                    onClick={() => setSucceededPosts((current) => current.map((p) => p.id === post.id ? { ...p, imageUrl: undefined, mediaLibraryId: undefined, imageStatus: "none" } : p))}
                                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                              ) : post.imageStatus === "failed" ? (
                                <div className="mt-3 flex flex-col items-center justify-center gap-2 border border-dashed border-red-300 rounded-xl p-4 text-center min-h-[100px] bg-red-50/35">
                                  <AlertTriangle className="size-4 text-red-500" />
                                  <p className="text-[9px] text-red-700 font-semibold">Image generation failed</p>
                                </div>
                              ) : (
                                <div className="mt-3 flex flex-col items-center justify-center border border-dashed rounded-xl p-4 text-center min-h-[90px]">
                                  <p className="text-[9px] text-neutral-400">No graphic visual.</p>
                                </div>
                              )}
                            </div>

                            {post.imageStatus === "failed" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="w-full mt-2 h-8 text-[10px] bg-red-100 text-red-700 hover:bg-red-200 border-transparent"
                                onClick={() => handleGenerateImageForPost(post.id)}
                              >
                                <RefreshCw className="mr-1 size-3 text-red-600" /> Retry Image
                              </Button>
                            ) : !post.imageUrl && !post.isGeneratingImage && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="w-full mt-2 h-8 text-[10px]"
                                onClick={() => handleGenerateImageForPost(post.id)}
                              >
                                <Sparkles className="mr-1 size-3 text-forge animate-pulse" /> Generate Graphic
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Date scheduler & actions */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-neutral-100/60 text-xs">
                          {/* Schedule input */}
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-500">Reschedule date:</span>
                            <Input
                              type="datetime-local"
                              value={post.scheduledAt}
                              onChange={(e) => updatePostSchedule(post.id, e.target.value)}
                              className="h-9 text-xs w-48"
                            />
                          </div>

                          {/* Card actions */}
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={post.isRegenerating}
                              onClick={() => handleRegeneratePost(post.id)}
                              className="h-8 text-xs font-semibold text-forge"
                            >
                              <RefreshCw className="mr-1 size-3" /> Regenerate Copy
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewPostId(post.id)}
                              className="h-8 text-xs font-semibold text-neutral-600"
                            >
                              <Eye className="mr-1 size-3" /> Preview
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePost(post.id)}
                              className="h-8 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Button
        render={<Link href="/dashboard" />}
        nativeButton={false}
        variant="ghost"
        className="h-11 w-fit"
      >
        Back to Dashboard
      </Button>

      {/* Preview Dialog */}
      <Dialog open={previewPostId !== null} onOpenChange={(open) => { if (!open) setPreviewPostId(null); }}>
        {previewPostId && (() => {
          const post = succeededPosts.find((p) => p.id === previewPostId);
          if (!post) return null;
          const copy = post.platformContent[platforms[0] || "linkedin"] || "";
          return (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Social Media Preview</DialogTitle>
                <DialogDescription>Review how this post renders on {formatPlatformLabel(platforms[0] || "linkedin")}.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 p-4 border rounded-2xl bg-cloud/20 mt-2">
                {/* Visual rendering simulation */}
                <div className="flex items-center gap-2">
                  <div className="size-9 bg-forge text-white rounded-full flex items-center justify-center font-bold text-sm">PF</div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">PostForge Member</h4>
                    <span className="text-[9px] text-neutral-400">1m · Edited</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{copy}</p>
                {post.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.imageUrl} alt="Visual Attachment" className="w-full rounded-xl border object-contain max-h-64 bg-white" />
                )}
              </div>
              <DialogFooter>
                <Button type="button" className="h-10 text-xs" onClick={() => setPreviewPostId(null)}>
                  Close Preview
                </Button>
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
}

function PostStatusBadge({ status }: { status: string }) {
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600">
      {status}
    </span>
  );
}
