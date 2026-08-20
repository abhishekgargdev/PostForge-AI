import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  generateWithRotation,
  getGeminiModelName,
  DEFAULT_SYSTEM_PROMPT,
  PLATFORM_CHAR_LIMITS,
  generateImage,
} from "@/lib/ai/gemini-client";
import type { SocialPlatform } from "@/models/SocialAccount";
import { uploadImageBuffer, buildThumbnailUrl } from "@/lib/cloudinary";
import MediaLibrary from "@/models/MediaLibrary";

export type PlanEntry = {
  topic: string;
  category: string;
  subtopic: string;
  format: string;
  targetAudience: string;
  contentAngle: string;
};

export type GeneratedPostResult = {
  topic: string;
  category: string;
  subtopic: string;
  format: string;
  targetAudience: string;
  contentAngle: string;
  platformContent: Partial<Record<SocialPlatform, string>>;
  imageUrl?: string;
  mediaLibraryId?: string;
  imageStatus?: "pending" | "success" | "failed" | "none";
  error?: string;
};

// Trigram overlap duplicate check
function getTrigrams(str: string): Set<string> {
  const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  const trigrams = new Set<string>();
  for (let i = 0; i < normalized.length - 2; i++) {
    trigrams.add(normalized.slice(i, i + 3));
  }
  return trigrams;
}

function calculateSimilarity(str1: string, str2: string): number {
  const set1 = getTrigrams(str1);
  const set2 = getTrigrams(str2);
  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

// Layer 1: Generate batch plan array
export async function generateCampaignPlan(params: {
  topics: string[];
  count: number;
  style: string;
  format: string;
  targetAudience: string;
}): Promise<PlanEntry[]> {
  const { topics, count, style, format, targetAudience } = params;

  return generateWithRotation(async (apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: getGeminiModelName(),
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const formatInstruction =
      format === "Auto Select"
        ? "Vary the 'format' field across entries using formats like Explainer, Top 5, Comparison, Case Study, Developer Tips, Myth vs Reality, Beginner Guide."
        : `Always use "${format}" for the 'format' field.`;

    const prompt = `You are a social content planner. Create a JSON array of post plan entries with exactly ${count} items based on these topics: ${topics.join(", ")}.
    
    Generation guidelines:
    1. Distribute topics evenly across the ${count} entries. Do not just use the first topic.
    2. Target audience: ${targetAudience === "Auto" ? "Determine appropriate tech/business audience per topic" : targetAudience}.
    3. Style/Tone constraint: ${style}.
    4. Format constraint: ${formatInstruction}.
    5. Content Angles: Rotate through different angles so no two consecutive posts share the same angle (e.g. "common mistake", "practical lesson", "future implication", "comparison", "did you know").

    Return ONLY a JSON array matching this TypeScript type:
    Array<{
      topic: string;
      category: string;
      subtopic: string;
      format: string;
      targetAudience: string;
      contentAngle: string;
    }>`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text) {
      throw new Error("Gemini returned empty plan text.");
    }

    try {
      const plan = JSON.parse(text) as PlanEntry[];
      if (!Array.isArray(plan)) {
        throw new Error("Parsed response is not a plan array.");
      }
      return plan.slice(0, count);
    } catch (parseError) {
      console.error("Plan parsing failed. Raw response:", text);
      throw new Error("Failed to parse campaign plan JSON from Gemini.");
    }
  });
}

// Layer 2: Write post copy for a plan entry
export async function writePostForPlan(params: {
  plan: PlanEntry;
  style: string;
  platforms: SocialPlatform[];
  diffFrom?: string;
}): Promise<Record<SocialPlatform, string>> {
  const { plan, style, platforms, diffFrom } = params;

  const platformContent: Partial<Record<SocialPlatform, string>> = {};

  for (const platform of platforms) {
    const limit = PLATFORM_CHAR_LIMITS[platform];

    const content = await generateWithRotation(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      const systemInstruction = [
        DEFAULT_SYSTEM_PROMPT,
        `Write a post for ${platform} matching the following plan specifics:`,
        `- Topic: ${plan.topic}`,
        `- Target Audience: ${plan.targetAudience}`,
        `- Angle: ${plan.contentAngle}`,
        `- Format: ${plan.format}`,
        `- Tone/Style: ${style}`,
        `Character limit: Keep the post strictly within ${limit} characters including hashtags.`,
        `Output guidelines: Return only the text of the post. Do not include titles, markdown fences, notes, or meta commentary.`,
      ].join("\n");

      const model = genAI.getGenerativeModel({
        model: getGeminiModelName(),
        systemInstruction,
      });

      let prompt = `Write the social post copy based on the plan.`;
      if (diffFrom) {
        prompt += `\n\nCRITICAL: Make this post meaningfully different in structure, hook, and opening line from: "${diffFrom}"`;
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text()?.trim();
      if (!text) {
        throw new Error(`Gemini returned empty post text for ${platform}.`);
      }
      return text;
    });

    platformContent[platform] = content;
  }

  return platformContent as Record<SocialPlatform, string>;
}

// Run Layer 1 + Layer 2 campaign generation
export async function generateCampaignBatch(params: {
  topics: string[];
  count: number;
  style: string;
  format: string;
  targetAudience: string;
  platforms: SocialPlatform[];
  generateImages?: boolean;
  userId?: string;
}): Promise<{
  succeeded: GeneratedPostResult[];
  failed: { planIndex: number; topic: string; reason: string }[];
}> {
  const { topics, count, style, format, targetAudience, platforms, generateImages, userId } = params;

  // 1. Generate plan array (Layer 1)
  const plan = await generateCampaignPlan({ topics, count, style, format, targetAudience });
  
  const succeeded: GeneratedPostResult[] = [];
  const failed: { planIndex: number; topic: string; reason: string }[] = [];

  // 2. Generate copy sequentially to respect rate limits (Layer 2)
  for (let i = 0; i < plan.length; i++) {
    const entry = plan[i];
    try {
      let platformContent = await writePostForPlan({ plan: entry, style, platforms });

      // 3. Duplicate check across previous successes
      let attempts = 0;
      let isDuplicate = true;
      
      while (isDuplicate && attempts < 2) {
        isDuplicate = false;
        
        // Combine text of this post to check similarity
        const combinedThis = Object.values(platformContent).join("\n");

        for (const prev of succeeded) {
          const combinedPrev = Object.values(prev.platformContent).join("\n");
          const similarity = calculateSimilarity(combinedThis, combinedPrev);
          
          if (similarity > 0.8) {
            isDuplicate = true;
            // Get opening line of previous post
            const firstLinePrev = Object.values(prev.platformContent)[0]?.split("\n")[0] || "";
            // Regenerate this post with explicit diff instructions
            platformContent = await writePostForPlan({
              plan: entry,
              style,
              platforms,
              diffFrom: firstLinePrev,
            });
            break;
          }
        }
        attempts++;
      }

      // 4. Optionally generate image (fails gracefully)
      let imageUrl: string | undefined = undefined;
      let mediaLibraryId: string | undefined = undefined;
      let imageStatus: "pending" | "success" | "failed" | "none" = "none";

      if (generateImages) {
        imageStatus = "pending";
        try {
          const imgPrompt = `A high quality, professional, conceptual modern graphic representing: ${entry.topic}`;
          const imgResult = await generateImage({ prompt: imgPrompt, userId });
          
          if (imgResult.success) {
            const upload = await uploadImageBuffer(
              imgResult.imageBuffer,
              "postforge/ai-generated",
            );
            const thumbnailUrl = buildThumbnailUrl(upload.publicId);
            const fileName = `ai-batch-${Date.now()}.png`;

            const media = await MediaLibrary.create({
              userId,
              fileName,
              fileType: "image",
              fileUrl: upload.secureUrl,
              thumbnailUrl,
              source: "ai-generated",
              aiPrompt: imgPrompt,
              cloudinaryPublicId: upload.publicId,
            });

            imageUrl = upload.secureUrl;
            mediaLibraryId = media._id.toString();
            imageStatus = "success";
          } else {
            imageStatus = "failed";
          }
        } catch (imgErr) {
          console.error("Batch image generation failed for topic:", entry.topic, imgErr);
          imageStatus = "failed";
        }
      }

      succeeded.push({
        ...entry,
        platformContent,
        imageUrl,
        mediaLibraryId,
        imageStatus,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown writer error";
      failed.push({
        planIndex: i,
        topic: entry.topic,
        reason,
      });
    }
  }

  return { succeeded, failed };
}
