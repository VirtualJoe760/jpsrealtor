import type { Metadata } from "next";
import ListingsBrowser from "@/components/ListingsBrowser";
import { getMarketCities } from "@/lib/chatrealty";

export const metadata: Metadata = {
  title: "Homes for sale",
  description: "Search live MLS listings with filters and an interactive map.",
};

/** Filters this page reads out of its own URL. Every one of these round-trips
 *  through the `?back=` link on a listing card, so dropping any of them here is
 *  what "Back to listings lost my search" looks like from the visitor's side. */
type ListingsSearchParams = {
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  minBeds?: string;
  minBaths?: string;
  hasPool?: string;
  /** grid | map — which presentation the browse opens in. */
  view?: string;
};

/** Query values are attacker-controlled text; keep only what the form can show. */
const digits = (v: string | undefined) => (v ? v.replace(/\D/g, "") : "");
const oneOf = (v: string | undefined, allowed: string[]) => (v && allowed.includes(v) ? v : "");

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<ListingsSearchParams>;
}) {
  const [sp, marketCities] = await Promise.all([searchParams, getMarketCities()]);
  const { city } = sp;
  // Re-apply the search the URL describes. The browser below rewrites the
  // address bar from its own applied filters, so if these never reached it the
  // params would be stripped on arrival — the exact regression where the
  // "← Back to listings" href was right and the destination still came up bare.
  const initialFilters = {
    city: city || "",
    minPrice: digits(sp.minPrice),
    maxPrice: digits(sp.maxPrice),
    minBeds: oneOf(sp.minBeds, ["1", "2", "3", "4", "5"]),
    minBaths: oneOf(sp.minBaths, ["1", "2", "3", "4"]),
    hasPool: sp.hasPool === "true",
  };
  // Live data, nothing scoping it → this page is serving the whole feed,
  // including cities the site doesn't serve. That failure is invisible unless
  // you already know the market, so say it out loud in development. Never
  // shown in production: it's a note to the builder, not to a buyer.
  const unscopedWarning =
    process.env.NODE_ENV !== "production" &&
    process.env.CHATREALTY_TEST_DATA !== "true" &&
    marketCities.length === 0;
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Homes for sale</h1>
      {unscopedWarning && (
        <p className="cr-note cr-note-danger mb-6 p-3 text-sm">
          <strong>Dev only:</strong> no market scope is set, so this browse is showing the
          entire feed — every city the token can see. Set <code>MARKET_CITIES</code> (or{" "}
          <code>AGENT_SERVICE_AREAS</code>) in <code>.env.local</code>, or add service areas
          to the ChatRealty profile.
        </p>
      )}
      {/* The unfiltered browse is scoped to the markets this site serves (see
          MARKET SCOPE in lib/chatrealty.ts). Say so, so nobody has to guess
          whether the grid is "everything" or "our market". */}
      <ListingsBrowser
        initialFilters={initialFilters}
        initialView={sp.view === "map" ? "map" : "grid"}
        marketCities={marketCities}
      />
    </div>
  );
}
