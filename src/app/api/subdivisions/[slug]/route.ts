// src/app/api/subdivisions/[slug]/route.ts
// API route for getting single subdivision details

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await dbConnect();

  try {
    const { slug } = await params;

    // Support city filter to handle duplicate subdivision names (e.g. "Downtown")
    const { searchParams } = new URL(req.url);
    const cityParam = searchParams.get("city");
    let subdivision;
    if (cityParam) {
      const candidates = await Subdivision.find({ slug }).lean();
      const citySlug = cityParam.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
      subdivision = candidates.find((s: any) => {
        const sCitySlug = (s.city || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
        return sCitySlug === citySlug || sCitySlug === cityParam;
      }) || candidates[0];
    } else {
      subdivision = await Subdivision.findOne({ slug }).lean();
    }

    if (!subdivision) {
      return NextResponse.json(
        { error: "Subdivision not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ subdivision });
  } catch (error) {
    console.error("❌ Error fetching subdivision:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
