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

const NARRATOR_PROMPT = `You are a real estate AI narrator for California properties. The user just submitted a chat query. A deterministic search router has already classified intent and resolved entities; your job is to write 1–2 short sentences that:

1. Tell the user what you've pulled (e.g., "I'll show you listings in Indian Wells with HOA under $400/month").
2. Optionally surface ONE notable observation from the search results, OR suggest a useful follow-up the user could ask.

Rules:
- Do NOT enumerate listings or repeat numbers — the UI renders them in a card.
- Do NOT use Markdown tables, headers, or bullet lists — plain prose only.
- Do NOT echo the user's words back verbatim ("you asked about X").
- Do NOT invent data not present in the context.
- If the parser intent is "conversational" or low-confidence, simply ask a clarifying question.
- Keep it concise. Two sentences is the cap.`;

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

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: NARRATOR_PROMPT },
        { role: "user", content: context },
      ],
      temperature: 0.5,
      max_tokens: 180,
      stream: false,
    });

    const narration = completion.choices?.[0]?.message?.content?.trim() || "";
    const tokens = completion.usage?.total_tokens || 0;

    return NextResponse.json({
      narration,
      tokens,
      ms: Date.now() - t0,
      model: "openai/gpt-oss-120b",
    });
  } catch (err: any) {
    console.error("[narrate] error:", err);
    return NextResponse.json(
      { error: err?.message || "narrate failed", ms: Date.now() - t0 },
      { status: 500 }
    );
  }
}
