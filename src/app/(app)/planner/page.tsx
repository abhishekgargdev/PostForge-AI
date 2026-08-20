"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { format, addDays } from "date-fns";
import {
  Sparkles,
  Calendar,
  Clock,
  Check,
  Plus,
  Trash2,
  CalendarClock,
  ArrowRight,
  ImageIcon,
  Square,
  CheckSquare,
  ChevronRight,
  FileText
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
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/types/platforms";
import { formatPlatformLabel } from "@/lib/posts/serialize";
import type { AccountSummary } from "@/lib/accounts/serialize";
import type { MediaResponse } from "@/lib/media/serialize";
import { POST_GOALS, POST_GOAL_LABELS, type PostGoal } from "@/lib/validation/ai";
import { POST_TONES, type PostTone } from "@/lib/validation/posts";
import { SparkBurst } from "@/components/ui/spark-burst";

type TopicResponse = {
  id: string;
  text: string;
  isActive: boolean;
};

type GeneratedPostItem = {
  id: string;
  topic: string;
  platformContent: Partial<Record<SocialPlatform, string>>;
  imageUrl?: string;
  mediaLibraryId?: string;
  scheduledAt: string; // local string YYYY-MM-DDTHH:mm
  platforms: SocialPlatform[];
  isGeneratingImage: boolean;
  selected: boolean;
};

export default function PlannerPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicResponse[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [newTopicText, setNewTopicText] = useState("");
  
  const [connectedPlatforms, setConnectedPlatforms] = useState<SocialPlatform[]>([]);
  const [targetPlatforms, setTargetPlatforms] = useState<SocialPlatform[]>([]);
  const [userTimezone, setUserTimezone] = useState("UTC");
  
  // Planner configurations
  const [numPosts, setNumPosts] = useState(5);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [intervalDays, setIntervalDays] = useState(2); // Customizable, default 2 days
  const [tone, setTone] = useState<PostTone>("professional");
  const [goal, setGoal] = useState<PostGoal>("educate");

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPostItem[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [playSpark, setPlaySpark] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");

  const loadPlannerData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allTopics, accounts, me] = await Promise.all([
        apiClient<TopicResponse[]>("/api/topics"),
        apiClient<AccountSummary[]>("/api/accounts"),
        apiClient<{ timezone: string }>("/api/auth/me").catch(() => ({ timezone: "UTC" })),
      ]);

      // Prefill topics
      const activeT = allTopics.filter((t) => t.isActive);
      setTopics(allTopics);
      setSelectedTopics(activeT.map((t) => t.text));

      // Prefill platforms
      const connected = accounts
        .filter((acc) => acc.isConnected)
        .map((acc) => acc.platform);
      setConnectedPlatforms(connected);
      setTargetPlatforms(connected);

      // Timezone
      const tz = me.timezone || "UTC";
      setUserTimezone(tz);

      // Default start date = tomorrow in user timezone
      const tomorrow = addDays(new Date(), 1);
      const tomorrowLocalString = convertUtcToLocalString(tomorrow, tz);
      setStartDate(tomorrowLocalString.split("T")[0] || "");
    } catch (error) {
      toast.error("Unable to initialize planner");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlannerData();
  }, [loadPlannerData]);

  const handleAddCustomTopic = () => {
    if (!newTopicText.trim()) return;
    const text = newTopicText.trim();
    if (!selectedTopics.includes(text)) {
      setSelectedTopics((prev) => [...prev, text]);
    }
    setNewTopicText("");
  };

  const handleToggleTopic = (topicText: string) => {
    setSelectedTopics((current) =>
      current.includes(topicText)
        ? current.filter((t) => t !== topicText)
        : [...current, topicText]
    );
  };

  const handleTogglePlatform = (platform: SocialPlatform) => {
    setTargetPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  const handleGenerateBulk = async () => {
    if (selectedTopics.length === 0) {
      toast.error("Please select or add at least one topic.");
      return;
    }
    if (targetPlatforms.length === 0) {
      toast.error("Please select at least one target platform.");
      return;
    }
    if (!startDate) {
      toast.error("Please select a starting date.");
      return;
    }

    setIsGenerating(true);
    setGeneratedPosts([]);

    try {
      const response = await apiClient<{
        topic: string;
        platformContent: Record<SocialPlatform, string>;
      }[]>("/api/ai/generate-bulk", {
        method: "POST",
        body: JSON.stringify({
          topics: selectedTopics,
          numPosts,
          platforms: targetPlatforms,
          tone,
          goal,
        }),
      });

      // Construct posts with schedule information
      const items: GeneratedPostItem[] = response.map((data, index) => {
        // Calculate scheduled date-time
        const postDate = addDays(new Date(`${startDate}T${startTime}`), index * intervalDays);
        const scheduledAt = convertUtcToLocalString(postDate, userTimezone);

        return {
          id: `gen-${index}-${Date.now()}`,
          topic: data.topic,
          platformContent: data.platformContent,
          scheduledAt,
          platforms: [...targetPlatforms],
          isGeneratingImage: false,
          selected: true,
        };
      });

      setGeneratedPosts(items);
      if (items.length > 0) {
        setActiveTab(items[0].id);
      }
      setPlaySpark(true);
      setTimeout(() => setPlaySpark(false), 600);
      toast.success(`Successfully forged ${items.length} scheduled posts!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImageForPost = async (postId: string) => {
    const post = generatedPosts.find((p) => p.id === postId);
    if (!post) return;

    const primaryContent = post.platforms
      .map((p) => post.platformContent[p])
      .find(Boolean) || "";

    const imgPrompt = `A high quality, professional, conceptual modern graphic representing: ${post.topic}`;

    setGeneratedPosts((current) =>
      current.map((p) => (p.id === postId ? { ...p, isGeneratingImage: true } : p))
    );

    try {
      const imgRes = await apiClient<MediaResponse>("/api/ai/generate-image", {
        method: "POST",
        body: JSON.stringify({ prompt: imgPrompt }),
      });

      setGeneratedPosts((current) =>
        current.map((p) =>
          p.id === postId
            ? { ...p, imageUrl: imgRes.fileUrl, mediaLibraryId: imgRes.id }
            : p
        )
      );
      toast.success("AI Graphic generated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image generation failed");
    } finally {
      setGeneratedPosts((current) =>
        current.map((p) => (p.id === postId ? { ...p, isGeneratingImage: false } : p))
      );
    }
  };

  const handleRemoveImageForPost = (postId: string) => {
    setGeneratedPosts((current) =>
      current.map((p) =>
        p.id === postId ? { ...p, imageUrl: undefined, mediaLibraryId: undefined } : p
      )
    );
  };

  const handleToggleSelectPost = (postId: string) => {
    setGeneratedPosts((current) =>
      current.map((p) => (p.id === postId ? { ...p, selected: !p.selected } : p))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setGeneratedPosts((current) =>
      current.map((p) => ({ ...p, selected: select }))
    );
  };

  const handleSaveSelected = async (status: "scheduled" | "draft") => {
    const selectedItems = generatedPosts.filter((p) => p.selected);
    if (selectedItems.length === 0) {
      toast.error("Please select at least one post to save.");
      return;
    }

    setIsScheduling(true);
    let successCount = 0;

    try {
      for (const item of selectedItems) {
        const primaryContent = item.platforms
          .map((p) => item.platformContent[p])
          .find(Boolean) || "";

        const scheduleDate = convertLocalToUtc(item.scheduledAt, userTimezone);

        await apiClient("/api/posts", {
          method: "POST",
          body: JSON.stringify({
            content: primaryContent,
            aiPrompt: `Bulk Planner Topic: ${item.topic}`,
            platforms: item.platforms,
            platformContent: item.platformContent,
            imageUrl: item.imageUrl,
            mediaLibraryId: item.mediaLibraryId,
            status,
            scheduledAt: scheduleDate.toISOString(),
            timezone: userTimezone,
            topic: item.topic,
            category: goal,
            subtopic: tone,
            format: "text-graphic",
          }),
        });
        successCount++;
      }

      toast.success(`Successfully saved ${successCount} posts as ${status}!`);
      router.push("/posts");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error saving bulk posts");
    } finally {
      setIsScheduling(false);
    }
  };

  const updatePostContent = (postId: string, platform: SocialPlatform, content: string) => {
    setGeneratedPosts((current) =>
      current.map((p) =>
        p.id === postId
          ? {
              ...p,
              platformContent: { ...p.platformContent, [platform]: content },
            }
          : p
      )
    );
  };

  const updatePostSchedule = (postId: string, dateStr: string) => {
    setGeneratedPosts((current) =>
      current.map((p) => (p.id === postId ? { ...p, scheduledAt: dateStr } : p))
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <SectionSkeleton rows={1} rowClassName="h-8 w-56" />
        <SectionSkeleton rows={6} rowClassName="h-20 rounded-xl" />
      </div>
    );
  }

  const selectedCount = generatedPosts.filter((p) => p.selected).length;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">AI Content Planner</h1>
        <p className="text-sm text-muted-foreground">
          Bulk generate, design, and schedule structured social campaigns across your profiles.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="border-forge/30 ring-1 ring-forge/10">
            <CardHeader>
              <CardTitle>Planner settings</CardTitle>
              <CardDescription>Setup topic rules and queue properties.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platforms */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  1. Platforms
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_PLATFORMS.map((platform) => {
                    const isConnected = connectedPlatforms.includes(platform);
                    const isSelected = targetPlatforms.includes(platform);
                    return (
                      <button
                        key={platform}
                        type="button"
                        disabled={!isConnected || isGenerating || isScheduling}
                        onClick={() => handleTogglePlatform(platform)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          isSelected
                            ? "bg-forge text-white border-transparent"
                            : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                        } ${!isConnected && "opacity-40 cursor-not-allowed"}`}
                      >
                        {isSelected && <Check className="size-3" />}
                        {formatPlatformLabel(platform)}
                        {!isConnected && <span className="text-[9px] text-neutral-400 font-normal">(not connected)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topics checklists */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  2. Select Content Topics
                </Label>
                <div className="max-h-48 overflow-y-auto border border-neutral-100 rounded-xl p-3 bg-neutral-50 space-y-2">
                  {topics.map((t) => {
                    const isSelected = selectedTopics.includes(t.text);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleToggleTopic(t.text)}
                        className="flex items-center gap-2 w-full text-left text-xs font-medium py-1 text-ink hover:text-forge transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="size-4 text-forge shrink-0" />
                        ) : (
                          <Square className="size-4 text-neutral-300 shrink-0" />
                        )}
                        <span className="truncate">{t.text}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Custom add */}
                <div className="flex gap-2">
                  <Input
                    value={newTopicText}
                    onChange={(e) => setNewTopicText(e.target.value)}
                    placeholder="Add custom topic idea..."
                    className="h-10 text-xs"
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomTopic(); }}
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={handleAddCustomTopic}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Scheduling Params */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  3. Queue Settings
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="num-posts" className="text-xs">Post Count</Label>
                    <Input
                      id="num-posts"
                      type="number"
                      min={1}
                      max={20}
                      value={numPosts}
                      onChange={(e) => setNumPosts(Number(e.target.value))}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interval-days" className="text-xs">Day Interval</Label>
                    <Input
                      id="interval-days"
                      type="number"
                      min={1}
                      max={14}
                      value={intervalDays}
                      onChange={(e) => setIntervalDays(Number(e.target.value))}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="start-time" className="text-xs">Posting Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Campaign settings */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  4. Tone & Goal
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Tone</Label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value as PostTone)}
                      className="w-full h-10 px-3 text-xs bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-forge"
                    >
                      {POST_TONES.map((t) => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Goal</Label>
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value as PostGoal)}
                      className="w-full h-10 px-3 text-xs bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-forge"
                    >
                      {POST_GOALS.map((g) => (
                        <option key={g} value={g}>{POST_GOAL_LABELS[g]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                className="w-full h-11 bg-gradient-forge text-white"
                disabled={isGenerating || isScheduling || selectedTopics.length === 0}
                onClick={handleGenerateBulk}
              >
                {isGenerating ? (
                  <>
                    <Loader size="sm" className="mr-2" />
                    Forging posts...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Generate Campaign
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results / List Panel */}
        <div className="xl:col-span-2 space-y-6">
          {generatedPosts.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed min-h-[50vh]">
              <CalendarClock className="size-12 text-neutral-300 mb-4" />
              <CardTitle className="text-lg">No campaign generated yet</CardTitle>
              <CardDescription className="max-w-xs mt-1">
                Configure your topics and queue parameters, then click &quot;Generate Campaign&quot; to review suggestions.
              </CardDescription>
            </Card>
          ) : (
            <Card className="relative overflow-hidden border-forge/30">
              <SparkBurst play={playSpark} className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              
              <CardHeader className="flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">Campaign suggestions ({generatedPosts.length} posts)</CardTitle>
                  <CardDescription>Review and modify schedule dates before committing to the queue.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => handleSelectAll(true)}>
                    Select all
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleSelectAll(false)}>
                    Deselect
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="bg-neutral-100 p-1 w-full justify-start overflow-x-auto h-12">
                    {generatedPosts.map((item, index) => (
                      <TabsTrigger key={item.id} value={item.id} className="text-xs px-3">
                        <span className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectPost(item.id);
                            }}
                          >
                            {item.selected ? (
                              <CheckSquare className="size-3.5 text-forge" />
                            ) : (
                              <Square className="size-3.5 text-neutral-400" />
                            )}
                          </button>
                          Post {index + 1}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {generatedPosts.map((item, index) => {
                    const localDateLabel = format(new Date(item.scheduledAt), "MMM d, h:mm a");
                    return (
                      <TabsContent key={item.id} value={item.id} className="space-y-4 pt-2">
                        {/* Title details */}
                        <div className="flex items-start justify-between gap-4 border-b pb-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-forge uppercase tracking-widest bg-forge/10 px-2 py-0.5 rounded">
                              Post {index + 1} — Topic: {item.topic}
                            </span>
                            <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                              <Calendar className="size-4 text-forge" /> Scheduled for: {localDateLabel} ({userTimezone})
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`edit-time-${item.id}`} className="text-xs text-neutral-500 font-medium">
                              Reschedule:
                            </Label>
                            <Input
                              id={`edit-time-${item.id}`}
                              type="datetime-local"
                              value={item.scheduledAt}
                              onChange={(e) => updatePostSchedule(item.id, e.target.value)}
                              className="h-9 text-xs w-48"
                            />
                          </div>
                        </div>

                        {/* Editor grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Left: Text editor */}
                          <div className="md:col-span-2 space-y-4">
                            <Tabs defaultValue={item.platforms[0]}>
                              <TabsList className="bg-neutral-50 p-1 w-full justify-start overflow-x-auto">
                                {item.platforms.map((p) => (
                                  <TabsTrigger key={p} value={p} className="text-xs">
                                    {formatPlatformLabel(p)}
                                  </TabsTrigger>
                                ))}
                              </TabsList>
                              {item.platforms.map((p) => (
                                <TabsContent key={p} value={p} className="pt-1">
                                  <Textarea
                                    value={item.platformContent[p] || ""}
                                    onChange={(e) => updatePostContent(item.id, p, e.target.value)}
                                    rows={8}
                                    className="bg-white border-neutral-200 text-sm leading-relaxed"
                                  />
                                </TabsContent>
                              ))}
                            </Tabs>
                          </div>

                          {/* Right: Graphic visual editor */}
                          <div className="md:col-span-1 flex flex-col justify-between border rounded-2xl p-4 bg-cloud min-h-[220px]">
                            <div>
                              <Label className="text-xs text-neutral-500 font-medium flex items-center gap-1 pb-2 border-b">
                                <ImageIcon className="size-3.5 text-forge" /> AI Graphic Visual
                              </Label>
                              {item.isGeneratingImage ? (
                                <div className="mt-4 flex flex-col items-center justify-center gap-2 border border-dashed rounded-xl p-4 min-h-[140px]">
                                  <Loader size="sm" className="text-forge" />
                                  <p className="text-[10px] text-neutral-500">Creating custom visual...</p>
                                </div>
                              ) : item.imageUrl ? (
                                <div className="mt-3 relative rounded-xl overflow-hidden border bg-white group">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={item.imageUrl} alt="AI graphic preview" className="w-full max-h-32 object-contain" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImageForPost(item.id)}
                                    className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-4 flex flex-col items-center justify-center border border-dashed rounded-xl p-4 text-center min-h-[120px]">
                                  <p className="text-[10px] text-neutral-400">No graphic attached.</p>
                                </div>
                              )}
                            </div>

                            {!item.imageUrl && !item.isGeneratingImage && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="w-full mt-2 h-9 text-xs"
                                onClick={() => handleGenerateImageForPost(item.id)}
                              >
                                <Sparkles className="mr-1.5 size-3 text-forge" /> Generate Graphic
                              </Button>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>

                {/* Submits */}
                <div className="border-t border-neutral-100 pt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-sm font-medium text-neutral-500">
                    {selectedCount} of {generatedPosts.length} posts selected
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 px-5"
                      disabled={isScheduling || selectedCount === 0}
                      onClick={() => handleSaveSelected("draft")}
                    >
                      Save Selected as Drafts
                    </Button>
                    <Button
                      type="button"
                      className="h-11 px-6 bg-gradient-forge text-white shadow-md shadow-forge/15"
                      disabled={isScheduling || selectedCount === 0}
                      onClick={() => handleSaveSelected("scheduled")}
                    >
                      {isScheduling ? (
                        <>
                          <Loader size="sm" className="mr-2" />
                          Scheduling...
                        </>
                      ) : (
                        <>
                          Schedule Selected Posts
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
    </div>
  );
}
