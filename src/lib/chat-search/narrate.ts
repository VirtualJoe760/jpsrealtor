// src/lib/chat-search/narrate.ts
//
// Layer 2 of the search-first chat architecture. Takes the parser output,
// the resolved Layer 1 preview, and the raw search results, and produces a
// short narration using a fast Groq model (llama-3.1-8b-instant).
//
// Two entry points:
//   narrate(input)       → one-shot, returns full narration as JSON
//   streamNarrate(input) → SSE-friendly, yields token strings as they arrive
//
// The narrator never invents data — the prompt's hard rules forbid it and
// the context block labels Layer 1 stats as AUTHORITATIVE so the model
// quotes them verbatim.

import Groq from "groq-sdk";
import type {
  NarrationInput,
  NarrationResult,
  PreviewResult,
} from "./types";

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

**For cma**:
- Acknowledge the property/subdivision the CMA is being prepared for.
- Frame the CMA component below as the primary answer — your text is a lead-in.
- 1-2 sentences. Do not summarize comp-by-comp data; the table does that.

**For conversational / unknown / low-confidence**:
- Ask one focused clarifying question that helps narrow. Don't guess.

# Hard rules
- Plain prose only — NO markdown tables, headers, bullet lists.
- DO NOT invent data — only use what's in the context.
- DO NOT meta-narrate the system ("the search router found...", "the parser identified...").
- DO NOT count the autocomplete candidates — they're disambiguation hits, not a count of matches. Always use the totalListings / totalCount from "Layer 1 stats" when present.
- Vary sentence structure across responses — don't fall into a template.`;

// =============================================================================
// Context builder
// =============================================================================

export function describeContext(input: NarrationInput): string {
  const { message, parsed, searchResults, preview, previewArticles } = input;
  const parts: string[] = [];

  parts.push(`User typed: "${message}"`);
  parts.push("");
  parts.push("Parser output:");
  parts.push(`  intent: ${parsed?.intent || "unknown"}`);
  parts.push(`  dataset: ${parsed?.dataset || "active"}`);
  parts.push(`  confidence: ${parsed?.confidence?.toFixed(2) ?? "?"}`);

  if (parsed?.entities?.length) {
    parts.push("  entities:");
    for (const e of parsed.entities as any[]) {
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
  if (
    preview?.component === "neighborhood" ||
    preview?.component === "areaStats"
  ) {
    const s = preview.stats;
    if (s) {
      parts.push("");
      parts.push(
        "Layer 1 stats (AUTHORITATIVE — quote these numbers, not the search-result count):"
      );
      parts.push(`  scope: ${preview.scope?.type || "?"} ${preview.scope?.value || ""}`);
      parts.push(`  totalListings: ${s.totalListings}`);
      parts.push(`  newListings (7d): ${s.newListingsCount}`);
      parts.push(`  avgPrice: $${s.avgPrice?.toLocaleString?.() ?? s.avgPrice}`);
      parts.push(
        `  medianPrice: $${s.medianPrice?.toLocaleString?.() ?? s.medianPrice}`
      );
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
            .map(
              (p: any) =>
                `${p.count} ${p.subType} (avg $${p.avgPrice?.toLocaleString?.()})`
            )
            .join(", ")}`
        );
      }
    }
    if (Array.isArray(preview.listings) && preview.listings.length > 0) {
      parts.push("");
      parts.push(
        `Sample of ${preview.listings.length} matching listings (from Layer 1):`
      );
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
    parts.push(
      "Layer 1 listing detail (AUTHORITATIVE — this is the property the user wants):"
    );
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
        `  A (${(preview.a.scope as any)?.value || "?"}): ${s.totalListings} listings, avg $${s.avgPrice?.toLocaleString()}, median $${s.medianPrice?.toLocaleString()}`
      );
    }
    if (preview.b?.stats) {
      const s = preview.b.stats;
      parts.push(
        `  B (${(preview.b.scope as any)?.value || "?"}): ${s.totalListings} listings, avg $${s.avgPrice?.toLocaleString()}, median $${s.medianPrice?.toLocaleString()}`
      );
    }
  } else if (preview?.component === "trend") {
    const hasRealData = !!(preview.appreciation || preview.marketData);
    if (!hasRealData) {
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
          parts.push(
            `  cumulative appreciation (${preview.period}): ${a.cumulative.toFixed(1)}%`
          );
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
  } else if (preview?.component === "cma") {
    parts.push("");
    if (preview.cmaScope === "listing") {
      // Surface subject metadata so the narrator can't invent status/price.
      // Without this it was hallucinating "closed sale" on active listings.
      const subj = preview.listing;
      parts.push(
        `Layer 1 CMA: listing-level CMA for the property below.${preview.hasPrebuilt ? " Pre-computed cmaStats present." : " No pre-computed stats — CMAReport will generate on demand."}`
      );
      if (subj) {
        parts.push(`  Subject AUTHORITATIVE facts (quote precisely):`);
        parts.push(`    address: ${subj.address}`);
        if (subj.subdivision) parts.push(`    subdivision: ${subj.subdivision}`);
        if (subj.city) parts.push(`    city: ${subj.city}`);
        if (subj.standardStatus) parts.push(`    status: ${subj.standardStatus} (DO NOT call this closed unless it literally says Closed)`);
        if (subj.price) parts.push(`    list price: $${subj.price.toLocaleString()}`);
        if (subj.beds) parts.push(`    beds: ${subj.beds}`);
        if (subj.baths) parts.push(`    baths: ${subj.baths}`);
        if (subj.sqft) parts.push(`    sqft: ${subj.sqft.toLocaleString()}`);
      }
      parts.push(
        "  → REQUIRED phrasing: a single sentence acknowledging the CMA was generated for {address}, optionally with the list price. Example: \"Pulled the CMA for 78715 Naples Drive — listed at $585,000.\" or \"Here's the CMA for 77095 Desi Drive (listed at $1.3M).\" Do NOT invent status, sale dates, or any field not in the AUTHORITATIVE block above. Do NOT summarize comp data — the report below speaks for itself."
      );
    } else if (preview.cmaScope === "subdivision") {
      parts.push(
        `Layer 1 CMA: subdivision-level for ${preview.subdivisionName} (slug: ${preview.slug}).`
      );
      parts.push(
        "  → A CMA report component is rendering below your message. Lead the user into it; do not summarize comp data."
      );
    } else if (preview.cmaScope === "listingOptions") {
      // Disambiguation: multiple listings matched the user's query. Use the
      // exact phrasing the agent prefers — short, no over-explaining.
      const count = preview.listings?.length ?? 0;
      const where = preview.scope?.value || "your search";
      parts.push(
        `Layer 1 CMA: DISAMBIGUATION — ${count} listing${count === 1 ? "" : "s"} matched "${where}". A picker component is rendering below your message.`
      );
      parts.push(
        `  → REQUIRED phrasing: "I've found ${count} result${count === 1 ? "" : "s"} for ${where}. Let me know which one you want a CMA for." Output that single sentence verbatim — no preamble, no explanation, no extra context. The picker component speaks for itself.`
      );
    } else {
      parts.push(`Layer 1 CMA: ${preview.reason || "scope not resolved"}.`);
      parts.push(
        "  → No matches found. Ask the user for a specific address, street, or subdivision name."
      );
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
        parts.push(`  - article: "${r.label}"${r.category ? ` [${r.category}]` : ""}`);
        if (r.excerpt) {
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

  if (Array.isArray(previewArticles) && previewArticles.length > 0) {
    parts.push("");
    parts.push(`Insights articles (${previewArticles.length}):`);
    for (const a of previewArticles) {
      parts.push(`  - "${a.title}"${a.category ? ` [${a.category}]` : ""}`);
      if (a.excerpt) {
        const excerpt = String(a.excerpt).replace(/\s+/g, " ").slice(0, 350);
        parts.push(`      excerpt: ${excerpt}`);
      }
    }
  }

  return parts.join("\n");
}

// =============================================================================
// Non-streaming entry point — used by /api/test-chat/narrate
// =============================================================================

const DEFAULT_MODEL = "llama-3.1-8b-instant";

export async function narrate(input: NarrationInput): Promise<NarrationResult> {
  const t0 = Date.now();
  if (!input.message) {
    return { narration: "", error: "missing message" };
  }
  const context = describeContext(input);
  try {
    const completion = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: NARRATOR_PROMPT },
        { role: "user", content: context },
      ],
      temperature: 0.55,
      max_tokens: 400,
      stream: false,
    });
    return {
      narration: completion.choices?.[0]?.message?.content?.trim() || "",
      tokens: completion.usage?.total_tokens || 0,
      ms: Date.now() - t0,
      model: DEFAULT_MODEL,
      finishReason: completion.choices?.[0]?.finish_reason,
    };
  } catch (err: any) {
    return {
      narration: "",
      error: err?.message || "narrate failed",
      ms: Date.now() - t0,
    };
  }
}

// =============================================================================
// Streaming entry point — used by /api/chat-v3 SSE
// =============================================================================

/**
 * Yields narration tokens as the model produces them. The caller wraps each
 * token in an SSE event of the same shape /api/chat-v2 emits today
 * (`data: {"token": "..."}\n\n`) so ChatWidget code can stay unchanged.
 */
export async function* streamNarration(
  input: NarrationInput
): AsyncGenerator<string, void, unknown> {
  const context = describeContext(input);
  const stream = await groq.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: NARRATOR_PROMPT },
      { role: "user", content: context },
    ],
    temperature: 0.55,
    max_tokens: 400,
    stream: true,
  });

  for await (const chunk of stream as any) {
    const token = chunk?.choices?.[0]?.delta?.content;
    if (typeof token === "string" && token.length > 0) {
      yield token;
    }
  }
}

// Re-export the prompt + model name for callers that want to inspect or
// override (e.g., a future per-intent reasoning-model router).
export { NARRATOR_PROMPT, DEFAULT_MODEL };
