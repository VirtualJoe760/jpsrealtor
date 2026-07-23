import Link from "next/link";
import { searchListings } from "@/lib/chatrealty";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Neighborhoods" };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// Derived from live data — no hardcoded city list. Whatever markets the
// data source actually covers become the neighborhood index.
export default async function NeighborhoodsIndexPage() {
  const { items } = await searchListings({ limit: 50 });
  const byCity = new Map<string, { count: number; prices: number[] }>();
  for (const l of items) {
    if (!l.city) continue;
    const e = byCity.get(l.city) || { count: 0, prices: [] };
    e.count++;
    if (l.listPrice) e.prices.push(l.listPrice);
    byCity.set(l.city, e);
  }
  const cities = [...byCity.entries()].sort((a, b) => b[1].count - a[1].count);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Neighborhoods</h1>
      <p className="mt-1 text-sm text-gray-500">
        Explore market data and active homes by area.
      </p>

      {cities.length === 0 ? (
        <p className="mt-10 text-sm text-gray-500">No market areas found yet.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map(([city, { count, prices }]) => {
            const median = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
            return (
              <Link
                key={city}
                href={`/neighborhoods/${slugify(city)}`}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <h2 className="font-semibold text-gray-900">{city}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {count} active listing{count === 1 ? "" : "s"} shown
                  {median ? ` · median ${money(median)}` : ""}
                </p>
                <p className="mt-3 text-sm font-medium text-brand">View market →</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
