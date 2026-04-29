// GET /api/platform/homepage — Public homepage config (no auth, cached)

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PlatformConfig from "@/models/PlatformConfig";

const DEFAULTS = {
  hero: {
    headline: "Find Your Perfect Home with AI-Powered Search",
    subheadline: "ChatRealty connects you with top local agents and smart property insights.",
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
    metaTitle: "ChatRealty — AI-Powered Real Estate",
    metaDescription: "Find your perfect home with AI-powered search and top local agents.",
    ogImage: "",
  },
};

export async function GET() {
  await dbConnect();
  const config = await PlatformConfig.findById("homepage")
    .select("-updatedBy -__v")
    .lean();

  const data = config || DEFAULTS;

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300",
    },
  });
}
