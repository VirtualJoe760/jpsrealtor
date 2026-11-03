// POST /api/agent/listing-posts/generate
// Body: { listingKey, slugAddress?, postType: "open-house" | "listing",
//         openHouse?: { date, startTime, endTime, notes } }
//
// Drafts the copy for a CMS "listing blog post" from the listing's live MLS
// facts (Groq, same model as /api/articles/generate). Returns CMS form fields;
// nothing is saved here — the editor saves through /api/articles/publish.
//
// The copy is written ONLY from the facts passed in. The listing belongs to
// another brokerage, so the prompt forbids invented claims and editorializing,
// and the photos are referenced as-is (featured image = the listing's own
// primary photo URL, never re-uploaded or edited).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createChatCompletion, GROQ_MODELS, GroqTool } from "@/lib/groq";
import { digestAIResponse } from "@/lib/article-digester";
import { loadListingPostData } from "@/lib/listings/listing-post";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401, headers: NO_STORE });
  }

  try {
    const body = await req.json();
    const listingKey = String(body.listingKey || "").trim();
    const postType: "open-house" | "listing" = body.postType === "open-house" ? "open-house" : "listing";
    const oh = body.openHouse || {};
    const openHouse =
      postType === "open-house"
        ? {
            date: String(oh.date || "").slice(0, 10),
            startTime: String(oh.startTime || "").slice(0, 20),
            endTime: String(oh.endTime || "").slice(0, 20),
            notes: String(oh.notes || "").slice(0, 300),
          }
        : undefined;

    if (!listingKey) {
      return NextResponse.json({ error: "Pick a listing address first." }, { status: 400, headers: NO_STORE });
    }
    if (postType === "open-house" && (!openHouse?.date || !openHouse.startTime)) {
      return NextResponse.json({ error: "An open-house post needs a date and start time." }, { status: 400, headers: NO_STORE });
    }

    const data = await loadListingPostData({ listingKey, slugAddress: body.slugAddress });
    if (!data) {
      return NextResponse.json({ error: "That listing could not be found." }, { status: 404, headers: NO_STORE });
    }
    const l = data.listing;
    if (l.standardStatus && l.standardStatus !== "Active") {
      return NextResponse.json({ error: `That listing is ${l.standardStatus}, not Active.` }, { status: 400, headers: NO_STORE });
    }

    const address = l.unparsedAddress || l.unparsedFirstLineAddress || l.address || "";
    const beds = l.bedroomsTotal ?? l.bedsTotal;
    const baths = l.bathroomsTotalInteger ?? l.bathsTotal;
    const facts = [
      `Address: ${address}`,
      l.city && `City: ${l.city}`,
      l.subdivisionName && `Community / subdivision: ${l.subdivisionName}`,
      l.listPrice && `List price: $${Number(l.listPrice).toLocaleString()}`,
      beds != null && `Bedrooms: ${beds}`,
      baths != null && `Bathrooms: ${baths}`,
      l.livingArea && `Living area: ${Number(l.livingArea).toLocaleString()} sq ft`,
      l.lotSizeSqft && `Lot: ${Number(l.lotSizeSqft).toLocaleString()} sq ft`,
      l.yearBuilt && `Year built: ${l.yearBuilt}`,
      (l.poolYN || l.pool) && `Private pool: yes`,
      (l.spaYN || l.spa) && `Spa: yes`,
      l.hoaFee && `HOA: $${l.hoaFee}${l.hoaFeeFrequency ? ` ${l.hoaFeeFrequency}` : ""}`,
      l.publicRemarks && `MLS remarks: ${String(l.publicRemarks).slice(0, 1500)}`,
      data.subdivision?.description && `About the community: ${String(data.subdivision.description).slice(0, 600)}`,
      data.city?.description && `About the city: ${String(data.city.description).slice(0, 400)}`,
    ]
      .filter(Boolean)
      .join("\n");

    const ohLine =
      postType === "open-house" && openHouse
        ? `OPEN HOUSE: ${openHouse.date}, ${openHouse.startTime}${openHouse.endTime ? `–${openHouse.endTime}` : ""}${openHouse.notes ? ` (${openHouse.notes})` : ""}`
        : "";

    const tools: GroqTool[] = [
      {
        type: "function",
        function: {
          name: "generate_listing_post",
          description: "Write a blog post advertising one property listing",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Headline (10-90 chars) naming the address or community" },
              excerpt: { type: "string", description: "One or two sentences, 80-280 chars" },
              content: { type: "string", description: "Markdown body, 350-600 words. ## headings, short paragraphs. Do not repeat the title as a heading." },
              altText: { type: "string", description: "Alt text for the listing's front photo" },
              metaTitle: { type: "string", description: "SEO title, max 60 chars" },
              metaDescription: { type: "string", description: "SEO description, 80-160 chars" },
              keywords: { type: "array", items: { type: "string" }, description: "5-8 keywords: address, city, community, property type" },
            },
            required: ["title", "excerpt", "content", "altText", "metaTitle", "metaDescription", "keywords"],
          },
        },
      },
    ];

    const systemPrompt = `You write blog posts that advertise a single real-estate listing${postType === "open-house" ? " and its open house" : ""}.

RULES:
- Use ONLY the facts provided. Never invent features, numbers, schools, views, upgrades or distances.
- Present facts neutrally and professionally. No hype words like "stunning" or "must-see", and never comment on the price, days on market, or the listing agent.
- Do not include phone numbers, emails, links, or calls to "contact" anyone — the page adds its own registration form.
- Do not use HTML, JSX, or angle brackets. Plain Markdown only.
- Sections to include: an opening paragraph, "## The Home", "## The Community"${postType === "open-house" ? ', "## Open House Details" (restate the date and time exactly as given)' : ""}, and a short closing paragraph inviting readers to register below${postType === "open-house" ? " for the open house" : " for more details"}.`;

    const userPrompt = `${ohLine ? ohLine + "\n\n" : ""}LISTING FACTS:\n${facts}\n\nUse the generate_listing_post tool.`;

    let completion: any;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        completion = await Promise.race([
          createChatCompletion({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            model: GROQ_MODELS.PREMIUM,
            temperature: 0.5,
            maxTokens: 3000,
            tools,
            tool_choice: { type: "function", function: { name: "generate_listing_post" } },
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), 50000)),
        ]);
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const call = completion?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return NextResponse.json({ error: "No post generated. Please try again." }, { status: 500, headers: NO_STORE });
    }
    const digested = await digestAIResponse(JSON.parse(call.function.arguments), "listing-post");
    if (!digested.validation.isValid) {
      return NextResponse.json({ success: false, errors: digested.validation.errors }, { status: 400, headers: NO_STORE });
    }

    // Deterministic, per-agent slug. Article slugs are globally unique and the
    // publish upserts by slug, so a title-derived slug would let a second agent
    // posting the same address overwrite the first agent's post.
    const base = slugify(l.slugAddress || address || listingKey).slice(0, 80);
    const suffix = String(session.user.id).slice(-6);
    const slugId =
      postType === "open-house" && openHouse?.date
        ? `${base}-open-house-${openHouse.date}-${suffix}`
        : `${base}-${suffix}`;

    // The page already shows the title as its H1; the model sometimes opens
    // the body with a near-copy of it anyway (seen in the 2026-11-03 test, not
    // always word-for-word). Sections are ##, so a leading single-# line is
    // always that duplicate.
    const content = digested.content.replace(/^\s*#\s+[^\n]*\n+/, "");

    const photo = data.photos[0]?.src || l.primaryPhotoUrl || "";

    return NextResponse.json(
      {
        success: true,
        warnings: digested.validation.warnings,
        article: {
          slugId,
          title: digested.title,
          excerpt: digested.excerpt,
          content,
          category: "listing-post",
          tags: ["listing-post", postType === "open-house" ? "open-house" : "listing", l.city].filter(Boolean),
          featuredImage: {
            url: photo,
            // Not a Cloudinary asset: the listing's own MLS-hosted photo.
            publicId: `mls-listing/${listingKey}`,
            alt: digested.altText || address,
          },
          seo: {
            title: digested.metaTitle,
            description: digested.metaDescription,
            keywords: digested.keywords || [],
          },
          listingPost: {
            listingKey,
            slugAddress: l.slugAddress || undefined,
            address,
            postType,
            ...(openHouse ? { openHouse } : {}),
          },
        },
      },
      { headers: NO_STORE }
    );
  } catch (error: any) {
    console.error("[listing-posts/generate]", error);
    return NextResponse.json(
      { error: "Failed to generate listing post", details: error?.message },
      { status: 500, headers: NO_STORE }
    );
  }
}
