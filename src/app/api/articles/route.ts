// src/app/api/articles/route.ts
// API routes for article listing and creation

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";

// GET /api/articles - List articles with filtering
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const status = searchParams.get("status") || "published";
    const featured = searchParams.get("featured");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search");

    // Build query
    const query: any = {};

    // Status filter (only admins can see drafts/archived)
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.isAdmin) {
      if (status) query.status = status;
    } else {
      query.status = "published";
    }

    // Category filter
    if (category) query.category = category;

    // Tag filter
    if (tag) query.tags = tag;

    // Year/Month filter
    if (year) query.year = parseInt(year);
    if (month) query.month = parseInt(month);

    // Featured filter
    if (featured === "true") query.featured = true;

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Execute query
    const skip = (page - 1) * limit;
    const [articles, total] = await Promise.all([
      Article.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-content") // Exclude full content in list
        .lean(),
      Article.countDocuments(query),
    ]);

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

// POST /api/articles - Create new article (admin only)
export async function POST(req: NextRequest) {
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

    // Validate required fields
    const {
      title,
      excerpt,
      content,
      category,
      featuredImage,
      seo,
      publishedAt,
      status,
    } = body;

    if (!title || !excerpt || !content || !category || !featuredImage || !seo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create article
    const article = await Article.create({
      title,
      excerpt,
      content,
      category,
      tags: body.tags || [],
      publishedAt: publishedAt || new Date(),
      status: status || "draft",
      featured: body.featured || false,
      featuredImage,
      ogImage: body.ogImage,
      seo,
      author: {
        id: (session.user as any).id,
        name: session.user.name!,
        email: session.user.email!,
      },
      metadata: {
        views: 0,
        readTime: body.readTime || 5,
      },
      scheduledFor: body.scheduledFor,
    });

    return NextResponse.json(
      {
        message: "Article created successfully",
        article,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating article:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
