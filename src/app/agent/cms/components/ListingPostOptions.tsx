"use client";

// CMS generator inputs for a "listing blog post": a single-line address field
// with autocomplete over ACTIVE listings (/api/agent/listing-posts/search), and
// the Open house / General listing page choice. Picking a listing that has an
// MLS open house pre-fills the date and times.

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";

export interface ListingPostHit {
  listingKey: string;
  slugAddress: string;
  address: string;
  city: string;
  listPrice: number | null;
  beds: number | null;
  baths: number | null;
  photo: string | null;
  openHouses: Array<{ date: string; startTime: string; endTime: string }>;
}

export interface ListingPostConfig {
  listing: ListingPostHit | null;
  postType: "open-house" | "listing";
  openHouse: { date: string; startTime: string; endTime: string; notes: string };
  videoUrl: string;
  /**
   * Per-post override of the agent's Lead Capture setting. `inherit: true`
   * means every other key here is ignored and the post follows
   * /agent/settings — so a change there moves this post too. Resolved in
   * lib/listings/lead-gate.ts.
   */
  gate: {
    inherit: boolean;
    enabled: boolean;
    mode: "off" | "immediate" | "delay" | "scroll";
    delaySeconds: number;
    scrollPercent: number;
  };
}

export const DEFAULT_LISTING_POST_CONFIG: ListingPostConfig = {
  listing: null,
  postType: "listing",
  openHouse: { date: "", startTime: "", endTime: "", notes: "" },
  videoUrl: "",
  // Inherit by default — the agent's setting is meant to be the one place most
  // posts are controlled from.
  gate: { inherit: true, enabled: true, mode: "delay", delaySeconds: 20, scrollPercent: 50 },
};

/** MLS open-house dates arrive as "MM/DD/YYYY" or ISO; the form wants YYYY-MM-DD. */
function toIsoDay(d: string): string {
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d.trim());
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(d.trim());
  return iso ? iso[1] : "";
}

function nextOpenHouse(list: ListingPostHit["openHouses"]) {
  const today = new Date().toISOString().slice(0, 10);
  return list
    .map((o) => ({ ...o, date: toIsoDay(o.date) }))
    .filter((o) => o.date && o.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

export default function ListingPostOptions({
  config,
  onChange,
  isLight,
}: {
  config: ListingPostConfig;
  onChange: (c: ListingPostConfig) => void;
  isLight: boolean;
}) {
  const [query, setQuery] = useState(config.listing?.address || "");
  const [results, setResults] = useState<ListingPostHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (config.listing && query === config.listing.address) return;
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/agent/listing-posts/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        const data = res.ok ? await res.json() : { results: [] };
        setResults(data.results || []);
        setOpen(true);
      } catch {
        /* aborted or failed — keep the last results */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(hit: ListingPostHit) {
    setQuery(hit.address);
    setOpen(false);
    const oh = nextOpenHouse(hit.openHouses);
    onChange({
      ...config,
      listing: hit,
      ...(oh
        ? { openHouse: { date: oh.date, startTime: oh.startTime, endTime: oh.endTime, notes: config.openHouse.notes } }
        : {}),
    });
  }

  const field = `w-full px-4 py-3 rounded-lg focus:outline-none transition-all ${
    isLight
      ? "bg-white border-2 border-slate-300 text-gray-900 focus:border-blue-500"
      : "bg-gray-800 border-2 border-gray-700 text-white focus:border-emerald-500"
  }`;
  const label = `block text-sm font-semibold mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`;
  const muted = isLight ? "text-gray-500" : "text-gray-400";

  return (
    <div className="space-y-5">
      <div ref={boxRef} className="relative">
        <label className={label}>Listing address</label>
        <div className="relative">
          <MapPin className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (config.listing) onChange({ ...config, listing: null });
            }}
            onFocus={() => results.length && setOpen(true)}
            placeholder="Start typing an active listing's address…"
            className={`${field} pl-9 pr-9`}
            autoComplete="off"
          />
          {loading ? (
            <Loader2 className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin ${muted}`} />
          ) : query ? (
            <button
              type="button"
              aria-label="Clear address"
              onClick={() => {
                setQuery("");
                setResults([]);
                onChange({ ...config, listing: null });
              }}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted}`}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {open && results.length > 0 && !config.listing && (
          <ul
            className={`absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-lg border shadow-xl ${
              isLight ? "bg-white border-slate-200" : "bg-gray-900 border-gray-700"
            }`}
          >
            {results.map((r) => (
              <li key={r.listingKey}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${isLight ? "hover:bg-slate-100" : "hover:bg-gray-800"}`}
                >
                  {r.photo ? (
                    <img src={r.photo} alt="" className="h-10 w-14 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="h-10 w-14 shrink-0 rounded bg-gray-500/20" />
                  )}
                  <span className="min-w-0">
                    <span className={`block truncate font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{r.address}</span>
                    <span className={`block text-xs ${muted}`}>
                      {r.listPrice ? `$${r.listPrice.toLocaleString("en-US")}` : ""}
                      {r.beds != null ? ` · ${r.beds} bd` : ""}
                      {r.baths != null ? ` · ${r.baths} ba` : ""}
                      {r.openHouses.length ? " · open house on MLS" : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && !loading && query.trim().length >= 3 && results.length === 0 && !config.listing && (
          <p className={`mt-2 text-xs ${muted}`}>No active listing matches that address.</p>
        )}
        {config.listing && (
          <p className={`mt-2 text-xs ${muted}`}>
            Selected: {config.listing.address}
            {config.listing.listPrice ? ` · $${config.listing.listPrice.toLocaleString("en-US")}` : ""}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className={label}>Open house date (optional)</label>
          <input
            type="date"
            value={config.openHouse.date}
            onChange={(e) => onChange({ ...config, openHouse: { ...config.openHouse, date: e.target.value } })}
            className={field}
          />
        </div>
        <div className="sm:col-span-1">
          <label className={label}>Starts</label>
          <input
            type="text"
            placeholder="1:00 PM"
            value={config.openHouse.startTime}
            onChange={(e) => onChange({ ...config, openHouse: { ...config.openHouse, startTime: e.target.value } })}
            className={field}
          />
        </div>
        <div className="sm:col-span-1">
          <label className={label}>Ends</label>
          <input
            type="text"
            placeholder="4:00 PM"
            value={config.openHouse.endTime}
            onChange={(e) => onChange({ ...config, openHouse: { ...config.openHouse, endTime: e.target.value } })}
            className={field}
          />
        </div>
        <div className="sm:col-span-3">
          <label className={label}>Notes (optional)</label>
          <input
            type="text"
            placeholder="Refreshments served, gate code at the guard house…"
            maxLength={300}
            value={config.openHouse.notes}
            onChange={(e) => onChange({ ...config, openHouse: { ...config.openHouse, notes: e.target.value } })}
            className={field}
          />
        </div>
      </div>

      {/* Walkthrough video — goes first in the hero carousel, gated with the
          rest of the media. */}
      <div>
        <label className={label}>Video tour (optional)</label>
        <input
          type="url"
          placeholder="https://www.youtube.com/watch?v=…"
          value={config.videoUrl}
          onChange={(e) => onChange({ ...config, videoUrl: e.target.value })}
          className={field}
        />
        <p className={`mt-1 text-xs ${muted}`}>Shows first in the photo carousel.</p>
      </div>

      {/* Per-post gate override */}
      <div className={`rounded-lg border p-4 ${isLight ? "border-slate-200 bg-slate-50" : "border-gray-800 bg-gray-900/40"}`}>
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={config.gate.inherit}
            onChange={(e) => onChange({ ...config, gate: { ...config.gate, inherit: e.target.checked } })}
            className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
          />
          <span>
            <span className={`block text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
              Use my Lead Capture setting
            </span>
            <span className={`mt-0.5 block text-xs ${muted}`}>
              Follows <a href="/agent/settings?step=leadgate" className="underline">Settings → Lead Capture</a>, so
              changing it there moves this post too. Untick to set this post on its own.
            </span>
          </span>
        </label>

        {!config.gate.inherit && (
          <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: isLight ? "#e2e8f0" : "#1f2937" }}>
            <div>
              <label className={label}>When should the wall appear?</label>
              <select
                value={config.gate.mode}
                onChange={(e) =>
                  onChange({
                    ...config,
                    gate: { ...config.gate, mode: e.target.value as ListingPostConfig["gate"]["mode"], enabled: e.target.value !== "off" },
                  })
                }
                className={field}
              >
                <option value="immediate">Right away</option>
                <option value="delay">After a few seconds</option>
                <option value="scroll">After they scroll</option>
                <option value="off">No wall on this post</option>
              </select>
            </div>

            {config.gate.mode === "delay" && (
              <div>
                <label className={label}>Seconds of reading first</label>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={config.gate.delaySeconds}
                  onChange={(e) => onChange({ ...config, gate: { ...config.gate, delaySeconds: Number(e.target.value) } })}
                  className={field}
                />
              </div>
            )}

            {config.gate.mode === "scroll" && (
              <div>
                <label className={label}>How far down the page (%)</label>
                <input
                  type="number"
                  min={5}
                  max={95}
                  step={5}
                  value={config.gate.scrollPercent}
                  onChange={(e) => onChange({ ...config, gate: { ...config.gate, scrollPercent: Number(e.target.value) } })}
                  className={field}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <p className={`text-xs ${muted}`}>
        Photos, price, community info, the map and nearby listings come live from the MLS feed. The post&apos;s
        registration form adds each visitor to your CRM.
      </p>
    </div>
  );
}
