// src/app/api/test-chat/narrate/route.ts
//
// Sandbox-only narrator endpoint for /test-chat. Runs a single Groq call
// with no tools and no agent loop — just narration over the resolved
// parser output + autocomplete results. Returns 1–2 sentences.
//
// This is a preview of Layer 2 (the narrator) from the search-first
// architecture in docs/chat-production/architecture.md. The production
// chat-v2 still goes through the full agent loop; this is for sandbox
// validation only.

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const NARRATOR_PROMPT = `You are a knowledgeable real estate assistant. The user just asked you something. A deterministic search router has already classified intent, resolved entities, and pulled relevant context. Your job is to ANSWER, not narrate the act of searching.

# Tone
Talk like a knowledgeable agent texting back. Direct, useful, conversational — not a customer-service chatbot.

**Banned openings (these read as robotic):**
- "I pulled..." / "I got..." / "I found..." / "I've pulled..." / "I've found..."
- "Here are..." / "Here's a list of..."
- "Based on..." / "According to my search..."
- Echoing the user's words back ("So you're asking about...")

Just open with the answer or the most useful observation.

# Per-intent behavior

**For insights / educational queries** (intent: insights):
- READ the article titles and excerpts in the context.
- SYNTHESIZE a direct answer to the user's question from the excerpts.
- Lead with the actual answer in the first sentence. E.g., user asks "where is cheap electricity in coachella valley" — open with "IID (Imperial Irrigation District) typically has lower rates than SCE — it serves Coachella, Indio, and La Quinta, while SCE covers the western valley cities like Palm Springs and Rancho Mirage."
- After the answer, mention which article(s) cover it in more depth, naturally.
- If the excerpts don't actually contain the answer, say so honestly and suggest what to try.
- 2-4 sentences total.

**For listing-detail** (specific property):
- Use the AUTHORITATIVE listing-detail data from Layer 1 (price, beds, baths, sqft, subdivision, year built, HOA, DOM). Don't pull data from the autocomplete row — Layer 1's full record is the source of truth.
- Open with what's notable — striking price, distinctive feature, community context.
- Mention the property by address.
- Offer a relevant follow-up (CMA, similar homes, photos).
- 2-3 sentences.

**For listing-search / aggregate / street-listings**:
- ALWAYS quote the totalListings number from "Layer 1 stats" (the AUTHORITATIVE block in the context). NEVER count the autocomplete candidates — they're disambiguation hits, not the matching set. If Layer 1 says 28 listings, say 28 even if autocomplete returned only 6 sample rows.
- Open with the headline observation drawn from Layer 1 stats: count, median or avg price, dominant property type. E.g., "Palm Desert Country Club has 28 active listings averaging $490K, mostly single-family ($530K avg)."
- Mention 1-2 standouts by address/price from the Layer 1 sample listings, OR cite a notable stat (HOA range, $/sqft median).
- If an alternative scope came up in the autocomplete candidates (e.g., a Non-HOA subdivision when filtering on HOA), mention it as a pivot.
- End with a focused follow-up question, but vary the phrasing — don't always say "Want me to filter by..."
- 3-4 sentences.

**For compare**:
- Lead with the actual comparison takeaway, not "I compared X and Y."
- 2-3 sentences.

**For trend** (appreciation / market velocity):
- Quote the AUTHORITATIVE annual and cumulative percentages from "Layer 1 trend stats." Round to one decimal.
- Lead with the headline trend ("PGA West has appreciated 7.3% annually over the past 5 years, with the median rising from $X to $Y"). Use the trend direction word naturally (rising / cooling / steady).
- Mention sample size if confidence is anything other than "high" so the user knows how solid the number is.
- DO NOT invent yearly numbers that aren't in the yearlyData list.
- 2-3 sentences.

**For conversational / unknown / low-confidence**:
- Ask one focused clarifying question that helps narrow. Don't guess.

# Hard rules
- Plain prose only — NO markdown tables, headers, bullet lists.
- DO NOT invent data — only use what's in the context.
- DO NOT meta-narrate the system ("the search router found...", "the parser identified...").
- DO NOT count the autocomplete candidates — they're disambiguation hits, not a count of matches. Always use the totalListings / totalCount from "Layer 1 stats" when present.
- Vary sentence structure across responses — don't fall into a template.`;

function describeContext(body: any): string {
  const { message, parsed, searchResults, preview } = body;
  const parts: string[] = [];

  parts.push(`User typed: "${message}"`);
  parts.push("");
  parts.push("Parser output:");
  parts.push(`  intent: ${parsed?.intent || "unknown"}`);
  parts.push(`  dataset: ${parsed?.dataset || "active"}`);
  parts.push(`  confidence: ${parsed?.confidence?.toFixed(2) ?? "?"}`);

  if (parsed?.entities?.length) {
    parts.push("  entities:");
    for (const e of parsed.entities) {
      const name = e.name || e.street || e.value || e.raw || "?";
      parts.push(`    - ${e.type}: ${name}${e.cityName ? ` (in ${e.cityName})` : ""}`);
    }
  }

  if (parsed?.filters && Object.keys(parsed.filters).length > 0) {
    parts.push(`  filters: ${JSON.stringify(parsed.filters)}`);
  }

  if (parsed?.metric?.length) {
    parts.push(`  trend metrics: ${parsed.metric.join(", ")}`);
  }

  // ---- Layer 1 preview (AUTHORITATIVE — these are the real numbers) ----
  // The preview ran the actual Mongo aggregation against the filtered set;
  // these counts and stats are what the user is seeing in their card UI.
  // The autocomplete results below are NOT counts — they're a few sample
  // hits used for entity disambiguation.
  if (preview?.component === "neighborhood" || preview?.component === "areaStats") {
    const s = preview.stats;
    if (s) {
      parts.push("");
      parts.push("Layer 1 stats (AUTHORITATIVE — quote these numbers, not the search-result count):");
      parts.push(`  scope: ${preview.scope?.type || "?"} ${preview.scope?.value || ""}`);
      parts.push(`  totalListings: ${s.totalListings}`);
      parts.push(`  newListings (7d): ${s.newListingsCount}`);
      parts.push(`  avgPrice: $${s.avgPrice?.toLocaleString?.() ?? s.avgPrice}`);
      parts.push(`  medianPrice: $${s.medianPrice?.toLocaleString?.() ?? s.medianPrice}`);
      if (s.priceRange) {
        parts.push(
          `  priceRange: $${s.priceRange.min?.toLocaleString?.()} – $${s.priceRange.max?.toLocaleString?.()}`
        );
      }
      if (s.medianPricePerSqft) parts.push(`  median $/sqft: $${s.medianPricePerSqft}`);
      if (s.hoa) {
        parts.push(
          `  HOA (${s.hoa.count} listings): $${s.hoa.min}–$${s.hoa.max}/mo, avg $${s.hoa.avg}`
        );
      }
      if (s.amenities) {
        const a = s.amenities;
        const amen = [
          a.poolPct && `${a.poolPct}% pool`,
          a.spaPct && `${a.spaPct}% spa`,
          a.viewPct && `${a.viewPct}% view`,
          a.gatedPct && `${a.gatedPct}% gated`,
        ]
          .filter(Boolean)
          .join(", ");
        if (amen) parts.push(`  amenities: ${amen}`);
      }
      if (Array.isArray(s.propertyTypes) && s.propertyTypes.length > 0) {
        parts.push(
          `  property types: ${s.propertyTypes
            .slice(0, 4)
            .map((p: any) => `${p.count} ${p.subType} (avg $${p.avgPrice?.toLocaleString?.()})`)
            .join(", ")}`
        );
      }
    }
    // Also list the actual listings the preview pulled (not the 8 autocomplete hits)
    if (Array.isArray(preview.listings) && preview.listings.length > 0) {
      parts.push("");
      parts.push(`Sample of ${preview.listings.length} matching listings (from Layer 1):`);
      for (const l of preview.listings.slice(0, 6)) {
        const bits = [
          l.price ? `$${l.price.toLocaleString()}` : null,
          l.beds != null ? `${l.beds}bd` : null,
          l.baths != null ? `${l.baths}ba` : null,
          l.subdivision || l.city || null,
        ]
          .filter(Boolean)
          .join(", ");
        parts.push(`  - ${l.address} (${bits})`);
      }
    }
  } else if (preview?.component === "listingDetail" && preview.listing) {
    const l = preview.listing;
    parts.push("");
    parts.push("Layer 1 listing detail (AUTHORITATIVE — this is the property the user wants):");
    parts.push(`  ${l.address}`);
    if (l.price) parts.push(`  price: $${l.price.toLocaleString()}`);
    if (l.beds != null) parts.push(`  beds: ${l.beds}`);
    if (l.baths != null) parts.push(`  baths: ${l.baths}`);
    if (l.sqft) parts.push(`  sqft: ${l.sqft.toLocaleString()}`);
    if (l.subdivision) parts.push(`  subdivision: ${l.subdivision}`);
    if (l.city) parts.push(`  city: ${l.city}`);
    if (l.yearBuilt) parts.push(`  year built: ${l.yearBuilt}`);
    if (l.associationFee) parts.push(`  HOA: $${l.associationFee}/mo`);
    if (l.daysOnMarket != null) parts.push(`  days on market: ${l.daysOnMarket}`);
  } else if (preview?.component === "compare") {
    parts.push("");
    parts.push("Layer 1 compare stats (AUTHORITATIVE):");
    if (preview.a?.stats) {
      const s = preview.a.stats;
      parts.push(
        `  A (${preview.a.scope?.value || "?"}): ${s.totalListings} listings, avg $${s.avgPrice?.toLocaleString()}, median $${s.medianPrice?.toLocaleString()}`
      );
    }
    if (preview.b?.stats) {
      const s = preview.b.stats;
      parts.push(
        `  B (${preview.b.scope?.value || "?"}): ${s.totalListings} listings, avg $${s.avgPrice?.toLocaleString()}, median $${s.medianPrice?.toLocaleString()}`
      );
    }
  } else if (preview?.component === "trend") {
    const hasRealData = !!(preview.appreciation || preview.marketData);
    if (!hasRealData) {
      // Trend intent fired but the appreciation API returned no data
      // (e.g., 404 — no closed sales for this scope/period). Tell the
      // narrator explicitly so it doesn't fabricate "X% annually" from
      // general knowledge.
      parts.push("");
      parts.push(
        "Layer 1 trend stats: NO DATA AVAILABLE for this scope/period. Reason: " +
          (preview.reason || "appreciation API returned no closed sales")
      );
      parts.push(
        "  → You MUST tell the user honestly that trend data isn't available for this scope. Do NOT invent percentages, medians, or sales counts. Suggest a wider period or a different scope (e.g., the encompassing city)."
      );
    } else {
      parts.push("");
      parts.push(
        "Layer 1 trend stats (AUTHORITATIVE — these are the appreciation numbers, quote them precisely):"
      );
      parts.push(
        `  scope: ${preview.scope?.type || "?"} ${preview.scope?.value || ""} · period: ${preview.period || "?"}`
      );
      if (preview.appreciation) {
        const a = preview.appreciation;
        if (a.annual != null) parts.push(`  annual appreciation: ${a.annual.toFixed(1)}%`);
        if (a.cumulative != null)
          parts.push(`  cumulative appreciation (${preview.period}): ${a.cumulative.toFixed(1)}%`);
        if (a.trend) parts.push(`  trend direction: ${a.trend}`);
      }
      if (preview.marketData) {
        const m = preview.marketData;
        if (m.startMedianPrice != null)
          parts.push(`  start median price: $${m.startMedianPrice.toLocaleString()}`);
        if (m.endMedianPrice != null)
          parts.push(`  current median price: $${m.endMedianPrice.toLocaleString()}`);
        if (m.totalSales != null) parts.push(`  total closed sales analyzed: ${m.totalSales}`);
        if (m.confidence) parts.push(`  data confidence: ${m.confidence}`);
      }
      if (Array.isArray(preview.appreciation?.yearlyData)) {
        const yd = preview.appreciation.yearlyData;
        if (yd.length > 0) {
          const summary = yd
            .map((y: any) => `${y.year}: $${y.medianPrice.toLocaleString()} (${y.sales} sales)`)
            .join("; ");
          parts.push(`  yearly medians: ${summary}`);
        }
      }
    }
  } else if (preview?.component === "listingResults") {
    parts.push("");
    parts.push(
      `Layer 1 returned ${preview.totalCount} total matches (showing top ${preview.listings?.length ?? 0}). Quote the totalCount, not the autocomplete hit count.`
    );
    if (Array.isArray(preview.listings) && preview.listings.length > 0) {
      for (const l of preview.listings.slice(0, 6)) {
        const bits = [
          l.price ? `$${l.price.toLocaleString()}` : null,
          l.beds != null ? `${l.beds}bd` : null,
          l.baths != null ? `${l.baths}ba` : null,
        ]
          .filter(Boolean)
          .join(", ");
        parts.push(`  - ${l.address} (${bits})`);
      }
    }
  }

  if (Array.isArray(searchResults) && searchResults.length > 0) {
    parts.push("");
    parts.push(
      `Autocomplete returned ${searchResults.length} disambiguation candidates (NOT a count of matching listings — Layer 1 stats above are the real count):`
    );
    for (const r of searchResults.slice(0, 8)) {
      if (r.type === "listing") {
        const bits = [
          r.price ? `$${r.price.toLocaleString()}` : null,
          r.beds != null ? `${r.beds}bd` : null,
          r.baths != null ? `${r.baths}ba` : null,
          r.sqft ? `${r.sqft.toLocaleString()} sqft` : null,
          r.subdivision || r.city || null,
        ]
          .filter(Boolean)
          .join(", ");
        parts.push(`  - listing: ${r.label} (${bits})`);
      } else if (r.type === "article") {
        // Articles need their EXCERPT for the model to synthesize an answer.
        // Without this, the model can only describe-not-answer insights queries.
        parts.push(`  - article: "${r.label}"${r.category ? ` [${r.category}]` : ""}`);
        if (r.excerpt) {
          // Cap excerpt to keep prompt tokens reasonable
          const excerpt = String(r.excerpt).replace(/\s+/g, " ").slice(0, 350);
          parts.push(`      excerpt: ${excerpt}`);
        }
      } else {
        const extra = r.sublabel ? ` (${r.sublabel})` : "";
        parts.push(`  - ${r.type}: ${r.label}${extra}`);
      }
    }
  } else {
    parts.push("");
    parts.push("Search returned no matches.");
  }

  // For insights queries, also pull excerpts from the preview-fetched
  // articles if the caller passed them — covers the case where the
  // autocomplete dropped articles for non-insights ranking but the
  // insights preview did its own $text search.
  if (Array.isArray(body.previewArticles) && body.previewArticles.length > 0) {
    parts.push("");
    parts.push(`Insights articles (${body.previewArticles.length}):`);
    for (const a of body.previewArticles) {
      parts.push(`  - "${a.title}"${a.category ? ` [${a.category}]` : ""}`);
      if (a.excerpt) {
        const excerpt = String(a.excerpt).replace(/\s+/g, " ").slice(0, 350);
        parts.push(`      excerpt: ${excerpt}`);
      }
    }
  }

  return parts.join("\n");
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await req.json();
    if (!body?.message) {
      return NextResponse.json({ error: "missing message" }, { status: 400 });
    }

    const context = describeContext(body);

    // llama-3.1-8b-instant on Groq is ~10x faster than gpt-oss-120b for
    // short narration tasks like this and doesn't burn budget on internal
    // reasoning tokens. Output cap raised to 400 so multi-sentence
    // responses don't get truncated mid-clause.
    const model = "llama-3.1-8b-instant";
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: NARRATOR_PROMPT },
        { role: "user", content: context },
      ],
      temperature: 0.55,
      max_tokens: 400,
      stream: false,
    });

    const narration = completion.choices?.[0]?.message?.content?.trim() || "";
    const tokens = completion.usage?.total_tokens || 0;
    const finishReason = completion.choices?.[0]?.finish_reason;

    return NextResponse.json({
      narration,
      tokens,
      ms: Date.now() - t0,
      model,
      finishReason,
    });
  } catch (err: any) {
    console.error("[narrate] error:", err);
    return NextResponse.json(
      { error: err?.message || "narrate failed", ms: Date.now() - t0 },
      { status: 500 }
    );
  }
}
