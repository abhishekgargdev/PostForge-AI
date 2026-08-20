import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

import type { PostGoal } from "@/lib/validation/ai";
import { POST_GOAL_LABELS } from "@/lib/validation/ai";
import type { PostTone } from "@/lib/validation/posts";
import type { SocialPlatform } from "@/models/SocialAccount";
import { connectDB } from "@/lib/db";
import { createAiGenerationFailureNotification } from "@/lib/notifications/create";

export const DEFAULT_SYSTEM_PROMPT =
  "You are the content assistant inside PostForge AI, writing social posts on behalf of a professional user. Always write in clear, natural human language — no corporate filler, no excessive emoji, no hashtag spam (max 3-5 relevant hashtags only if the platform benefits from them). Match the requested tone exactly. Never fabricate statistics, quotes, or claims the user didn't provide. Keep sentences scannable on mobile.";

const KEY_ENV_NAMES = [
  "GEMINI_API_KEY_1",
  "GEMINI_API_KEY_2",
  "GEMINI_API_KEY_3",
  "GEMINI_API_KEY_4",
  "GEMINI_API_KEY_5",
  "GEMINI_API_KEY_6",
] as const;

export const KEY_POOL = KEY_ENV_NAMES.map((name) => process.env[name]?.trim()).filter(
  (key): key is string => Boolean(key),
);

function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

function getGeminiImageModelName(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || "imagen-3.0-generate-002";
}

const TEXT_MODEL = getGeminiModelName();
const IMAGE_MODEL = getGeminiImageModelName();

const PLATFORM_CHAR_LIMITS: Record<SocialPlatform, number> = {
  linkedin: 3000,
  twitter: 280,
  facebook: 63000,
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  facebook: "Facebook",
};

let currentKeyIndex = 0;

type GenerateTextInput = {
  platform: SocialPlatform;
  topic?: string;
  goal?: PostGoal;
  keyPoints?: string;
  tone: PostTone;
  customPrompt?: string;
};

type GenerateImageInput = {
  prompt: string;
  userId?: string;
};

export type GenerateImageResult =
  | { success: true; imageBuffer: Buffer; mimeType: string; model: string }
  | { success: false; errorCode: string; message: string };

type ExtendedGenerationConfig = {
  responseModalities?: string[];
};

function getCurrentKey(): string {
  if (KEY_POOL.length === 0) {
    throw new Error(
      "No Gemini API keys configured. Set GEMINI_API_KEY_1..6 in your environment.",
    );
  }

  return KEY_POOL[currentKeyIndex % KEY_POOL.length];
}

function advanceKey(): void {
  if (KEY_POOL.length === 0) {
    return;
  }

  currentKeyIndex = (currentKeyIndex + 1) % KEY_POOL.length;
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

export function isRetryableGeminiError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 429 || (status !== undefined && status >= 500)) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("rate-limit") ||
    message.includes("resource exhausted") ||
    message.includes("resource_exhausted") ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("500") ||
    message.includes("504")
  );
}

export async function generateWithRotation<T>(
  fn: (apiKey: string) => Promise<T>,
): Promise<T> {
  if (KEY_POOL.length === 0) {
    throw new Error(
      "No Gemini API keys configured. Set GEMINI_API_KEY_1..6 in your environment.",
    );
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < KEY_POOL.length; attempt += 1) {
    const key = KEY_POOL[currentKeyIndex];

    try {
      const result = await fn(key);
      return result;
    } catch (error) {
      lastError = error;

      if (!isRetryableGeminiError(error)) {
        throw error;
      }

      if (attempt < KEY_POOL.length - 1) {
        advanceKey();
      }
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : "Unknown Gemini API error";

  throw new Error(
    `All ${KEY_POOL.length} Gemini API keys exhausted. Last error: ${detail}`,
  );
}

export function isGeminiKeysExhaustedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("Gemini API keys exhausted")
  );
}

export function getTextModel(apiKey?: string): GenerativeModel {
  const key = apiKey ?? getCurrentKey();
  const genAI = new GoogleGenerativeAI(key);

  return genAI.getGenerativeModel({
    model: getGeminiModelName(),
  });
}

export function getImageModel(apiKey?: string): GenerativeModel {
  const key = apiKey ?? getCurrentKey();
  const genAI = new GoogleGenerativeAI(key);

  return genAI.getGenerativeModel({
    model: getGeminiImageModelName(),
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    } as ExtendedGenerationConfig as never,
  });
}

function buildTextSystemInstruction(
  platform: SocialPlatform,
  tone: PostTone,
): string {
  const limit = PLATFORM_CHAR_LIMITS[platform];
  const platformLabel = PLATFORM_LABELS[platform];

  return [
    DEFAULT_SYSTEM_PROMPT,
    `Write a single ${platformLabel} post in a ${tone} tone.`,
    `Stay within ${limit} characters including spaces and hashtags.`,
    `Return only the post text with no markdown fences, labels, or commentary.`,
    `Do not exceed the ${platformLabel} character limit under any circumstance.`,
  ].join("\n\n");
}

function buildStructuredGenerationRequest({
  topic,
  goal,
  keyPoints,
  tone,
  platform,
}: Required<
  Pick<GenerateTextInput, "topic" | "goal" | "tone" | "platform">
> &
  Pick<GenerateTextInput, "keyPoints">): string {
  const limit = PLATFORM_CHAR_LIMITS[platform];
  const platformLabel = PLATFORM_LABELS[platform];
  const goalLabel = POST_GOAL_LABELS[goal];
  const keyPointLines = keyPoints
    ?.split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = [
    `Create a ${platformLabel} post about: ${topic}`,
    `Goal: ${goalLabel}`,
    `Tone: ${tone}`,
  ];

  if (keyPointLines?.length) {
    sections.push(
      "Key points to include (one per line):",
      ...keyPointLines.map((line) => `- ${line}`),
    );
  }

  sections.push(
    `Keep the post within ${limit} characters including spaces and hashtags.`,
    "Return only the final post text.",
  );

  return sections.join("\n\n");
}

function buildGenerationPrompt(input: GenerateTextInput): string {
  if (input.customPrompt?.trim()) {
    return input.customPrompt.trim();
  }

  if (!input.topic || !input.goal) {
    throw new Error("Topic and goal are required when customPrompt is not provided.");
  }

  return buildStructuredGenerationRequest({
    topic: input.topic,
    goal: input.goal,
    keyPoints: input.keyPoints,
    tone: input.tone,
    platform: input.platform,
  });
}

function extractGeneratedText(result: Awaited<
  ReturnType<GenerativeModel["generateContent"]>
>): string {
  const text = result.response.text()?.trim();

  if (!text) {
    throw new Error("Gemini returned empty text.");
  }

  return text;
}

function extractGeneratedImageBuffer(result: Awaited<
  ReturnType<GenerativeModel["generateContent"]>
>): Buffer {
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  throw new Error("Gemini returned no image data.");
}

export async function generateText(input: GenerateTextInput): Promise<string> {
  const prompt = buildGenerationPrompt(input);

  return generateWithRotation(async (apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: getGeminiModelName(),
      systemInstruction: buildTextSystemInstruction(input.platform, input.tone),
    });
    const result = await model.generateContent(prompt);

    return extractGeneratedText(result);
  });
}

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  const modelName = getGeminiImageModelName();

  try {
    const result = await generateWithRotation(async (apiKey) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: input.prompt }],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        const error = new Error(`Gemini Image API error: ${errorText || response.statusText}`);
        (error as any).status = status;
        throw error;
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      let imagePart = null;

      for (const p of parts) {
        if (p.inlineData?.data) {
          imagePart = p;
          break;
        }
      }

      if (!imagePart) {
        throw new Error("Gemini returned no inline image data.");
      }

      const base64Data = imagePart.inlineData.data;
      const mimeType = imagePart.inlineData.mimeType || "image/png";

      return {
        buffer: Buffer.from(base64Data, "base64"),
        mimeType,
      };
    });

    return {
      success: true,
      imageBuffer: result.buffer,
      mimeType: result.mimeType,
      model: modelName,
    };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Unknown image generation error";
    const status = error.status ? String(error.status) : "GENERATE_IMAGE_FAILED";

    console.error(`generateImage failed for model ${modelName}. Error:`, message);

    if (input.userId && (isRetryableGeminiError(error) || message.includes("exhausted"))) {
      try {
        await connectDB();
        await createAiGenerationFailureNotification({
          userId: input.userId,
          generationType: "image",
          errorMessage: message,
        });
      } catch (dbErr) {
        console.error("Failed to create error notification in generateImage:", dbErr);
      }
    }

    return {
      success: false,
      errorCode: status,
      message,
    };
  }
}

export { TEXT_MODEL, IMAGE_MODEL, PLATFORM_CHAR_LIMITS };
