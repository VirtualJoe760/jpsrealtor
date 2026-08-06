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
import { medianIsMeaningful } from "@/lib/format";

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
  "search_listings whenever the visitor wants to SEE PROPERTIES — 'show me', 'find me', 'what's available', 'any homes in X'. Call it before you answer; never say you can help them find homes without actually searching.",
  "get_market_stats for questions about a market, area, or trend ('what's the market like', 'how's inventory', 'are prices up');",
  "get_listing for a specific home already mentioned.",
  "Answer the newest message on its own terms. NEVER repeat a previous reply or re-show the previous search's listings when the visitor has moved on to a different question.",
  "If a question needs no data — small talk, how the process works, what you can do — just answer it in a sentence. Do not call a tool.",
  "If the question is not about real estate at all (restaurants, weather, sports), say in one friendly line that you only cover homes, neighborhoods and the market here, and offer an example of what to ask. Do not call a tool and do not apologize at length.",
  "Keep replies short and conversational. When you mention specific listings, end the reply with a LISTINGS: line containing their listingKeys separated by commas (e.g. LISTINGS: ABC123,DEF456) so the site can render cards.",
  "ALWAYS write at least one sentence of prose before that line — the LISTINGS: line is stripped out before the visitor sees the reply, so a reply that is only a LISTINGS: line arrives as a blank message.",
  "When you have no listings to show, omit the LISTINGS: line entirely — never end a reply with a bare 'LISTINGS:'.",
  "Report metrics as plain facts. Never call a listing stale, overpriced, or distressed; days-on-market is a neutral metric.",
  "If the visitor wants to see a home or talk to the agent, point them to the listing page's inquiry form or the Contact page.",
].join(" ");

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_listings",
      // "All filters optional" read to one model as "and optional to call at
      // all": asked to SHOW investment properties in Indio, it replied "I can
      // help you find investment properties in Indio…" and called nothing.
      // There is also no keyword search here, so a descriptive ask has to be
      // translated into the structural filters that exist — say so, or the
      // model treats an untranslatable adjective as a reason not to search.
      description:
        "Search active listings and SHOW them to the visitor. Call this for any request to see, " +
        "find, browse or get homes — never answer such a request in words alone. There is no " +
        "keyword search: translate descriptive asks (investment, starter, luxury, fixer, " +
        "short-term-rental) into the filters below, using none of them if none apply, and say " +
        "in your reply which ones you used. All filters optional.",
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

// "Show me homes in Palm Desert" must return HOMES, not an offer to help.
//
// The system prompt and the tool description both say to call search_listings
// for a request to see properties, and the model still skipped it: a judged
// session sent three plain "show me homes in Palm Desert" variants from a clean
// widget and got a conversational "I'm here to help you find homes… what kind
// of…" with zero cards, 0/3. Natural-language "must" is a suggestion to a
// sampler; `tool_choice` is not. So when the newest message is unmistakably a
// request to SEE properties, take the choice away and name the tool.
//
// Deliberately narrow. Only the first round is forced (once the search has run,
// the model is free again), and anything that reads like a MARKET question is
// excluded — forcing a listing search on "how's the market in Indio?" would
// trade this bug for the one right next to it, where CHAP answers a market
// question with a listing grid.
const SEE_PROPERTIES =
  /\b(show|find|see|browse|view|send|pull up|any)\b[^.?!]{0,40}\b(home|homes|house|houses|propert(y|ies)|listing|listings|condo|condos|place|places)\b|\b(home|homes|house|houses|propert(y|ies)|listing|listings|condo|condos)\b[^.?!]{0,20}\b(for sale|available|on the market)\b|\bwhat('s| is|s)? available\b|\b(looking|search(ing)?|shopping) for\b[^.?!]{0,40}\b(home|house|propert(y|ies)|condo|place)\b/i;
// A market/stats question can contain the same nouns ("what are homes going for
// in Indio?"), so these win over the pattern above.
const MARKET_QUESTION =
  /\b(market|median|average|inventory|trend(s|ing)?|appreciat|days on market|going for|worth|price per|statistic)\b/i;

function wantsToSeeListings(text: string): boolean {
  const t = (text || "").trim();
  if (!t || t.length > 400) return false;
  return SEE_PROPERTIES.test(t) && !MARKET_QUESTION.test(t);
}

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
  if (name === "get_market_stats") {
    const s = await getMarketStats(args || {});
    // Same threshold the pages honor (lib/format.ts). Strip rather than
    // annotate: a note saying "don't quote this" still puts the number in the
    // model's context, and CHAP quoting a $5M median off three listings while
    // the neighborhood page for that city declines to is the same
    // contradiction, just harder to spot.
    if (s && !medianIsMeaningful(s.activeCount)) {
      const { medianListPrice, medianDaysOnMarket, averageListPrice, ...rest } = s as any;
      return {
        ...rest,
        mediansSuppressed: `Only ${s.activeCount ?? 0} active listing(s) — too few for a meaningful median. Give the count and the price range; do not state or estimate a median or average.`,
      };
    }
    return s;
  }
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

  // Listings the TOOLS surfaced this request, in the order they came back.
  // Ordered, not a Set, because it is also the fallback when the model fails
  // to echo them — and "the first three the search returned" is a defensible
  // choice where an arbitrary Set iteration order is not. Scoped to this
  // request, so it can never re-show a previous turn's search.
  const surfaced: string[] = [];
  const usedKeys = new Set<string>();
  // A provider can fail to produce a well-formed tool call — Groq answers HTTP
  // 400 `tool_use_failed` with the half-written generation attached. It is a
  // sampling accident, not a broken site: a judged session hit it on "show me
  // 3-bed homes under $400k in Indio" and the visitor got a 502, while the same
  // question asked twice more worked fine. Retry once (different sampling,
  // usually enough); if it happens again, take the tools away so the model has
  // to answer in words. A visitor never sees an error for this.
  let toolFailures = 0;
  let toolsDisabled = false;
  // See SEE_PROPERTIES above: on a plain "show me homes in X", don't let the
  // model decide whether to search. Read from the newest USER message only —
  // the assistant's own last reply must never re-trigger a search.
  const lastUser = [...history].reverse().find((m: any) => m.role === "user");
  const forceSearch = wantsToSeeListings(String(lastUser?.content || ""));
  for (let round = 0; round < MAX_ROUNDS; round++) {
    // On the LAST round, forbid tool calls so the model has to answer in words
    // (tools stay declared — providers reject a history containing tool_calls
    // when the tool list disappears). Without this, a model that kept calling
    // tools ran out of rounds and the visitor got the "I hit my lookup limit"
    // fallback — which a judged session saw for an ordinary off-topic question,
    // reading as if the visitor had broken something.
    const lastRound = round === MAX_ROUNDS - 1;
    // Force only the FIRST round. After the search has run its results are in
    // `messages`, and forcing again would make the model search on loop instead
    // of writing the reply.
    const toolChoice =
      lastRound || toolsDisabled
        ? "none"
        : forceSearch && round === 0
          ? { type: "function", function: { name: "search_listings" } }
          : "auto";
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: toolChoice,
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const malformedToolCall =
        res.status === 400 && /tool_use_failed|failed to call a function/i.test(errBody);
      if (malformedToolCall && !toolsDisabled) {
        toolFailures += 1;
        // Second strike: stop asking for tool calls this turn. The model still
        // has whatever tool results are already in `messages`, so an answer is
        // usually still a real answer — and a plain sentence beats a 502.
        if (toolFailures >= 2) toolsDisabled = true;
        console.warn(
          `[chat] provider could not form a tool call (attempt ${toolFailures})` +
            `${toolsDisabled ? " — answering without tools" : " — retrying"}`
        );
        continue;
      }
      // Groq and OpenAI both accept the named-function form of `tool_choice`,
      // but not every OpenAI-compatible host does, and a site pointed at one
      // that doesn't would 400 every "show me homes" — the worst possible
      // trade for a fix aimed at that exact question. Retry: the next round is
      // never forced, so this falls back to "auto" on its own.
      if (res.status === 400 && typeof toolChoice === "object") {
        console.warn(
          "[chat] provider rejected a forced tool_choice — retrying with tool_choice:auto. " +
            "Set CHAT_BASE_URL to a provider that supports named tool_choice (Groq, OpenAI) for reliable listing cards."
        );
        continue;
      }
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
        if (Array.isArray(items))
          for (const i of items)
            if (i.listingKey && !usedKeys.has(i.listingKey)) {
              usedKeys.add(i.listingKey);
              surfaced.push(i.listingKey);
            }
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue;
    }

    // Final answer. Extract LISTINGS: line → cards.
    //
    // The `*` (not `+`) on the key list matters: a reply that ends with a bare
    // "LISTINGS:" — which the model emits whenever it found nothing — used to
    // fail the match, leaving the literal token as the last word the visitor
    // read ("There are no homes under $500k in La Quinta. LISTINGS:").
    // Not anchored to the end of the string any more, and it tolerates
    // trailing punctuation: the old `…$` match dropped the whole line when the
    // model wrote "LISTINGS: A,B." or followed it with a closing sentence, and
    // a dropped line means a search that found homes renders zero cards while
    // the literal token stays in the visitor's reply.
    let text: string = msg.content || "";
    let keys: string[] = [];
    const m = text.match(/\n?[ \t]*LISTINGS:[ \t]*([A-Za-z0-9,\-\s]*)/);
    if (m) {
      keys = m[1].split(/[,\s]+/).map((s) => s.trim()).filter((k) => usedKeys.has(k));
      text = (text.slice(0, m.index) + text.slice((m.index ?? 0) + m[0].length)).trim();
    }
    // THE MODEL ECHOING THE KEYS IS NOT LOAD-BEARING. A judged session asked
    // for investment properties in Indio against a database holding 27 Active
    // Indio listings and got a well-formed paragraph with `listings: []` —
    // every one of the failure modes above lands there, and they are
    // indistinguishable from "no inventory" to the visitor, who is looking at
    // an agent's site that appears to have nothing to sell. If a search ran
    // and returned homes this turn, show them. `surfaced` is per-request, so
    // this cannot resurrect an earlier search; get_market_stats and
    // get_listing contribute no items, so a stats answer still gets no cards.
    if (keys.length === 0 && surfaced.length > 0) keys = surfaced.slice(0, 3);
    const cards = [];
    for (const k of keys.slice(0, 4)) {
      // One unfetchable key must not 500 the whole conversation.
      const l = await getListing(k).catch(() => null);
      // No detailUrl in the card payload on purpose: it points at the
      // ChatRealty hub, and the UI builds its own /listings/{key} link.
      if (l) cards.push({ listingKey: l.listingKey, address: l.address, city: l.city, price: l.listPrice, beds: l.beds, baths: l.baths, sqft: l.sqft, thumbUrl: l.thumbUrl, listAgentName: l.listAgentName ?? null, listOfficeName: l.listOfficeName ?? null });
    }
    // A reply that is ONLY the LISTINGS: line strips down to "", and the widget
    // then renders cards under a blank message — the visitor gets property
    // photos with no sentence telling them what they are looking at. The system
    // prompt asks for prose, but a prompt is not a guarantee: say something
    // truthful ourselves rather than ship an empty bubble.
    if (!text) {
      text = cards.length
        ? cards.length === 1
          ? "Here's the home that matches what you asked for."
          : `Here are ${cards.length} homes that match what you asked for.`
        : "I don't have anything to show for that one — try a city, a price range, or a number of bedrooms.";
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
