// src/app/api/upload/route.ts
// Image upload API using Cloudinary

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  uploadArticleFeaturedImage,
  uploadArticleOGImage,
  uploadImage,
  uploadAgentLogo,
} from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // 'featured', 'og', or 'general'

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    let result;

    // Upload based on type
    switch (type) {
      case "featured":
        result = await uploadArticleFeaturedImage(base64);
        break;
      case "og":
        result = await uploadArticleOGImage(base64);
        break;
      case "logo": {
        // Brand marks keep their alpha and are namespaced per agent.
        const variant = formData.get("variant") === "dark" ? "dark" : "light";
        const uploaded = await uploadAgentLogo(
          base64,
          (session.user as any).id || (session.user as any).email,
          variant
        );
        result = {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          width: uploaded.width,
          height: uploaded.height,
        };
        break;
      }
      default:
        result = await uploadImage(base64, "articles/content");
        result = {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        };
    }

    return NextResponse.json({
      message: "Upload successful",
      ...result,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
