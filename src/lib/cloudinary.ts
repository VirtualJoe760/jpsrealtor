// src/lib/cloudinary.ts
// Cloudinary integration for image uploads

import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "duqgao9h8",
  api_key: process.env.CLOUDINARY_API_KEY || "647319725974664",
  api_secret: process.env.CLOUDINARY_API_SECRET || "jAD_D300CJpNN1PyMmuEaWEtiGM",
  secure: true,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  url: string;
}

/**
 * Upload image to Cloudinary from base64 or file buffer
 */
export async function uploadImage(
  file: string | Buffer,
  folder: string = "articles",
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
  } = {}
): Promise<CloudinaryUploadResult> {
  try {
    const uploadOptions: any = {
      folder: `jpsrealtor/${folder}`,
      resource_type: "image",
      transformation: [
        {
          quality: options.quality || "auto",
          fetch_format: "auto",
        },
      ],
    };

    if (options.width || options.height) {
      uploadOptions.transformation[0].width = options.width;
      uploadOptions.transformation[0].height = options.height;
      uploadOptions.transformation[0].crop = options.crop || "limit";
    }

    const result = await cloudinary.uploader.upload(
      typeof file === "string" ? file : `data:image/png;base64,${file.toString("base64")}`,
      uploadOptions
    );

    return result as CloudinaryUploadResult;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image to Cloudinary");
  }
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error("Failed to delete image from Cloudinary");
  }
}

/**
 * Generate optimized image URL with transformations
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  } = {}
): string {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width: options.width,
        height: options.height,
        crop: options.crop || "limit",
        quality: options.quality || "auto",
        fetch_format: options.format || "auto",
      },
    ],
    secure: true,
  });
}

/**
 * Generate responsive image srcset
 */
export function getResponsiveImageSrcSet(
  publicId: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1536]
): string {
  return widths
    .map((width) => {
      const url = getOptimizedImageUrl(publicId, { width });
      return `${url} ${width}w`;
    })
    .join(", ");
}

/**
 * Get image metadata from Cloudinary
 */
export async function getImageMetadata(publicId: string) {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at,
      url: result.secure_url,
    };
  } catch (error) {
    console.error("Failed to fetch image metadata:", error);
    throw new Error("Failed to fetch image metadata");
  }
}

/**
 * Upload article featured image with optimizations
 */
export async function uploadArticleFeaturedImage(
  file: string | Buffer
): Promise<{
  url: string;
  publicId: string;
  width: number;
  height: number;
}> {
  const result = await uploadImage(file, "articles/featured", {
    width: 1200,
    height: 630,
    crop: "fill",
    quality: "auto:good",
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
}

/**
 * Upload article OG image
 */
export async function uploadArticleOGImage(
  file: string | Buffer
): Promise<{
  url: string;
  publicId: string;
}> {
  const result = await uploadImage(file, "articles/og", {
    width: 1200,
    height: 630,
    crop: "fill",
    quality: "auto:good",
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export default cloudinary;
