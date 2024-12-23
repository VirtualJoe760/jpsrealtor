import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, publicId } = await req.json();

    // Environment variables for Cloudinary
    const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
    const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "default_preset";

    // Form data for Cloudinary upload
    const formData = new URLSearchParams();
    formData.append("file", imageUrl);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("public_id", publicId);

    // Send POST request to Cloudinary
    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload image to Cloudinary.");
    }

    const data = await response.json();
    return NextResponse.json({ success: true, cloudinaryUrl: data.secure_url });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Cloudinary Upload Error:", error.message);
      return NextResponse.json({ success: false, error: error.message });
    }

    console.error("Cloudinary Upload Error:", error);
    return NextResponse.json({ success: false, error: "Unknown error occurred." });
  }
}
