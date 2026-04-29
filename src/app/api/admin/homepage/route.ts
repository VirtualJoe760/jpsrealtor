// GET /api/admin/homepage — Fetch homepage config (admin)
// PUT /api/admin/homepage — Update homepage config (admin)

import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import PlatformConfig from "@/models/PlatformConfig";

const DEFAULTS = {
  _id: "homepage",
  hero: {
    headline: "",
    subheadline: "",
    ctaText: "Get Started",
    ctaLink: "/auth/signin",
    backgroundImage: "",
    backgroundImageDark: "",
  },
  valueProps: [],
  featuredAgentIds: [],
  featuredCommunities: [],
  testimonials: [],
  customStats: [],
  seo: {
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
  },
};

export async function GET() {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const config = await PlatformConfig.findById("homepage").lean();
  return NextResponse.json(config || DEFAULTS);
}

export async function PUT(request: Request) {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const body = await request.json();

  // Strip fields that shouldn't be set directly
  delete body._id;
  delete body.createdAt;
  delete body.updatedAt;
  delete body.__v;

  const config = await PlatformConfig.findByIdAndUpdate(
    "homepage",
    { ...body, updatedBy: auth.userId },
    { upsert: true, new: true, runValidators: true }
  ).lean();

  return NextResponse.json(config);
}
