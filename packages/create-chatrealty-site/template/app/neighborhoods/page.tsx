import Link from "next/link";
import { searchListings, getMarketStats, getAgentProfile } from "@/lib/chatrealty";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Neighborhoods" };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// A curated list of areas beats a sample of the feed. This page used to build
// its city list by taking 50 unsorted listings and collecting whatever cities
// showed up — which reads fine until the feed is bigger than the sample. A
// judged build serving the Coachella Valley got an index of Los Angeles,
// Oxnard, San Diego and Camarillo: the agent's own markets weren't in the first
// 50 rows, so their own neighborhoods page never mentioned them. The detail
// pages were correct the whole time; only the index was wrong.
//
// So the index starts from the agent's SERVICE AREAS (ChatRealty profile, or
// AGENT_SERVICE_AREAS in .env.local) and asks the market-stats endpoint for
// each one — a list that is about the agent rather than about whatever the feed
// happened to return first. Deriving from a sample is the fallback for a
// profile with no service areas set, not the default.
//
// `?q=` is honored so that a homepage tile naming a specific market lands
// somewhere that acknowledges the name. It used to be accepted and silently
// dropped: a build linked its hero tiles to `/neighborhoods?q=Balboa
// Peninsula` and visitors got the undifferentiated index with no sign the
// click had meant anything. Prefer linking straight to `/neighborhoods/<slug>`
// (see DESIGN.md); this filter is the safety net, not the intended path.

type Area = { name: string; count: number; median: number | null };

async function curatedAreas(names: string[]): Promise<Area[]> {
  const stats = await Promise.all(
    names.map((name) =>
      getMarketStats({ city: name })
        .then((s) => ({ name, count: s.activeCount ?? 0, median: s.medianListPrice ?? null }))
        // A named market the feed can't price is still a market the agent
        // serves — keep the tile, drop the numbers.
        .catch(() => ({ name, count: 0, median: null }))
    )
  );
  return stats.sort((a, b) => b.count - a.count);
}

async function areasFromFeed(): Promise<Area[]> {
  const { items } = await searchListings({ limit: 50 });
  const byCity = new Map<string, { count: number; prices: number[] }>();
  for (const l of items) {
    if (!l.city) continue;
    const e = byCity.get(l.city) || { count: 0, prices: [] };
    e.count++;
    if (l.listPrice) e.prices.push(l.listPrice);
    byCity.set(l.city, e);
  }
  return [...byCity.entries()]
    .map(([name, { count, prices }]) => ({
      name,
      count,
      median: prices.length ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : null,
    }))
    .sort((a, b) => b.count - a.count);
}

export default async function NeighborhoodsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q || "").trim();
  const agent = await getAgentProfile();
  // Cap the fan-out: a profile listing thirty areas shouldn't fire thirty
  // upstream calls on every render.
  const serviceAreas = agent.serviceAreas.map((a) => a.name).slice(0, 12);
  const curated = serviceAreas.length > 0;
  const all = curated ? await curatedAreas(serviceAreas) : await areasFromFeed();

  // A named market with no inventory in the feed is a real, ordinary outcome
  // (a neighborhood inside a city the feed lists by city name, a market the
  // agent serves but has no active listings in today). Say that plainly and
  // still show the index, rather than rendering an empty page.
  const matched = q
    ? all.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
    : all;
  const areas = matched.length > 0 ? matched : all;

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
          market {curated ? "we serve" : "currently in the feed"}.
        </p>
      )}
      {q && matched.length > 0 && (
        <p className="mt-6 text-sm">
          <Link href="/neighborhoods" className="font-medium text-brand">
            ← All markets
          </Link>
        </p>
      )}

      {areas.length === 0 ? (
        <p className="mt-10 text-sm text-gray-500">No market areas found yet.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map(({ name, count, median }) => (
            <Link
              key={name}
              href={`/neighborhoods/${slugify(name)}`}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <h2 className="font-semibold text-gray-900">{name}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {count > 0
                  ? `${count} active listing${count === 1 ? "" : "s"}${median ? ` · median ${money(median)}` : ""}`
                  : "No active listings right now"}
              </p>
              <p className="mt-3 text-sm font-medium text-brand">View market →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
