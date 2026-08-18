import { v2 as cloudinary } from "cloudinary";

import { getEnv } from "@/lib/env";

let isConfigured = false;

function ensureCloudinaryConfigured(): void {
  if (isConfigured) {
    return;
  }

  getEnv();
  cloudinary.config();
  isConfigured = true;
}

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

type UploadImageOptions = {
  transformation?: Array<Record<string, string | number>>;
};

export async function uploadImageBuffer(
  buffer: Buffer,
  folder: string,
  options: UploadImageOptions = {},
): Promise<CloudinaryUploadResult> {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: options.transformation ?? [
          { width: 2000, height: 2000, crop: "limit", quality: "auto:good" },
        ],
      },
      (error, result) => {
        if (error || !result?.secure_url || !result.public_id) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    uploadStream.end(buffer);
  });
}

export function buildThumbnailUrl(publicId: string): string {
  ensureCloudinaryConfigured();

  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "auto" },
      { quality: "auto:good", fetch_format: "auto" },
    ],
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  ensureCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

export { cloudinary };
