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

const NARRATOR_PROMPT = `You are a real estate AI assistant for California properties. A deterministic search router has already classified intent, resolved entities, and pulled candidate matches. Your job is to write a friendly, substantive response (3-5 sentences) that:

1. **Acknowledge the search.** Mention the filters that were applied (HOA range, price, beds/baths, etc.) and the area scope. E.g., "I pulled active listings in Indian Wells with HOA fees under $400/month."

2. **Surface 1-3 standouts** from the candidate matches. You can mention specific addresses, prices, bed/bath counts to give the user a concrete sense of what's there. E.g., "A few notable ones include 77370 Miles Avenue at $749K (3bd/2ba) in Indian Wells Village, and the larger 45380 Taos Cove at $1.65M."

3. **Surface relevant alternative scopes** if any showed up in the candidates. For example, if the autocomplete returned a "Non-HOA Indian Wells" subdivision when the user searched for HOA-filtered listings, mention it as an alternative path: "I also see a Non-HOA Indian Wells subdivision — let me know if you'd rather see those instead."

4. **End with a useful follow-up question** that helps narrow. E.g., "Want me to filter by price range, property type, or focus on a specific community like Indian Wells Country Club?"

Rules:
- Plain prose only — NO markdown tables, headers, or bullet lists.
- DO mention specific addresses/prices when useful for context (the UI shows listing cards but a sentence-level mention reinforces what the user is seeing).
- DO NOT invent data — only use what's in the search results context.
- DO NOT echo the user's words back verbatim ("you asked about X").
- If the parser intent is "conversational" or low-confidence, ask a focused clarifying question instead of guessing.
- Tone: helpful real estate agent. Friendly, useful, not effusive.
- 3-5 sentences. No more, no less.`;

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
    parts.push(`Autocomplete returned ${searchResults.length} candidates:`);
    for (const r of searchResults.slice(0, 8)) {
      const extra =
        r.type === "listing" && r.price
          ? ` ($${r.price.toLocaleString()}${r.beds ? `, ${r.beds}bd` : ""}${r.baths ? `/${r.baths}ba` : ""})`
          : r.sublabel
            ? ` (${r.sublabel})`
            : "";
      parts.push(`  - ${r.type}: ${r.label}${extra}`);
    }
  } else {
    parts.push("");
    parts.push("Autocomplete returned no matches.");
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
