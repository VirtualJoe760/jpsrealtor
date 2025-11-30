// src/app/api/articles/[id]/route.ts
// API routes for individual article operations

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";

// GET /api/articles/[id] - Get single article
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const article = await Article.findOne({
      $or: [{ _id: params.id }, { slug: params.id }],
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Check permissions for non-published articles
    const session = await getServerSession(authOptions);
    if (
      article.status !== "published" &&
      !(session?.user as any)?.isAdmin
    ) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Don't increment view count for admin viewing drafts
    if (article.status === "published" && !(session?.user as any)?.isAdmin) {
      await (Article as any).incrementViews(article._id.toString());
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

// PUT /api/articles/[id] - Update article (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!(session?.user as any)?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    await dbConnect();

    const body = await req.json();
    const updates = { ...body };

    // Don't allow updating these fields directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const article = await Article.findByIdAndUpdate(
      params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Article updated successfully",
      article,
    });
  } catch (error) {
    console.error("Error updating article:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

// PATCH /api/articles/[id] - Partial update article (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Reuse PUT logic for PATCH
  return PUT(req, { params });
}

// DELETE /api/articles/[id] - Delete article (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!(session?.user as any)?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    await dbConnect();

    const article = await Article.findByIdAndDelete(params.id);

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Article deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting article:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}
