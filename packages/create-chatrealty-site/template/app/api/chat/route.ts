// CHAP on your site — a tool-calling chat loop over YOUR listing data.
//
// SERVER-SIDE ONLY. BYOK: set CHAT_API_KEY in .env.local (any OpenAI-compatible
// chat-completions provider — Groq is the recommended default and what
// ChatRealty itself runs). Optional: CHAT_MODEL, CHAT_BASE_URL. The widget
// hides itself when no key is configured (GET returns { enabled: false }).
//
// The tools call the site's own data layer (lib/chatrealty), so CHAP works in
// TEST DATA mode and switches to your real data with the same env change as
// everything else. The model never sees your ChatRealty token.

import { NextRequest, NextResponse } from "next/server";
import { searchListings, getMarketStats, getListing, getMarketCities } from "@/lib/chatrealty";

const KEY = process.env.CHAT_API_KEY || "";
const BASE = (process.env.CHAT_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
const MODEL = process.env.CHAT_MODEL || "llama-3.3-70b-versatile";
const MAX_ROUNDS = 4;

// The prompt carries three rules that came out of a judged session where CHAP
// answered a market question by replaying the previous listing search verbatim,
// and answered an off-topic question with a rate-limit error:
//   • not every message is a property search — market questions get stats,
//     conversation gets conversation;
//   • answer THE MESSAGE IN FRONT OF YOU, never repeat the last answer;
//   • off-topic gets a one-line redirect, not a tool call and not an error.
const SYSTEM = [
  "You are the property-search assistant on a real-estate agent's website, powered by ChatRealty.",
  "Answer questions about homes for sale and local market data using ONLY the tools — never invent listings, prices, or stats.",
  "Choose the tool that fits the question actually being asked:",
  "search_listings only when the visitor wants to SEE PROPERTIES;",
  "get_market_stats for questions about a market, area, or trend ('what's the market like', 'how's inventory', 'are prices up');",
  "get_listing for a specific home already mentioned.",
  "Answer the newest message on its own terms. NEVER repeat a previous reply or re-show the previous search's listings when the visitor has moved on to a different question.",
  "If a question needs no data — small talk, how the process works, what you can do — just answer it in a sentence. Do not call a tool.",
  "If the question is not about real estate at all (restaurants, weather, sports), say in one friendly line that you only cover homes, neighborhoods and the market here, and offer an example of what to ask. Do not call a tool and do not apologize at length.",
  "Keep replies short and conversational. When you mention specific listings, end the reply with a LISTINGS: line containing their listingKeys separated by commas (e.g. LISTINGS: ABC123,DEF456) so the site can render cards.",
  "Report metrics as plain facts. Never call a listing stale, overpriced, or distressed; days-on-market is a neutral metric.",
  "If the visitor wants to see a home or talk to the agent, point them to the listing page's inquiry form or the Contact page.",
].join(" ");

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_listings",
      description: "Search active listings. All filters optional.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          minPrice: { type: "number" },
          maxPrice: { type: "number" },
          minBeds: { type: "number" },
          minBaths: { type: "number" },
          hasPool: { type: "boolean" },
          limit: { type: "number", description: "max 10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_market_stats",
      description: "Market stats (median/average price, days on market, active count) for a city or subdivision.",
      parameters: {
        type: "object",
        properties: { city: { type: "string" }, subdivision: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_listing",
      description: "Full detail for one listing by listingKey.",
      parameters: {
        type: "object",
        properties: { listingKey: { type: "string" } },
        required: ["listingKey"],
      },
    },
  },
];

async function runTool(name: string, args: any): Promise<unknown> {
  if (name === "search_listings") {
    const r = await searchListings({ ...args, limit: Math.min(10, args?.limit || 6) });
    // Trim for the model: no remarks, no photo URLs.
    return {
      total: r.total,
      items: r.items.map((l) => ({
        listingKey: l.listingKey, address: l.address, city: l.city,
        subdivision: l.subdivision, price: l.listPrice, beds: l.beds,
        baths: l.baths, sqft: l.sqft, pool: l.pool, daysOnMarket: l.daysOnMarket,
      })),
    };
  }
  if (name === "get_market_stats") return getMarketStats(args || {});
  if (name === "get_listing") {
    const l = await getListing(String(args?.listingKey || ""));
    if (!l) return { error: "not_found" };
    const { publicRemarks, ...rest } = l;
    return { ...rest, publicRemarks: (publicRemarks || "").slice(0, 500) };
  }
  return { error: "unknown_tool" };
}

export async function GET() {
  return NextResponse.json({ enabled: !!KEY }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json({ error: "chat_not_configured" }, { status: 501 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const history = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  // Tell the model which markets this site is for, so a market question with no
  // city named ("how's the market right now?") is answered about the agent's
  // area rather than about nothing. Searches are scoped to these regardless —
  // see MARKET SCOPE in lib/chatrealty.ts.
  const markets = await getMarketCities().catch(() => [] as string[]);
  const messages: any[] = [
    {
      role: "system",
      content:
        markets.length > 0
          ? `${SYSTEM} This site serves ${markets.join(", ")}. When the visitor doesn't name a place, assume these markets and say which one you used.`
          : SYSTEM,
    },
    ...history
      .filter((m: any) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) })),
  ];

  const usedKeys = new Set<string>();
  for (let round = 0; round < MAX_ROUNDS; round++) {
    // On the LAST round, forbid tool calls so the model has to answer in words
    // (tools stay declared — providers reject a history containing tool_calls
    // when the tool list disappears). Without this, a model that kept calling
    // tools ran out of rounds and the visitor got the "I hit my lookup limit"
    // fallback — which a judged session saw for an ordinary off-topic question,
    // reading as if the visitor had broken something.
    const lastRound = round === MAX_ROUNDS - 1;
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: lastRound ? "none" : "auto",
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[chat] provider error", res.status, errBody.slice(0, 300));
      return NextResponse.json({ error: "provider_error" }, { status: 502 });
    }
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) return NextResponse.json({ error: "empty_response" }, { status: 502 });

    if (msg.tool_calls?.length) {
      messages.push(msg);
      for (const tc of msg.tool_calls.slice(0, 4)) {
        let args: any = {};
        try { args = JSON.parse(tc.function?.arguments || "{}"); } catch { /* noop */ }
        const result = await runTool(tc.function?.name, args);
        // Track listing keys surfaced by tools so the UI can render cards.
        const items = (result as any)?.items;
        if (Array.isArray(items)) for (const i of items) if (i.listingKey) usedKeys.add(i.listingKey);
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue;
    }

    // Final answer. Extract LISTINGS: line → cards.
    let text: string = msg.content || "";
    let keys: string[] = [];
    const m = text.match(/\n?LISTINGS:\s*([A-Za-z0-9,\-\s]+)\s*$/);
    if (m) {
      keys = m[1].split(",").map((s) => s.trim()).filter((k) => usedKeys.has(k));
      text = text.slice(0, m.index).trim();
    }
    const cards = [];
    for (const k of keys.slice(0, 4)) {
      const l = await getListing(k);
      // No detailUrl in the card payload on purpose: it points at the
      // ChatRealty hub, and the UI builds its own /listings/{key} link.
      if (l) cards.push({ listingKey: l.listingKey, address: l.address, city: l.city, price: l.listPrice, beds: l.beds, baths: l.baths, sqft: l.sqft, thumbUrl: l.thumbUrl, listAgentName: l.listAgentName ?? null, listOfficeName: l.listOfficeName ?? null });
    }
    return NextResponse.json({ reply: text, listings: cards }, { headers: { "Cache-Control": "no-store" } });
  }
  // Only reachable if the model still emitted tool calls under tool_choice
  // "none". Say something a visitor can act on — never surface it as an error.
  return NextResponse.json({
    reply:
      "I couldn't pull that one together. I can help with homes for sale, neighborhoods, and market numbers — try asking about a city, a price range, or a specific home.",
    listings: [],
  });
}
