"use client";

import { useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
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
import { Loader } from "@/components/ui/loaders";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/models/SocialAccount";

type GenerateTextResponse = {
  content: string;
};

type GenerateImageResponse = {
  id: string;
  fileUrl: string;
  fileName: string;
  cloudinaryPublicId: string;
};

export function AiTestPanel() {
  const [prompt, setPrompt] = useState(
    "Announce our new AI-powered social scheduling feature for small businesses.",
  );
  const [platform, setPlatform] = useState<SocialPlatform>("linkedin");
  const [tone, setTone] = useState("professional");
  const [generatedText, setGeneratedText] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  async function handleGenerateText() {
    setIsGeneratingText(true);

    try {
      const data = await apiClient<GenerateTextResponse>("/api/ai/generate-text", {
        method: "POST",
        body: JSON.stringify({ prompt, platform, tone }),
      });

      setGeneratedText(data.content);
      toast.success("Text generated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to generate text";
      toast.error(message);
    } finally {
      setIsGeneratingText(false);
    }
  }

  async function handleGenerateImage() {
    setIsGeneratingImage(true);

    try {
      const data = await apiClient<GenerateImageResponse>(
        "/api/ai/generate-image",
        {
          method: "POST",
          body: JSON.stringify({ prompt }),
        },
      );

      setGeneratedImageUrl(data.fileUrl);
      toast.success("Image generated and saved to media library");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to generate image";
      toast.error(message);
    } finally {
      setIsGeneratingImage(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">AI Test</h1>
        <p className="text-sm text-muted-foreground">
          Verify Gemini key rotation, text generation, and Cloudinary uploads
          before building the post editor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompt</CardTitle>
          <CardDescription>
            Shared prompt for both text and image generation tests.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ai-prompt">Prompt</Label>
            <Textarea
              id="ai-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              className="min-h-28"
              disabled={isGeneratingText || isGeneratingImage}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ai-platform">Platform</Label>
              <Select
                value={platform}
                onValueChange={(value) => setPlatform(value as SocialPlatform)}
                disabled={isGeneratingText || isGeneratingImage}
              >
                <SelectTrigger id="ai-platform" className="h-11 w-full">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_PLATFORMS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ai-tone">Tone</Label>
              <Input
                id="ai-tone"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="h-11"
                disabled={isGeneratingText || isGeneratingImage}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="h-11 flex-1"
              disabled={isGeneratingText || isGeneratingImage || !prompt.trim()}
              onClick={handleGenerateText}
            >
              {isGeneratingText ? (
                <>
                  <Loader size="sm" label="Generating text" />
                  Generating text...
                </>
              ) : (
                "Generate Text"
              )}
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="h-11 flex-1"
              disabled={isGeneratingText || isGeneratingImage || !prompt.trim()}
              onClick={handleGenerateImage}
            >
              {isGeneratingImage ? (
                <>
                  <Loader size="sm" label="Generating image" />
                  Generating image...
                </>
              ) : (
                "Generate Image"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedText ? (
        <Card>
          <CardHeader>
            <CardTitle>Generated Text</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{generatedText}</p>
          </CardContent>
        </Card>
      ) : null}

      {generatedImageUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>Generated Image</CardTitle>
          </CardHeader>
          <CardContent>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedImageUrl}
              alt="AI generated preview"
              className="max-h-96 w-full rounded-lg object-contain"
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
