"use client";

// CHAP — the floating property-search chat. Renders only when the server says
// chat is configured (CHAT_API_KEY set). Talks to the site's own /api/chat;
// listing results come back as cards with links + attribution.

import { useEffect, useRef, useState } from "react";

type Card = {
  listingKey: string;
  address: string | null;
  city: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  thumbUrl: string | null;
  detailUrl: string;
  listAgentName: string | null;
  listOfficeName: string | null;
};

type Msg = { role: "user" | "assistant"; content: string; listings?: Card[] };

const fmt = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function ChapWidget() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => setEnabled(!!d.enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs, open]);

  if (!enabled) return null;

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        res.ok
          ? { role: "assistant", content: data.reply || "…", listings: data.listings || [] }
          : { role: "assistant", content: "Sorry — I couldn't reach the search service just now." },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Sorry — something went wrong. Try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat about listings"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition hover:scale-105"
      >
        {open ? (
          <span className="text-xl leading-none">×</span>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[520px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="bg-brand px-4 py-3 text-white">
            <p className="text-sm font-semibold">Ask about homes</p>
            <p className="text-xs text-white/70">Live listing search — try “3 beds under $800k with a pool”</p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.length === 0 && (
              <p className="text-sm text-gray-400">
                Ask about price ranges, neighborhoods, pools, or the market.
              </p>
            )}
            {msgs.map((m, i) => (
              <div key={i}>
                <div
                  className={
                    m.role === "user"
                      ? "ml-8 rounded-xl rounded-br-sm bg-brand px-3 py-2 text-sm text-white"
                      : "mr-8 rounded-xl rounded-bl-sm bg-gray-100 px-3 py-2 text-sm text-gray-800"
                  }
                >
                  {m.content}
                </div>
                {m.listings && m.listings.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {m.listings.map((l) => (
                      <a
                        key={l.listingKey}
                        href={l.detailUrl}
                        className="flex gap-3 rounded-lg border border-gray-200 p-2 transition hover:border-brand"
                      >
                        {l.thumbUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.thumbUrl} alt="" className="h-14 w-20 rounded object-cover" />
                        )}
                        <div className="min-w-0 text-xs">
                          <p className="font-semibold text-gray-900">{fmt(l.price)}</p>
                          <p className="truncate text-gray-600">
                            {l.address}, {l.city}
                          </p>
                          <p className="text-gray-500">
                            {l.beds ?? "—"} bd · {l.baths ?? "—"} ba · {l.sqft?.toLocaleString() ?? "—"} sqft
                          </p>
                          {(l.listOfficeName || l.listAgentName) && (
                            <p className="truncate text-[10px] text-gray-400">
                              Listed by {[l.listOfficeName, l.listAgentName].filter(Boolean).join(" — ")}
                            </p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="text-xs text-gray-400">Searching…</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2 border-t border-gray-200 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about homes…"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
