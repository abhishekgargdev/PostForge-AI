"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Sparkles, HelpCircle, Check, ArrowRight, Image as ImageIcon, RotateCw, Trash } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader, SectionSkeleton } from "@/components/ui/loaders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/types/platforms";
import { formatPlatformLabel } from "@/lib/posts/serialize";
import type { AccountSummary } from "@/lib/accounts/serialize";
import type { MediaResponse } from "@/lib/media/serialize";
import { SparkBurst } from "@/components/ui/spark-burst";

type QuestionResponse = {
  id: string;
  text: string;
  isActive: boolean;
};

type GenerateTextResponse = {
  content: string;
};

export function DailyQuestionWidget({ onPostCreated }: { onPostCreated: () => void }) {
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(-1);
  const [connectedPlatforms, setConnectedPlatforms] = useState<SocialPlatform[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState<Partial<Record<SocialPlatform, string>>>({});
  const [imageUrl, setImageUrl] = useState("");
  const [mediaLibraryId, setMediaLibraryId] = useState("");
  const [activeTab, setActiveTab] = useState<SocialPlatform>("linkedin");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [playSpark, setPlaySpark] = useState(false);

  const loadWidgetData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allQuestions, accounts] = await Promise.all([
        apiClient<QuestionResponse[]>("/api/questions"),
        apiClient<AccountSummary[]>("/api/accounts"),
      ]);

      const activeQ = allQuestions.filter((q) => q.isActive);
      setQuestions(activeQ);
      if (activeQ.length > 0) {
        setActiveQuestionIndex(0);
      }

      const connected = accounts
        .filter((acc) => acc.isConnected)
        .map((acc) => acc.platform);
      setConnectedPlatforms(connected);
      setSelectedPlatforms(connected);
      if (connected.length > 0) {
        setActiveTab(connected[0]);
      }
    } catch (error) {
      toast.error("Unable to load daily question widget");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWidgetData();
  }, [loadWidgetData]);

  const handleNextQuestion = () => {
    if (questions.length === 0) return;
    setActiveQuestionIndex((prev) => (prev + 1) % questions.length);
    setAnswer("");
    setGeneratedDrafts({});
    setImageUrl("");
    setMediaLibraryId("");
  };

  const handleTogglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  };

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one social platform.");
      return;
    }
    if (!answer.trim()) {
      toast.error("Please provide an answer to generate a post.");
      return;
    }

    setIsGenerating(true);
    setGeneratedDrafts({});
    setImageUrl("");
    setMediaLibraryId("");

    const currentQuestion = questions[activeQuestionIndex];

    try {
      // 1. Generate text for each selected platform
      const textPromises = selectedPlatforms.map(async (platform) => {
        const promptText = `Question: ${currentQuestion.text}\nAnswer: ${answer.trim()}`;
        const data = await apiClient<GenerateTextResponse>("/api/ai/generate-text", {
          method: "POST",
          body: JSON.stringify({
            platform,
            tone: "professional",
            topic: promptText,
            goal: "educate",
          }),
        });
        return [platform, data.content] as const;
      });

      const textResults = await Promise.all(textPromises);
      const draftsMap = Object.fromEntries(textResults) as Record<SocialPlatform, string>;
      setGeneratedDrafts(draftsMap);
      setActiveTab(selectedPlatforms[0]);

      // 2. Generate matching image
      setIsGeneratingImage(true);
      const imgPrompt = `A high quality, modern, conceptual vector illustration representing: ${answer.trim()}`;
      const imgRes = await apiClient<MediaResponse>("/api/ai/generate-image", {
        method: "POST",
        body: JSON.stringify({ prompt: imgPrompt }),
      });
      setImageUrl(imgRes.fileUrl);
      setMediaLibraryId(imgRes.id);
      
      setPlaySpark(true);
      setTimeout(() => setPlaySpark(false), 600);
      toast.success("AI suggestion and image generated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setIsGenerating(false);
      setIsGeneratingImage(false);
    }
  };

  const handleConfirmAndQueue = async () => {
    setIsSaving(true);
    try {
      const primaryContent = selectedPlatforms
        .map((p) => generatedDrafts[p])
        .find(Boolean) || "";

      const currentQuestion = questions[activeQuestionIndex];

      await apiClient("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          content: primaryContent,
          aiPrompt: `Daily Question: ${currentQuestion.text} | Answer: ${answer}`,
          platforms: selectedPlatforms,
          platformContent: generatedDrafts,
          imageUrl: imageUrl || undefined,
          mediaLibraryId: mediaLibraryId || undefined,
          status: "confirmed",
        }),
      });

      toast.success("Post confirmed and added to daily queue!");
      setAnswer("");
      setGeneratedDrafts({});
      setImageUrl("");
      setMediaLibraryId("");
      onPostCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save post");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishNow = async () => {
    setIsPublishing(true);
    try {
      const primaryContent = selectedPlatforms
        .map((p) => generatedDrafts[p])
        .find(Boolean) || "";

      const currentQuestion = questions[activeQuestionIndex];

      const post = await apiClient<{ id: string }>("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          content: primaryContent,
          aiPrompt: `Daily Question: ${currentQuestion.text} | Answer: ${answer}`,
          platforms: selectedPlatforms,
          platformContent: generatedDrafts,
          imageUrl: imageUrl || undefined,
          mediaLibraryId: mediaLibraryId || undefined,
          status: "draft",
        }),
      });

      await apiClient(`/api/posts/${post.id}/publish`, { method: "POST" });
      toast.success("Post published instantly!");
      setAnswer("");
      setGeneratedDrafts({});
      setImageUrl("");
      setMediaLibraryId("");
      onPostCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publishing failed");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleTextChange = (platform: SocialPlatform, val: string) => {
    setGeneratedDrafts((current) => ({
      ...current,
      [platform]: val,
    }));
  };

  if (isLoading) {
    return <SectionSkeleton rows={2} rowClassName="h-32 rounded-xl" />;
  }

  if (questions.length === 0) {
    return null; // Don't show anything if no questions are active
  }

  const currentQuestion = questions[activeQuestionIndex];
  const hasDrafts = Object.keys(generatedDrafts).length > 0;

  return (
    <Card className="relative overflow-hidden border-forge/30 ring-1 ring-forge/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-forge">
          <Sparkles className="size-5 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider">Daily Prompter</span>
        </div>
        <CardTitle className="text-xl">Answer today&apos;s question to forge a post</CardTitle>
        <CardDescription>
          Your input + AI will create ready-to-publish social posts with generated visuals.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Question Panel */}
        <div className="rounded-2xl bg-forge/5 border border-forge/10 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-forge uppercase tracking-widest bg-forge/10 px-2 py-0.5 rounded">
                Question {activeQuestionIndex + 1} of {questions.length}
              </span>
              <p className="text-lg font-semibold text-ink leading-snug">{currentQuestion.text}</p>
            </div>
            {questions.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 text-xs border-forge/20 text-forge hover:bg-forge/5"
                onClick={handleNextQuestion}
              >
                Skip Question
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your thoughts, raw facts, or answers here..."
              rows={3}
              className="bg-white border-neutral-200"
              disabled={isGenerating || isSaving || isPublishing}
            />
          </div>

          {/* Platform selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-500">Destination Accounts</Label>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_PLATFORMS.map((platform) => {
                const isConnected = connectedPlatforms.includes(platform);
                const isSelected = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    disabled={!isConnected || isGenerating || isSaving || isPublishing}
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

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              disabled={isGenerating || isSaving || isPublishing || !answer.trim()}
              onClick={handleGenerate}
              className="bg-gradient-forge text-white px-6 shadow-md shadow-forge/15"
            >
              {isGenerating ? (
                <>
                  <Loader size="sm" className="mr-2" />
                  Forging posts...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Forge AI Drafts
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results Preview */}
        {hasDrafts && (
          <div className="border-t border-neutral-200/60 pt-4 space-y-4 relative">
            <SparkBurst play={playSpark} className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            
            <h3 className="font-semibold text-base text-ink">AI Suggestions Preview</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Draft Text Preview (Tabs) */}
              <div className="border rounded-2xl p-4 bg-cloud space-y-4">
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as SocialPlatform)}>
                  <TabsList className="bg-neutral-100 p-1 w-full justify-start overflow-x-auto">
                    {selectedPlatforms.map((p) => (
                      <TabsTrigger key={p} value={p} className="text-xs">
                        {formatPlatformLabel(p)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {selectedPlatforms.map((p) => (
                    <TabsContent key={p} value={p} className="pt-2">
                      <Textarea
                        value={generatedDrafts[p] || ""}
                        onChange={(e) => handleTextChange(p, e.target.value)}
                        rows={6}
                        className="bg-white border-neutral-200 text-sm leading-relaxed"
                        disabled={isSaving || isPublishing}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              {/* Draft Image Preview */}
              <div className="border rounded-2xl p-4 bg-cloud flex flex-col justify-between min-h-60">
                <Label className="text-xs text-neutral-500 font-medium flex items-center gap-1 pb-2">
                  <ImageIcon className="size-3.5 text-forge" /> Shared Graphic
                </Label>
                {isGeneratingImage ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 border border-dashed rounded-xl p-6">
                    <Loader size="lg" className="text-forge" />
                    <p className="text-xs text-neutral-500">Creating custom image...</p>
                  </div>
                ) : imageUrl ? (
                  <div className="flex-1 relative rounded-xl overflow-hidden border bg-white group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Generated post suggestion visual" className="w-full h-full max-h-48 object-contain" />
                    <button
                      type="button"
                      onClick={() => { setImageUrl(""); setMediaLibraryId(""); }}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed rounded-xl p-6 text-center">
                    <p className="text-xs text-neutral-400">No image attached.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setGeneratedDrafts({});
                  setImageUrl("");
                  setMediaLibraryId("");
                  setAnswer("");
                }}
                disabled={isSaving || isPublishing}
              >
                Clear Preview
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConfirmAndQueue}
                  disabled={isSaving || isPublishing}
                  className="h-11 px-5"
                >
                  {isSaving ? (
                    <>
                      <Loader size="sm" className="mr-2" />
                      Adding to queue...
                    </>
                  ) : (
                    <>
                      Confirm & Queue
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handlePublishNow}
                  disabled={isSaving || isPublishing}
                  className="h-11 px-5 bg-gradient-forge text-white shadow-md shadow-forge/15"
                >
                  {isPublishing ? (
                    <>
                      <Loader size="sm" className="mr-2" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      Publish Instantly
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
