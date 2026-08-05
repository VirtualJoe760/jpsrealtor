import type { Metadata } from "next";
import ListingsBrowser from "@/components/ListingsBrowser";
import { getMarketCities } from "@/lib/chatrealty";

export const metadata: Metadata = {
  title: "Homes for sale",
  description: "Search live MLS listings with filters and an interactive map.",
};

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const [{ city }, marketCities] = await Promise.all([searchParams, getMarketCities()]);
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
      <ListingsBrowser initialCity={city || ""} marketCities={marketCities} />
    </div>
  );
}
