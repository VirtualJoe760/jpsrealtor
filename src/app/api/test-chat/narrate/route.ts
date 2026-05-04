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
- Open with what's notable about the property — price, size, community, anything distinctive from the data.
- Mention the property by address.
- Offer a relevant follow-up (CMA, similar homes, photos).
- 2-3 sentences.

**For listing-search / aggregate / street-listings**:
- Open with the most useful headline observation — e.g., "Indian Wells with HOA under $400 narrows to 8 listings, mostly single-family in Cove at Indian Wells and Indian Wells Country Club."
- Mention 1-2 standouts by address/price if it adds context, OR a notable stat (median, range) if more relevant.
- If an alternative scope came up in the candidates (e.g., a Non-HOA subdivision when filtering on HOA), mention it as a pivot.
- End with a focused follow-up question, but vary the phrasing — don't always say "Want me to filter by..."
- 3-4 sentences.

**For compare**:
- Lead with the actual comparison takeaway, not "I compared X and Y."
- 2-3 sentences.

**For conversational / unknown / low-confidence**:
- Ask one focused clarifying question that helps narrow. Don't guess.

# Hard rules
- Plain prose only — NO markdown tables, headers, bullet lists.
- DO NOT invent data — only use what's in the context.
- DO NOT meta-narrate the system ("the search router found...", "the parser identified...").
- Vary sentence structure across responses — don't fall into a template.`;

function describeContext(body: any): string {
  const { message, parsed, searchResults } = body;
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

  if (Array.isArray(searchResults) && searchResults.length > 0) {
    parts.push("");
    parts.push(`Search returned ${searchResults.length} results:`);
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
