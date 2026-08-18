import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

import type { SocialPlatform } from "@/models/SocialAccount";

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

const TEXT_MODEL = getGeminiModelName();
const IMAGE_MODEL = getGeminiModelName();

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
  prompt: string;
  platform: SocialPlatform;
  tone: string;
};

type GenerateImageInput = {
  prompt: string;
};

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
    model: getGeminiModelName(),
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    } as ExtendedGenerationConfig as never,
  });
}

function buildTextSystemInstruction(
  platform: SocialPlatform,
  tone: string,
): string {
  const limit = PLATFORM_CHAR_LIMITS[platform];
  const platformLabel = PLATFORM_LABELS[platform];

  return [
    `You are PostForge AI, a social media copywriter.`,
    `Write a single ${platformLabel} post in a ${tone} tone.`,
    `Stay within ${limit} characters including spaces and hashtags.`,
    `Return only the post text with no markdown fences, labels, or commentary.`,
    `Do not exceed the ${platformLabel} character limit under any circumstance.`,
  ].join(" ");
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

export async function generateText({
  prompt,
  platform,
  tone,
}: GenerateTextInput): Promise<string> {
  return generateWithRotation(async (apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: getGeminiModelName(),
      systemInstruction: buildTextSystemInstruction(platform, tone),
    });
    const result = await model.generateContent(prompt);

    return extractGeneratedText(result);
  });
}

export async function generateImage({ prompt }: GenerateImageInput): Promise<Buffer> {
  return generateWithRotation(async (apiKey) => {
    const model = getImageModel(apiKey);
    const result = await model.generateContent(prompt);
    return extractGeneratedImageBuffer(result);
  });
}

export { TEXT_MODEL, IMAGE_MODEL, PLATFORM_CHAR_LIMITS };
