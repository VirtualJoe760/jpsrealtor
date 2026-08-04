import Link from "next/link";
import { searchListings } from "@/lib/chatrealty";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Neighborhoods" };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// Derived from live data — no hardcoded city list. Whatever markets the
// data source actually covers become the neighborhood index.
//
// `?q=` is honored so that a homepage tile naming a specific market lands
// somewhere that acknowledges the name. It used to be accepted and silently
// dropped: a build linked its hero tiles to `/neighborhoods?q=Balboa
// Peninsula` and visitors got the undifferentiated index with no sign the
// click had meant anything. Prefer linking straight to `/neighborhoods/<slug>`
// (see DESIGN.md); this filter is the safety net, not the intended path.
export default async function NeighborhoodsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q || "").trim();
  const { items } = await searchListings({ limit: 50 });
  const byCity = new Map<string, { count: number; prices: number[] }>();
  for (const l of items) {
    if (!l.city) continue;
    const e = byCity.get(l.city) || { count: 0, prices: [] };
    e.count++;
    if (l.listPrice) e.prices.push(l.listPrice);
    byCity.set(l.city, e);
  }
  const all = [...byCity.entries()].sort((a, b) => b[1].count - a[1].count);

  // A named market with no inventory in the feed is a real, ordinary outcome
  // (a neighborhood inside a city the feed lists by city name, a market the
  // agent serves but has no active listings in today). Say that plainly and
  // still show the index, rather than rendering an empty page.
  const matched = q
    ? all.filter(([city]) => city.toLowerCase().includes(q.toLowerCase()))
    : all;
  const cities = matched.length > 0 ? matched : all;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {q && matched.length > 0 ? q : "Neighborhoods"}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Explore market data and active homes by area.
      </p>

      {q && matched.length === 0 && all.length > 0 && (
        <p className="mt-6 text-sm text-gray-500">
          No active listings are coming back for “{q}” right now. Here is every
          market currently in the feed.
        </p>
      )}
      {q && matched.length > 0 && (
        <p className="mt-6 text-sm">
          <Link href="/neighborhoods" className="font-medium text-brand">
            ← All markets
          </Link>
        </p>
      )}

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
