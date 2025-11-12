// src/app/api/subdivisions/[slug]/route.ts
// API route for getting single subdivision details

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  await dbConnect();

  try {
    const { slug } = params;

    const subdivision = await Subdivision.findOne({ slug }).lean();

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
