import type { Metadata } from "next";
import { getMarketStats, searchListings } from "@/lib/chatrealty";
import { money, num } from "@/lib/format";
import ListingCard from "@/components/ListingCard";

// The slug is treated as a city name ("palm-desert" → "Palm Desert"). Extend to
// resolve subdivisions or a curated area list as your coverage grows.
function deslugify(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = deslugify(slug);
  return {
    title: `${city} homes for sale + market stats`,
    description: `Active listings and market data for ${city}.`,
  };
}

export default async function NeighborhoodPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const city = deslugify(slug);

  const [statsResult, listingsResult] = await Promise.allSettled([
    getMarketStats({ city }),
    searchListings({ city, limit: 12 }),
  ]);

  const stats = statsResult.status === "fulfilled" ? statsResult.value : null;
  const listings = listingsResult.status === "fulfilled" ? listingsResult.value.items : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{city}</h1>
      <p className="mt-1 text-gray-500">Current market snapshot and active homes for sale.</p>

      {stats && (
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Active homes", num(stats.activeCount)],
            ["Median price", money(stats.medianListPrice)],
            ["Median days on market", stats.medianDaysOnMarket != null ? num(stats.medianDaysOnMarket) : "—"],
            [
              "Price range",
              stats.priceRange ? `${money(stats.priceRange.min)} – ${money(stats.priceRange.max)}` : "—",
            ],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-gray-200 bg-white p-4">
              <dt className="text-xs uppercase tracking-wide text-gray-400">{k}</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <h2 className="mb-4 mt-10 text-lg font-semibold text-gray-900">Active listings in {city}</h2>
      {listings.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          No active listings found for {city} right now.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard key={l.listingKey} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
