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

export async function uploadImageBuffer(
  buffer: Buffer,
  folder: string,
): Promise<CloudinaryUploadResult> {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
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

export async function deleteImage(publicId: string): Promise<void> {
  ensureCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

export { cloudinary };
