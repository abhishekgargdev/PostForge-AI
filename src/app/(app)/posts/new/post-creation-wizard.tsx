"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { AccountSummary } from "@/lib/accounts/serialize";
import { apiClient } from "@/lib/api-client";
import type { MediaResponse } from "@/lib/media/serialize";
import { PLATFORM_CHAR_LIMITS } from "@/lib/oauth/platforms";
import type { PostResponse } from "@/lib/posts/serialize";
import { formatPlatformLabel } from "@/lib/posts/serialize";
import {
  POST_GOAL_LABELS,
  POST_GOALS,
  type PostGoal,
} from "@/lib/validation/ai";
import { POST_TONES, type PostTone } from "@/lib/validation/posts";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
import { PlatformChip } from "@/components/posts/platform-chip";
import { SparkBurst } from "@/components/ui/spark-burst";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader, SectionSkeleton } from "@/components/ui/loaders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@/types/platforms";
import type { PostStatus } from "@/models/Post";
import { cn, convertLocalToUtc, convertUtcToLocalString } from "@/lib/utils";

type GenerateTextResponse = {
  content: string;
};

type ContentPreferencesResponse = {
  weekdayLabel: string;
  todayPreference: { topic: string; goal: PostGoal; tone: PostTone } | null;
  goalLabel?: string;
};

type WizardStep = 1 | 2 | 3;

const PLATFORM_OPTIONS: SocialPlatform[] = [...SOCIAL_PLATFORMS];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type SelectionChipProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

function SelectionChip({
  label,
  selected,
  disabled,
  onSelect,
}: SelectionChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        selected
          ? "border-2 border-forge bg-forge/10 text-ink shadow-sm"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {label}
    </button>
  );
}

export function PostCreationWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<WizardStep>(1);
  const [connectedPlatforms, setConnectedPlatforms] = useState<SocialPlatform[]>(
    [],
  );
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["linkedin"]);

  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState<PostGoal | "">("");
  const [keyPoints, setKeyPoints] = useState("");
  const [tone, setTone] = useState<PostTone>("professional");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const [dayPreferenceHint, setDayPreferenceHint] = useState<
    ContentPreferencesResponse | null
  >(null);
  const [dayPreferenceDismissed, setDayPreferenceDismissed] = useState(false);

  const [platformContent, setPlatformContent] = useState<
    Partial<Record<SocialPlatform, string>>
  >({});
  const [activePreviewPlatform, setActivePreviewPlatform] =
    useState<SocialPlatform>("linkedin");
  const [hasGenerated, setHasGenerated] = useState(false);

  const [imageUrl, setImageUrl] = useState("");
  const [mediaLibraryId, setMediaLibraryId] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);

  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [justGenerated, setJustGenerated] = useState(false);
  const [userTimezone, setUserTimezone] = useState("UTC");

  const singleConnectedPlatform =
    connectedPlatforms.length === 1 ? connectedPlatforms[0] : null;

  const isBusy =
    isGeneratingText ||
    isGeneratingImage ||
    isSaving ||
    isPublishing ||
    isLoadingAccounts;

  useEffect(() => {
    let cancelled = false;

    async function loadAccountsAndPreferences() {
      setIsLoadingAccounts(true);

      try {
        const [accounts, preferences, me] = await Promise.all([
          apiClient<AccountSummary[]>("/api/accounts"),
          apiClient<ContentPreferencesResponse>(
            "/api/user/content-preferences",
          ).catch(() => null),
          apiClient<{ timezone: string }>("/api/auth/me").catch(() => ({ timezone: "UTC" })),
        ]);

        if (cancelled) {
          return;
        }

        const connected = accounts
          .filter((account) => account.isConnected)
          .map((account) => account.platform);

        setConnectedPlatforms(connected);
        setUserTimezone(me.timezone || "UTC");

        const promptParam = searchParams.get("prompt");
        const platformParam = searchParams.get("platform");

        if (
          platformParam &&
          SOCIAL_PLATFORMS.includes(platformParam as SocialPlatform)
        ) {
          setPlatforms([platformParam as SocialPlatform]);
        } else if (connected.length === 1) {
          setPlatforms([connected[0]]);
        }

        if (promptParam) {
          setTopic(promptParam);
        } else if (preferences?.todayPreference) {
          setTopic(preferences.todayPreference.topic);
          setGoal(preferences.todayPreference.goal);
          setTone(preferences.todayPreference.tone);
          setDayPreferenceHint(preferences);
        }

        if (platformParam && SOCIAL_PLATFORMS.includes(platformParam as SocialPlatform)) {
          setActivePreviewPlatform(platformParam as SocialPlatform);
        } else if (connected.length === 1) {
          setActivePreviewPlatform(connected[0]);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load connected accounts",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAccounts(false);
        }
      }
    }

    void loadAccountsAndPreferences();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (platforms.includes(activePreviewPlatform)) {
      return;
    }

    setActivePreviewPlatform(platforms[0] ?? "linkedin");
  }, [platforms, activePreviewPlatform]);

  const triggerGenerationBurst = useCallback(() => {
    setJustGenerated(false);
    requestAnimationFrame(() => setJustGenerated(true));
    window.setTimeout(() => setJustGenerated(false), 600);
  }, []);

  function togglePlatform(platform: SocialPlatform) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  }

  function selectAllConnectedPlatforms() {
    if (connectedPlatforms.length === 0) {
      toast.error("Connect at least one social account in Settings first.");
      return;
    }

    setPlatforms([...connectedPlatforms]);
  }

  function buildGenerationBody(platform: SocialPlatform) {
    if (advancedOpen && customPrompt.trim()) {
      return {
        platform,
        tone,
        customPrompt: customPrompt.trim(),
      };
    }

    return {
      platform,
      tone,
      topic: topic.trim(),
      goal: goal as PostGoal,
      keyPoints: keyPoints.trim() || undefined,
    };
  }

  function buildAiPromptSummary() {
    if (advancedOpen && customPrompt.trim()) {
      return customPrompt.trim();
    }

    const parts = [`Topic: ${topic.trim()}`, `Goal: ${goal}`, `Tone: ${tone}`];

    if (keyPoints.trim()) {
      parts.push(`Key points: ${keyPoints.trim()}`);
    }

    return parts.join(" | ");
  }

  async function generateForAllPlatforms() {
    if (platforms.length === 0) {
      toast.error("Select at least one platform.");
      return;
    }

    if (!advancedOpen || !customPrompt.trim()) {
      if (!topic.trim()) {
        toast.error("Add a topic before generating.");
        return;
      }

      if (!goal) {
        toast.error("Select a goal before generating.");
        return;
      }
    }

    setIsGeneratingText(true);

    try {
      const entries = await Promise.all(
        platforms.map(async (platform) => {
          const data = await apiClient<GenerateTextResponse>(
            "/api/ai/generate-text",
            {
              method: "POST",
              body: JSON.stringify(buildGenerationBody(platform)),
            },
          );

          return [platform, data.content] as const;
        }),
      );

      const nextContent = Object.fromEntries(entries) as Partial<
        Record<SocialPlatform, string>
      >;

      setPlatformContent(nextContent);
      setHasGenerated(true);
      setActivePreviewPlatform(platforms[0]);
      triggerGenerationBurst();

      const nowInTimezone = new Date();
      const tomorrow = new Date(nowInTimezone.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowLocalString = convertUtcToLocalString(tomorrow, userTimezone);
      const [datePart] = tomorrowLocalString.split("T");
      setScheduledAt(`${datePart}T09:00`);

      toast.success("Posts generated for your selected platforms");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to generate text",
      );
    } finally {
      setIsGeneratingText(false);
    }
  }

  async function handleStepTwoContinue() {
    if (platforms.length === 0) {
      toast.error("Select at least one platform.");
      setStep(1);
      return;
    }

    if (!advancedOpen || !customPrompt.trim()) {
      if (!topic.trim()) {
        toast.error("Topic is required.");
        return;
      }

      if (!goal) {
        toast.error("Select a goal for this post.");
        return;
      }
    }

    setStep(3);
    if (!hasGenerated) {
      await generateForAllPlatforms();
    }
  }

  async function handleGenerateImage() {
    const prompt =
      customPrompt.trim() ||
      topic.trim() ||
      platforms
        .map((platform) => platformContent[platform]?.trim())
        .find(Boolean) ||
      "";

    if (!prompt) {
      toast.error("Add a topic or generate post text before creating an image.");
      return;
    }

    setIsGeneratingImage(true);

    try {
      const data = await apiClient<MediaResponse>("/api/ai/generate-image", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });

      setImageUrl(data.fileUrl);
      setMediaLibraryId(data.id);
      triggerGenerationBurst();
      toast.success("Image generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to generate image",
      );
    } finally {
      setIsGeneratingImage(false);
    }
  }

  function handleLibrarySelect(media: MediaResponse) {
    setImageUrl(media.fileUrl);
    setMediaLibraryId(media.id);
    toast.success("Media selected from library");
  }

  function clearSelectedImage() {
    setImageUrl("");
    setMediaLibraryId("");
  }

  function updatePlatformContent(platform: SocialPlatform, content: string) {
    setPlatformContent((current) => ({
      ...current,
      [platform]: content,
    }));
  }

  const platformContentMap = useMemo(() => {
    const map: Partial<Record<SocialPlatform, string>> = {};

    for (const platform of platforms) {
      const content = platformContent[platform]?.trim();
      if (content) {
        map[platform] = content;
      }
    }

    return map;
  }, [platformContent, platforms]);

  function getPrimaryContent() {
    return (
      platforms
        .map((platform) => platformContentMap[platform])
        .find(Boolean) ?? ""
    );
  }

  function validateBeforeSave() {
    if (platforms.length === 0) {
      toast.error("Select at least one platform.");
      return false;
    }

    for (const platform of platforms) {
      if (!platformContentMap[platform]) {
        toast.error(
          `Add content for ${formatPlatformLabel(platform)} before saving.`,
        );
        return false;
      }
    }

    return true;
  }

  async function savePost(
    status: PostStatus,
    options?: { scheduledAt?: string },
  ) {
    if (!validateBeforeSave()) {
      return;
    }

    setIsSaving(true);

    try {
      await apiClient<PostResponse>("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          content: getPrimaryContent(),
          aiPrompt: buildAiPromptSummary(),
          platforms,
          platformContent: platformContentMap,
          imageUrl: imageUrl || undefined,
          mediaLibraryId: mediaLibraryId || undefined,
          status,
          scheduledAt: options?.scheduledAt,
          timezone: userTimezone,
          imageStatus: imageUrl ? "success" : "none",
        }),
      });

      toast.success(
        status === "draft"
          ? "Draft saved"
          : status === "scheduled"
            ? "Post scheduled"
            : "Post queued for publishing",
      );
      router.push("/posts");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save post");
      setIsSaving(false);
    }
  }

  async function handlePublishNow() {
    if (!validateBeforeSave()) {
      return;
    }

    setIsPublishing(true);

    try {
      const post = await apiClient<PostResponse>("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          content: getPrimaryContent(),
          aiPrompt: buildAiPromptSummary(),
          platforms,
          platformContent: platformContentMap,
          imageUrl: imageUrl || undefined,
          mediaLibraryId: mediaLibraryId || undefined,
          status: "draft",
          imageStatus: imageUrl ? "success" : "none",
        }),
      });

      const result = await apiClient<{ post: PostResponse }>(
        `/api/posts/${post.id}/publish`,
        { method: "POST" },
      );

      toast.success(
        result.post.status === "published"
          ? "Post published"
          : result.post.status === "failed"
            ? "Publishing failed on all platforms"
            : "Post is publishing",
      );
      router.push("/posts");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to publish post",
      );
      setIsPublishing(false);
    }
  }

  function handleScheduleSubmit() {
    if (!scheduledAt) {
      toast.error("Choose a date and time to schedule this post.");
      return;
    }

    const scheduleDate = convertLocalToUtc(scheduledAt, userTimezone);
    if (Number.isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
      toast.error("Scheduled time must be in the future.");
      return;
    }

    setScheduleOpen(false);
    void savePost("scheduled", { scheduledAt: scheduleDate.toISOString() });
  }

  function renderPlatformPreview(platform: SocialPlatform) {
    const content = platformContent[platform] ?? "";
    const charLimit = PLATFORM_CHAR_LIMITS[platform];
    const charCount = content.length;
    const charRatio = charLimit > 0 ? charCount / charLimit : 0;

    return (
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(event) =>
            updatePlatformContent(platform, event.target.value)
          }
          rows={8}
          className="min-h-40"
          placeholder={`Edit your ${formatPlatformLabel(platform)} post...`}
          disabled={isSaving || isPublishing || isGeneratingText}
        />
        <p
          className={cn(
            "text-right font-mono text-xs",
            charRatio > 1
              ? "text-ember"
              : charRatio >= 0.9
                ? "text-amber-500"
                : "text-neutral-500",
          )}
        >
          {charCount.toLocaleString()} / {charLimit.toLocaleString()}
        </p>
      </div>
    );
  }

  if (isLoadingAccounts) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:max-w-3xl md:p-6">
        <SectionSkeleton rows={1} rowClassName="h-8 w-48" />
        <SectionSkeleton rows={6} rowClassName="h-14 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:max-w-3xl md:p-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Create Post</h1>
          <p className="text-sm text-muted-foreground">
            Answer a few quick questions, then review AI drafts for each
            platform.
          </p>
        </div>

        <ol className="flex gap-2" aria-label="Wizard progress">
          {[1, 2, 3].map((value) => (
            <li
              key={value}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                step >= value ? "bg-forge" : "bg-neutral-200",
              )}
              aria-current={step === value ? "step" : undefined}
            />
          ))}
        </ol>
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — Platform</CardTitle>
            <CardDescription>
              Where do you want to post this?
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {PLATFORM_OPTIONS.map((platform) => (
                <PlatformChip
                  key={platform}
                  platform={platform}
                  selected={platforms.includes(platform)}
                  disabled={isBusy}
                  onToggle={() => togglePlatform(platform)}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={isBusy || connectedPlatforms.length === 0}
              onClick={selectAllConnectedPlatforms}
            >
              Create for all connected platforms
            </Button>

            {singleConnectedPlatform ? (
              <Button
                type="button"
                className="h-11"
                disabled={isBusy || platforms.length === 0}
                onClick={() => setStep(2)}
              >
                Use {formatPlatformLabel(singleConnectedPlatform)}
              </Button>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                className="h-11 flex-1"
                disabled={isBusy || platforms.length === 0}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Content</CardTitle>
            <CardDescription>
              Tell us what you want to say. Tone defaults to Professional so you
              can move fast.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {dayPreferenceHint?.todayPreference && !dayPreferenceDismissed ? (
              <div className="flex flex-col gap-3 rounded-xl border border-forge/30 bg-forge/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink">
                  Using your {dayPreferenceHint.weekdayLabel} preference:{" "}
                  <span className="font-medium">
                    {dayPreferenceHint.todayPreference.topic}
                  </span>
                  {dayPreferenceHint.goalLabel
                    ? ` — ${dayPreferenceHint.goalLabel}`
                    : ""}
                  {dayPreferenceHint.todayPreference?.tone
                    ? ` · ${capitalize(dayPreferenceHint.todayPreference.tone)}`
                    : ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9"
                    onClick={() => {
                      setTopic("");
                      setGoal("");
                      setTone("professional");
                      setDayPreferenceDismissed(true);
                    }}
                  >
                    change
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9"
                    onClick={() => setDayPreferenceDismissed(true)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="post-topic">Topic — what&apos;s this post about?</Label>
              <Input
                id="post-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="h-11"
                placeholder="Launching our spring scheduling workflow..."
                disabled={isBusy || (advancedOpen && Boolean(customPrompt.trim()))}
              />
            </div>

            <div className="grid gap-3">
              <Label>Goal</Label>
              <div className="flex flex-wrap gap-2">
                {POST_GOALS.map((option) => (
                  <SelectionChip
                    key={option}
                    label={POST_GOAL_LABELS[option]}
                    selected={goal === option}
                    disabled={
                      isBusy || (advancedOpen && Boolean(customPrompt.trim()))
                    }
                    onSelect={() => setGoal(option)}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="post-key-points">
                Key points to include (optional)
              </Label>
              <Textarea
                id="post-key-points"
                value={keyPoints}
                onChange={(event) => setKeyPoints(event.target.value)}
                rows={4}
                className="min-h-24"
                placeholder={"One point per line\nFaster scheduling\nBetter analytics"}
                disabled={isBusy || (advancedOpen && Boolean(customPrompt.trim()))}
              />
            </div>

            <div className="grid gap-3">
              <Label>Tone</Label>
              <div className="flex flex-wrap gap-2">
                {POST_TONES.map((option) => (
                  <SelectionChip
                    key={option}
                    label={capitalize(option)}
                    selected={tone === option}
                    disabled={isBusy}
                    onSelect={() => setTone(option)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-neutral-200 p-4">
              <button
                type="button"
                className="text-sm font-medium text-forge hover:underline"
                onClick={() => setAdvancedOpen((current) => !current)}
              >
                Advanced: write your own prompt
              </button>

              {advancedOpen ? (
                <div className="mt-3 grid gap-2">
                  <Label htmlFor="custom-prompt">Custom prompt</Label>
                  <Textarea
                    id="custom-prompt"
                    value={customPrompt}
                    onChange={(event) => setCustomPrompt(event.target.value)}
                    rows={4}
                    className="min-h-24"
                    placeholder="Write a LinkedIn post announcing..."
                    disabled={isBusy}
                  />
                  <p className="text-xs text-muted-foreground">
                    When filled, this bypasses the structured template above.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="relative flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                disabled={isBusy}
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="button"
                className="h-11 flex-1"
                disabled={isBusy}
                onClick={() => void handleStepTwoContinue()}
              >
                {isGeneratingText ? (
                  <>
                    <Loader size="sm" label="Generating posts" />
                    Generating...
                  </>
                ) : (
                  "Generate & review"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Step 3 — Review</CardTitle>
              <CardDescription>
                Edit each platform draft, attach a shared image, then save or
                publish.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="relative flex flex-col gap-3 sm:flex-row">
                <SparkBurst
                  play={justGenerated}
                  className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1"
                  disabled={isBusy}
                  onClick={() => setStep(2)}
                >
                  Back to content
                </Button>
                <Button
                  type="button"
                  className="h-11 flex-1"
                  disabled={isBusy}
                  onClick={() => void generateForAllPlatforms()}
                >
                  {isGeneratingText ? (
                    <>
                      <Loader size="sm" label="Regenerating posts" />
                      Regenerating...
                    </>
                  ) : (
                    "Regenerate all"
                  )}
                </Button>
              </div>

              {isGeneratingText ? (
                <SectionSkeleton rows={4} rowClassName="h-16 rounded-xl" />
              ) : (
                <>
                  <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:hidden">
                    {platforms.map((platform) => (
                      <Card
                        key={platform}
                        className="min-w-[88vw] shrink-0 snap-center"
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            {formatPlatformLabel(platform)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>{renderPlatformPreview(platform)}</CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden md:block">
                    <Tabs
                      value={activePreviewPlatform}
                      onValueChange={(value) =>
                        setActivePreviewPlatform(value as SocialPlatform)
                      }
                    >
                      <TabsList className="h-11 w-full justify-start">
                        {platforms.map((platform) => (
                          <TabsTrigger
                            key={platform}
                            value={platform}
                            className="min-h-9 flex-none px-4"
                          >
                            {formatPlatformLabel(platform)}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {platforms.map((platform) => (
                        <TabsContent key={platform} value={platform} className="mt-4">
                          {renderPlatformPreview(platform)}
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Post image</CardTitle>
              <CardDescription>
                One shared image across all selected platforms.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1"
                  disabled={isGeneratingImage || isSaving || isPublishing}
                  onClick={() => setLibraryOpen(true)}
                >
                  Choose from library
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 flex-1"
                  disabled={isBusy}
                  onClick={() => void handleGenerateImage()}
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader size="sm" label="Generating image" />
                      Generating...
                    </>
                  ) : (
                    "Generate Image with AI"
                  )}
                </Button>
                {imageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 flex-1"
                    disabled={isSaving || isPublishing}
                    onClick={clearSelectedImage}
                  >
                    Remove image
                  </Button>
                ) : null}
              </div>

              {isGeneratingImage ? (
                <SectionSkeleton rows={1} rowClassName="aspect-video w-full rounded-xl" />
              ) : imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Selected post visual"
                  className="max-h-80 w-full rounded-xl border object-contain"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No image selected yet.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              disabled={isBusy}
              onClick={() => void savePost("draft")}
            >
              {isSaving ? (
                <>
                  <Loader size="sm" label="Saving draft" />
                  Saving...
                </>
              ) : (
                "Save as Draft"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              disabled={isBusy}
              onClick={() => void savePost("confirmed")}
            >
              {isSaving ? (
                <>
                  <Loader size="sm" label="Confirming post" />
                  Saving...
                </>
              ) : (
                "Confirm & Queue"
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 flex-1"
              disabled={isBusy}
              onClick={() => setScheduleOpen(true)}
            >
              Schedule
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 bg-gradient-forge text-white"
              disabled={isBusy}
              onClick={() => void handlePublishNow()}
            >
              {isPublishing ? (
                <>
                  <Loader size="sm" label="Publishing post" />
                  Publishing...
                </>
              ) : (
                "Publish Now"
              )}
            </Button>
          </div>
        </>
      ) : null}

      <Button
        render={<Link href="/posts" />}
        nativeButton={false}
        variant="ghost"
        className="h-11"
      >
        Back to posts
      </Button>

      <MediaPickerDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={handleLibrarySelect}
      />

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule post</DialogTitle>
            <DialogDescription>
              Choose when this post should go out.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="schedule-at">Date and time</Label>
            <Input
              id="schedule-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="h-11"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setScheduleOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11"
              disabled={isSaving || isPublishing}
              onClick={handleScheduleSubmit}
            >
              {isSaving ? (
                <>
                  <Loader size="sm" label="Scheduling post" />
                  Scheduling...
                </>
              ) : (
                "Confirm schedule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
