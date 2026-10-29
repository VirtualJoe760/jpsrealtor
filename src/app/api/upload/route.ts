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

    // Images only, and under Vercel's request-body limit (4.5 MB) with room
    // to spare. Anything else would be stored on our Cloudinary bill.
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files can be uploaded." }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Images must be under 4 MB." }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    let result;

    // Upload based on type
    switch (type) {
      case "content": {
        // Photos inserted into an article/page body from the CMS editor.
        // Namespaced per agent (jpsrealtor/agents/{userId}/content) so one
        // tenant's media can be counted, capped or deleted without touching
        // anyone else's, and downscaled to ≤2000px wide on the way IN
        // (incoming transformation) so the stored original is web-sized —
        // phone photos are often 4000px+. See docs/integrations/cloudinary-scaling.md.
        const owner = String((session.user as any).id || "unknown");
        const uploaded = await uploadImage(base64, `agents/${owner}/content`, {
          width: 2000,
          crop: "limit",
          quality: "auto:good",
        });
        result = {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          width: uploaded.width,
          height: uploaded.height,
        };
        break;
      }
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
