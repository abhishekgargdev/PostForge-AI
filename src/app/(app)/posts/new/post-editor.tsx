"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import type { PostResponse } from "@/lib/posts/serialize";
import { POST_TONES, type PostTone } from "@/lib/validation/posts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@/models/SocialAccount";
import type { PostStatus } from "@/models/Post";
import { formatPlatformLabel } from "@/lib/posts/serialize";

type GenerateTextResponse = {
  content: string;
};

type GenerateImageResponse = {
  id: string;
  fileUrl: string;
};

const PLATFORM_OPTIONS: SocialPlatform[] = [...SOCIAL_PLATFORMS];

export function PostEditor() {
  const router = useRouter();
  const [ideaPrompt, setIdeaPrompt] = useState("");
  const [content, setContent] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["linkedin"]);
  const [tone, setTone] = useState<PostTone>("professional");
  const [imageUrl, setImageUrl] = useState("");
  const [mediaLibraryId, setMediaLibraryId] = useState("");
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  function togglePlatform(platform: SocialPlatform) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  }

  async function handleGenerateText() {
    if (!ideaPrompt.trim()) {
      toast.error("Enter a post idea before generating text.");
      return;
    }

    if (platforms.length === 0) {
      toast.error("Select at least one platform.");
      return;
    }

    setIsGeneratingText(true);

    try {
      const primaryPlatform = platforms[0];
      const data = await apiClient<GenerateTextResponse>("/api/ai/generate-text", {
        method: "POST",
        body: JSON.stringify({
          prompt: ideaPrompt,
          platform: primaryPlatform,
          tone,
        }),
      });

      setContent(data.content);

      if (platforms.length > 1) {
        toast.success(
          `Generated for ${formatPlatformLabel(primaryPlatform)}. Edit the copy for your other platforms if needed.`,
        );
      } else {
        toast.success("Post text generated");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to generate text",
      );
    } finally {
      setIsGeneratingText(false);
    }
  }

  async function handleGenerateImage() {
    const prompt = ideaPrompt.trim() || content.trim();

    if (!prompt) {
      toast.error("Add a post idea or content before generating an image.");
      return;
    }

    setIsGeneratingImage(true);

    try {
      const data = await apiClient<GenerateImageResponse>(
        "/api/ai/generate-image",
        {
          method: "POST",
          body: JSON.stringify({ prompt }),
        },
      );

      setImageUrl(data.fileUrl);
      setMediaLibraryId(data.id);
      toast.success("Image generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to generate image",
      );
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function savePost(
    status: PostStatus,
    options?: { scheduledAt?: string },
  ) {
    if (!content.trim()) {
      toast.error("Add post content before saving.");
      return;
    }

    if (platforms.length === 0) {
      toast.error("Select at least one platform.");
      return;
    }

    setIsSaving(true);

    try {
      await apiClient<PostResponse>("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          content: content.trim(),
          aiPrompt: ideaPrompt.trim() || undefined,
          platforms,
          imageUrl: imageUrl || undefined,
          mediaLibraryId: mediaLibraryId || undefined,
          status,
          scheduledAt: options?.scheduledAt,
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

  function handleScheduleSubmit() {
    if (!scheduledAt) {
      toast.error("Choose a date and time to schedule this post.");
      return;
    }

    const scheduleDate = new Date(scheduledAt);
    if (Number.isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
      toast.error("Scheduled time must be in the future.");
      return;
    }

    setScheduleOpen(false);
    void savePost("scheduled", { scheduledAt: scheduleDate.toISOString() });
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:max-w-3xl md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create Post</h1>
        <p className="text-sm text-muted-foreground">
          Draft AI-assisted content, attach an image, then save or schedule it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post idea</CardTitle>
          <CardDescription>
            Describe what you want to say. AI uses this for text and image
            generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="post-idea">Prompt / idea</Label>
            <Textarea
              id="post-idea"
              value={ideaPrompt}
              onChange={(event) => setIdeaPrompt(event.target.value)}
              rows={4}
              className="min-h-28"
              placeholder="Launch our spring campaign and highlight the new scheduling workflow..."
              disabled={isGeneratingText || isGeneratingImage || isSaving}
            />
          </div>

          <div className="grid gap-3">
            <Label>Platforms</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {PLATFORM_OPTIONS.map((platform) => {
                const checked = platforms.includes(platform);

                return (
                  <label
                    key={platform}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                      checked ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={checked}
                      onChange={() => togglePlatform(platform)}
                      disabled={isGeneratingText || isGeneratingImage || isSaving}
                    />
                    <span className="text-sm font-medium">
                      {formatPlatformLabel(platform)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="post-tone">Tone</Label>
            <Select
              value={tone}
              onValueChange={(value) => setTone(value as PostTone)}
              disabled={isGeneratingText || isGeneratingImage || isSaving}
            >
              <SelectTrigger id="post-tone" className="h-11 w-full">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                {POST_TONES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="h-11 flex-1"
              disabled={isGeneratingText || isGeneratingImage || isSaving}
              onClick={handleGenerateText}
            >
              {isGeneratingText ? (
                <>
                  <Loader size="sm" label="Generating text" />
                  Generating...
                </>
              ) : (
                "Generate with AI"
              )}
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="h-11 flex-1"
              disabled={isGeneratingText || isGeneratingImage || isSaving}
              onClick={handleGenerateImage}
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated image</CardTitle>
          <CardDescription>
            Preview, regenerate, or continue without an image.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isGeneratingImage ? (
            <SectionSkeleton rows={1} rowClassName="aspect-video w-full rounded-xl" />
          ) : imageUrl ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Generated post visual"
                className="max-h-80 w-full rounded-xl border object-contain"
              />
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={isSaving}
                onClick={handleGenerateImage}
              >
                Regenerate image
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No image yet. Generate one with AI or save text-only draft.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Post content</CardTitle>
          <CardDescription>
            Edit the generated copy before saving or scheduling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            className="min-h-40"
            placeholder="Write or generate your post content..."
            disabled={isSaving}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1"
          disabled={isSaving}
          onClick={() => savePost("draft")}
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
          variant="secondary"
          className="h-11 flex-1"
          disabled={isSaving}
          onClick={() => setScheduleOpen(true)}
        >
          Schedule
        </Button>

        <Button
          type="button"
          className="h-11 flex-1"
          disabled={isSaving}
          onClick={() => savePost("publishing")}
        >
          Publish Now
        </Button>
      </div>

      <Button
        render={<Link href="/posts" />}
        nativeButton={false}
        variant="ghost"
        className="h-11"
      >
        Back to posts
      </Button>

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
              disabled={isSaving}
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
