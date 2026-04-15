import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { createChatCompletion, GROQ_MODELS } from "@/lib/groq";

export const dynamic = "force-dynamic";

/**
 * GET /api/cma/subdivision/[slug]/narrative
 *
 * Returns an AI-generated market narrative for a subdivision's CMA data.
 * Caches the result on the doc as cmaStats.narrative + cmaStats.narrativeGeneratedAt.
 * Regenerates if stale (>24h) or missing.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    await dbConnect();

    const doc = await Subdivision.findOne(
      { slug, retired: { $ne: true } },
      { name: 1, city: 1, county: 1, region: 1, cmaStats: 1 }
    ).lean() as any;

    if (!doc?.cmaStats) {
      return NextResponse.json(
        { error: "No CMA data available" },
        { status: 404 }
      );
    }

    // Check cache — return if fresh (< 24 hours old)
    const narrativeAge = doc.cmaStats.narrativeGeneratedAt
      ? Date.now() - new Date(doc.cmaStats.narrativeGeneratedAt).getTime()
      : Infinity;
    const STALE_MS = 24 * 60 * 60 * 1000;

    if (doc.cmaStats.narrative && narrativeAge < STALE_MS) {
      return NextResponse.json({ narrative: doc.cmaStats.narrative });
    }

    // Build context for Groq
    const stats = doc.cmaStats;
    const context = JSON.stringify({
      subdivision: doc.name,
      city: doc.city,
      region: doc.region,
      totals: stats.totals,
      active: stats.active,
      closed: stats.closed,
      bySubType: stats.bySubType,
      profile: stats.profile,
      quality: stats.quality,
    });

    const response = await createChatCompletion({
      model: GROQ_MODELS.FREE,
      messages: [
        {
          role: "system",
          content: `You are a real estate market analyst writing for a public-facing community page. Given CMA stats for a subdivision, write a concise 2-3 paragraph narrative explaining what these numbers mean for buyers and sellers. Be specific with numbers — cite median prices, days on market, sale-to-list ratios, and inventory counts. Compare active vs closed metrics to show market direction. Mention property type breakdown if there are multiple types. Write in a professional but approachable tone. No markdown headings, no bullet points — flowing paragraphs only. Do not start with the subdivision name.`,
        },
        {
          role: "user",
          content: `Write a market narrative for ${doc.name} in ${doc.city}, ${doc.region}. Here is the CMA data:\n\n${context}`,
        },
      ],
      temperature: 0.4,
      maxTokens: 600,
    });

    const narrative =
      response.choices?.[0]?.message?.content?.trim() || "";

    if (!narrative) {
      return NextResponse.json(
        { error: "Failed to generate narrative" },
        { status: 500 }
      );
    }

    // Cache on the document
    await Subdivision.updateOne(
      { _id: doc._id },
      {
        $set: {
          "cmaStats.narrative": narrative,
          "cmaStats.narrativeGeneratedAt": new Date(),
        },
      }
    );

    return NextResponse.json({ narrative });
  } catch (error) {
    console.error("[GET /api/cma/subdivision/narrative] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
