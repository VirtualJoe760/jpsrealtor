"use client";

// The conversation itself: bubbles + listing result cards.
//
// Shared by all three CHAP presentations, because the cards are where the
// COMPLIANCE lives — every listing shown has to carry its listing office and
// agent. Duplicating that per presentation is how one of them eventually ships
// without attribution.
//
// Presentation-agnostic: sizing comes from the parent, so the same component
// reads correctly in a 380px widget and a full-width search page.

import type { ChapCard, ChapMsg } from "@/lib/use-chap";

const fmt = (n: number | null) =>
  n == null
    ? "—"
    : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function ChapResultCard({ l, size = "sm" }: { l: ChapCard; size?: "sm" | "md" }) {
  const big = size === "md";
  return (
    <a
      href={l.detailUrl}
      className={`flex gap-3 border border-gray-200 p-2 transition hover:border-brand ${
        big ? "rounded-xl p-3" : "rounded-lg"
      }`}
      style={{ borderRadius: "var(--radius)" }}
    >
      {l.thumbUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={l.thumbUrl}
          alt=""
          className={`object-cover ${big ? "h-24 w-32" : "h-14 w-20"}`}
          style={{ borderRadius: "calc(var(--radius) * 0.6)" }}
        />
      )}
      <div className={`min-w-0 ${big ? "text-sm" : "text-xs"}`}>
        <p className="font-semibold text-gray-900">{fmt(l.price)}</p>
        <p className="truncate text-gray-600">
          {[l.address, l.city].filter(Boolean).join(", ")}
        </p>
        <p className="text-gray-500">
          {l.beds ?? "—"} bd · {l.baths ?? "—"} ba · {l.sqft?.toLocaleString() ?? "—"} sqft
        </p>
        {/* COMPLIANCE — never remove. IDX requires the listing office (and
            agent, where the feed supplies it) wherever a listing appears. */}
        {(l.listOfficeName || l.listAgentName) && (
          <p className={`truncate text-gray-400 ${big ? "text-xs" : "text-[10px]"}`}>
            Listed by {[l.listOfficeName, l.listAgentName].filter(Boolean).join(" — ")}
          </p>
        )}
      </div>
    </a>
  );
}

export default function ChapMessages({
  msgs,
  busy,
  size = "sm",
  empty,
}: {
  msgs: ChapMsg[];
  busy: boolean;
  size?: "sm" | "md";
  empty?: React.ReactNode;
}) {
  const big = size === "md";
  return (
    <>
      {msgs.length === 0 && empty}
      {msgs.map((m, i) => (
        <div key={i}>
          <div
            className={
              m.role === "user"
                ? `ml-8 bg-brand px-3 py-2 text-white ${big ? "text-base" : "text-sm"}`
                : `mr-8 bg-gray-100 px-3 py-2 text-gray-800 ${big ? "text-base" : "text-sm"}`
            }
            style={{ borderRadius: "var(--radius)" }}
          >
            {m.content}
          </div>
          {m.listings && m.listings.length > 0 && (
            <div className={`mt-2 ${big ? "grid gap-3 sm:grid-cols-2" : "space-y-2"}`}>
              {m.listings.map((l) => (
                <ChapResultCard key={l.listingKey} l={l} size={size} />
              ))}
            </div>
          )}
        </div>
      ))}
      {busy && <p className="text-xs text-gray-400">Searching…</p>}
    </>
  );
}
