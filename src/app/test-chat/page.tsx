"use client";

// Sandbox page for the search-first chat architecture.
// Not wired into production /chat. Lives at /test-chat for iteration.
//
// What it exercises:
//   - Live autocomplete via /api/listings/quick-search (multi-source-search)
//   - Phase A query parser via /api/test-chat/parse (intent / dataset / filters / entities)
//   - Visualizes both layers' output side-by-side
//
// What it doesn't (yet):
//   - The L1 search service that consumes parser output and routes to data primitives
//   - The L2 narrator
//   - The L3 agent-loop fallback
//
// Use this to validate the search and parser before wiring them into /chat.

import { useState, useEffect, useRef, useCallback } from "react";

interface SearchResult {
  type: "listing" | "city" | "subdivision" | "county" | "region" | "article";
  entityId?: string;
  label: string;
  sublabel?: string;
  slug?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  photo?: string;
  city?: string;
  subdivision?: string;
  totalListings?: number;
  parentCity?: string;
  excerpt?: string;
  category?: string;
  score?: number;
  source?: "text" | "regex";
}

interface ParsedQuery {
  raw: string;
  entities: Array<any>;
  filters: Record<string, any>;
  intent: string;
  dataset: "active" | "closed";
  metric?: string[];
  confidence: number;
}

interface Submission {
  query: string;
  parsed: ParsedQuery | null;
  searchResults: SearchResult[];
  parseMs: number;
  searchMs: number;
}

const formatPrice = (n?: number) =>
  n ? `$${n.toLocaleString()}` : "";

const sourceColor = (s?: string) =>
  s === "text" ? "text-emerald-700 bg-emerald-50" : "text-blue-700 bg-blue-50";

const typeColor = (t: string) => {
  switch (t) {
    case "listing":
      return "bg-amber-100 text-amber-900";
    case "city":
      return "bg-sky-100 text-sky-900";
    case "subdivision":
      return "bg-purple-100 text-purple-900";
    case "county":
      return "bg-rose-100 text-rose-900";
    case "region":
      return "bg-teal-100 text-teal-900";
    case "article":
      return "bg-emerald-100 text-emerald-900";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const intentColor = (i: string) => {
  switch (i) {
    case "listing-detail":
      return "bg-amber-100 text-amber-900";
    case "listing-search":
      return "bg-sky-100 text-sky-900";
    case "street-listings":
      return "bg-violet-100 text-violet-900";
    case "aggregate":
      return "bg-emerald-100 text-emerald-900";
    case "compare":
      return "bg-pink-100 text-pink-900";
    case "trend":
      return "bg-indigo-100 text-indigo-900";
    case "cma":
      return "bg-orange-100 text-orange-900";
    case "insights":
      return "bg-teal-100 text-teal-900";
    case "conversational":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function TestChatPage() {
  const [input, setInput] = useState("");
  const [autocomplete, setAutocomplete] = useState<SearchResult[]>([]);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteMs, setAutocompleteMs] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ---- Live autocomplete (debounced) ----
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (input.trim().length < 2) {
      setAutocomplete([]);
      setAutocompleteOpen(false);
      setAutocompleteMs(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const start = Date.now();
      try {
        const res = await fetch(
          `/api/listings/quick-search?q=${encodeURIComponent(input.trim())}`
        );
        const data = await res.json();
        setAutocomplete(data.results || []);
        setAutocompleteOpen(true);
        setAutocompleteMs(Date.now() - start);
      } catch (err) {
        console.error("autocomplete failed:", err);
        setAutocomplete([]);
      }
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input]);

  // ---- Submit a query (runs parser + final search) ----
  const handleSubmit = useCallback(
    async (q: string) => {
      const query = q.trim();
      if (!query || submitting) return;
      setSubmitting(true);
      setAutocompleteOpen(false);

      const parseStart = Date.now();
      let parsed: ParsedQuery | null = null;
      try {
        const r = await fetch("/api/test-chat/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: query }),
        });
        const data = await r.json();
        parsed = data?.parsed || null;
      } catch (err) {
        console.error("parse failed:", err);
      }
      const parseMs = Date.now() - parseStart;

      const searchStart = Date.now();
      let searchResults: SearchResult[] = [];
      try {
        const r = await fetch(
          `/api/listings/quick-search?q=${encodeURIComponent(query)}`
        );
        const data = await r.json();
        searchResults = data.results || [];
      } catch (err) {
        console.error("search failed:", err);
      }
      const searchMs = Date.now() - searchStart;

      setSubmissions((prev) => [
        { query, parsed, searchResults, parseMs, searchMs },
        ...prev,
      ]);
      setInput("");
      setSubmitting(false);
    },
    [submitting]
  );

  const handleAutocompleteClick = (r: SearchResult) => {
    handleSubmit(r.label);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit(input);
    if (e.key === "Escape") setAutocompleteOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold">Chat Search Sandbox</h1>
        <p className="text-sm text-gray-600 mt-1">
          Layer 0 (parser) + the unified <code className="text-xs bg-gray-200 px-1 rounded">multi-source-search</code> running side-by-side.
          Type to see live autocomplete; press Enter or click a suggestion to commit.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Hits <code className="text-xs bg-gray-200 px-1 rounded">/api/listings/quick-search</code>{" "}
          (search_index $text + counties/regions regex + city/subdivision prefix)
          and <code className="text-xs bg-gray-200 px-1 rounded">/api/test-chat/parse</code>{" "}
          (Phase A query parser).
        </p>
      </header>

      {/* Input + autocomplete */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => autocomplete.length > 0 && setAutocompleteOpen(true)}
          placeholder="Try: indi · indian · Indian Wells · 12345 Desi Drive · compare PGA West vs Indian Wells · average sold price last 6 months in Palm Desert"
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          disabled={submitting}
        />
        {autocompleteMs !== null && (
          <span className="absolute right-3 top-3 text-xs text-gray-500 pointer-events-none">
            {autocompleteMs}ms · {autocomplete.length} hits
          </span>
        )}

        {autocompleteOpen && autocomplete.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
            {autocomplete.map((r, i) => (
              <button
                key={`${r.type}-${r.entityId || r.label}-${i}`}
                onClick={() => handleAutocompleteClick(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
              >
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${typeColor(r.type)}`}>
                  {r.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.label}</div>
                  {r.sublabel && (
                    <div className="text-xs text-gray-500 truncate">{r.sublabel}</div>
                  )}
                  {r.type === "listing" && (r.price || r.beds || r.baths) && (
                    <div className="text-xs text-gray-600 mt-0.5">
                      {r.price && <span>{formatPrice(r.price)}</span>}
                      {r.beds != null && <span> · {r.beds}bd</span>}
                      {r.baths != null && <span> · {r.baths}ba</span>}
                      {r.sqft && <span> · {r.sqft.toLocaleString()} sqft</span>}
                    </div>
                  )}
                  {r.type === "article" && r.excerpt && (
                    <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                      {r.excerpt}
                    </div>
                  )}
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${sourceColor(r.source)}`}>
                  {r.source}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Submissions feed (most recent first) */}
      <div className="flex flex-col gap-6">
        {submissions.length === 0 && (
          <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-lg">
            Submitted queries will show parser + search output here.
          </div>
        )}
        {submissions.map((s, i) => (
          <article
            key={i}
            className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex flex-col gap-4"
          >
            {/* User query */}
            <header className="flex items-baseline justify-between gap-3 border-b pb-3">
              <h2 className="text-lg font-semibold">"{s.query}"</h2>
              <div className="text-xs text-gray-500 font-mono">
                parse {s.parseMs}ms · search {s.searchMs}ms
              </div>
            </header>

            {/* Parser output */}
            {s.parsed ? (
              <section>
                <h3 className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2">
                  Parser (Layer 0)
                </h3>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className={`px-2 py-1 rounded font-mono text-xs ${intentColor(s.parsed.intent)}`}>
                    intent: {s.parsed.intent}
                  </span>
                  <span className="px-2 py-1 rounded font-mono text-xs bg-gray-100 text-gray-700">
                    dataset: {s.parsed.dataset}
                  </span>
                  <span className="px-2 py-1 rounded font-mono text-xs bg-gray-100 text-gray-700">
                    confidence: {s.parsed.confidence.toFixed(2)}
                  </span>
                  {s.parsed.metric && s.parsed.metric.length > 0 && (
                    <span className="px-2 py-1 rounded font-mono text-xs bg-indigo-100 text-indigo-900">
                      metric: {s.parsed.metric.join(", ")}
                    </span>
                  )}
                </div>
                {s.parsed.entities.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Entities</div>
                    <div className="flex flex-wrap gap-2">
                      {s.parsed.entities.map((e, j) => (
                        <span
                          key={j}
                          className="px-2 py-1 rounded font-mono text-xs bg-yellow-50 text-yellow-900 border border-yellow-200"
                        >
                          {e.type}: {e.name || e.street || e.value || e.raw}
                          {e.cityName && ` (${e.cityName})`}
                          {e.isGroup && ` (group of ${e.subdivisions?.length || "?"})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {Object.keys(s.parsed.filters).length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Filters</div>
                    <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto">
                      {JSON.stringify(s.parsed.filters, null, 2)}
                    </pre>
                  </div>
                )}
              </section>
            ) : (
              <p className="text-xs text-red-600">parser failed</p>
            )}

            {/* Search results */}
            <section>
              <h3 className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2">
                Search results ({s.searchResults.length})
              </h3>
              {s.searchResults.length === 0 ? (
                <p className="text-sm text-gray-400">No matches.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {s.searchResults.map((r, j) => (
                    <li
                      key={j}
                      className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm"
                    >
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${typeColor(r.type)}`}>
                        {r.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{r.label}</div>
                        {r.sublabel && (
                          <div className="text-xs text-gray-500 truncate">{r.sublabel}</div>
                        )}
                      </div>
                      {r.type === "listing" && r.price && (
                        <span className="text-xs text-gray-700 font-mono">
                          {formatPrice(r.price)}
                          {r.beds != null && ` · ${r.beds}bd`}
                          {r.baths != null && ` · ${r.baths}ba`}
                        </span>
                      )}
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${sourceColor(r.source)}`}>
                        {r.source}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Decision preview (what we'd render) */}
            {s.parsed && (
              <section>
                <h3 className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2">
                  Routing decision (hypothetical)
                </h3>
                <DecisionPreview parsed={s.parsed} searchResults={s.searchResults} />
              </section>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// DecisionPreview — narrates what L1 would do given the parser output and
// search results. Pure UI; doesn't actually call any data layer.
// ----------------------------------------------------------------------

function DecisionPreview({
  parsed,
  searchResults,
}: {
  parsed: ParsedQuery;
  searchResults: SearchResult[];
}) {
  // The decision follows the PARSER, not autocomplete diversity. The
  // autocomplete is an entity-finder (decoration); the parser is the
  // intent classifier. When the parser has high confidence and a clearly
  // resolved entity, route by intent — even if autocomplete returns
  // multiple types (which often happens because articles match query
  // tokens too).

  let decision = "—";
  let detail = "";

  // Conversational / low-confidence → agent-loop fallback
  if (parsed.intent === "conversational" || parsed.confidence < 0.5) {
    decision = "Layer 3 (agent loop fallback)";
    detail = "Conversational or low-confidence — invoke the full chat-v2 agent loop.";
    return preview(decision, detail);
  }

  // Compare needs two entities
  if (parsed.intent === "compare") {
    if (parsed.entities.length >= 2) {
      decision = "Layer 1 → compare (paired getAreaStats)";
      detail = `Two scopes: ${parsed.entities
        .map((e: any) => e.name || e.value || e.label)
        .join(" vs ")}. Run paired aggregation in parallel.`;
    } else {
      decision = "Layer 3 → askClarification";
      detail = "Compare keyword without two clear entities — ask user which two scopes.";
    }
    return preview(decision, detail);
  }

  // Single resolved entity — route by intent
  if (parsed.entities.length >= 1) {
    decision = `Layer 1 → ${parsed.intent}`;
    const e = parsed.entities[0] as any;
    const entityLabel = e.name || e.street || e.value || e.raw || "(unknown)";
    const filterCount = Object.keys(parsed.filters).length;
    detail = `Resolved scope: ${e.type} ${entityLabel}${
      filterCount > 0 ? `, ${filterCount} filter(s) applied at the Mongo layer` : ""
    }.`;
    return preview(decision, detail);
  }

  // No parser entity, but autocomplete has multiple type matches — let the user pick
  const types = new Set(searchResults.map((r) => r.type));
  if (searchResults.length > 0 && types.size >= 2) {
    decision = "entityOptions component";
    detail = `Parser found no entity but autocomplete returned ${searchResults.length} candidates across ${types.size} types — render as clickable options.`;
    return preview(decision, detail);
  }

  // No parser entity, autocomplete has nothing useful → fall through to L3
  decision = "Layer 3 (agent loop fallback)";
  detail = "No entity resolved and no autocomplete hits — let the agent loop try.";
  return preview(decision, detail);
}

function preview(decision: string, detail: string) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-3">
      <div className="text-sm font-semibold text-blue-900">{decision}</div>
      <div className="text-xs text-blue-800 mt-1">{detail}</div>
    </div>
  );
}
