import Link from "next/link";
import { searchListings, getMarketStats, getAgentProfile, getMarketCities } from "@/lib/chatrealty";
import type { MarketStats } from "@/lib/types";
import ListingCard from "@/components/ListingCard";
import RecommendedRail from "@/components/RecommendedRail";
import { money, num } from "@/lib/format";

export const dynamic = "force-dynamic";

// The homepage is a NEUTRAL CANVAS with real sections — hero, featured
// listings, market strip, agent intro, CTA. The build guide's design step
// restyles all of it to the agent's brand; the sections give it real bones.
export default async function Home() {
  // Featured homes come from the scoped browse (see MARKET SCOPE in
  // lib/chatrealty.ts) — this section used to show whatever the feed listed
  // most recently, which on a Coachella Valley site meant Camarillo and Oxnard.
  const [agent, featured, marketCities] = await Promise.all([
    getAgentProfile(),
    searchListings({ limit: 3 }),
    getMarketCities().catch(() => [] as string[]),
  ]);
  const firstArea = agent.serviceAreas[0]?.name;
  // The stats endpoint needs a place: `{}` is a 400 and the strip silently
  // never rendered.
  //
  // ASK ABOUT EVERY MARKET, NOT JUST THE FIRST. This used to ask about
  // serviceAreas[0] alone and hide the strip when that one city came back
  // empty — so a build whose first listed market was its smallest (Coachella,
  // ahead of Indio) rendered no market section at all and read as a missing
  // feature. A city with no active inventory today is ordinary; a homepage that
  // silently drops a section over it is not. Walk the markets and show the
  // first one with homes in it.
  const statsCities = (marketCities.length > 0
    ? marketCities
    : agent.serviceAreas.map((a) => a.name)
  ).slice(0, 4);
  // AND SHOW THE BIGGEST MARKET, NOT THE FIRST ONE THAT ISN'T EMPTY. Taking
  // the first non-empty city put a judged build's homepage on the two La
  // Quinta listings it happened to hold — a $924k home and a $12M one —
  // ahead of the 27 Indio listings sitting behind them, and published
  // "$6,462,000 median list price" as the market number for the whole site.
  // Arithmetically correct, and a buyer reading it would misjudge the market
  // completely. The largest market is both the more representative sample and
  // the one the agent most likely leads with.
  let stats: MarketStats | null = null;
  let statsCity: string | undefined;
  for (const city of statsCities) {
    const s = await getMarketStats({ city }).catch(() => null);
    if (s && s.activeCount > 0 && (!stats || s.activeCount > stats.activeCount)) {
      stats = s;
      statsCity = city;
    }
  }
  // A median over a handful of listings is not a market statistic, it is one
  // listing's price wearing a statistic's label. Below this, show the count —
  // which is true at any size — and drop the medians rather than publish a
  // number that misinforms. Same rule the neighborhood pages should follow.
  const MIN_MEDIAN_SAMPLE = 5;
  const medianIsMeaningful = Boolean(stats && stats.activeCount >= MIN_MEDIAN_SAMPLE);
  // Silence is the bug this whole section keeps producing: say why in the dev
  // log so the next builder doesn't go looking for a broken endpoint.
  if (!stats && process.env.NODE_ENV !== "production") {
    console.warn(
      statsCities.length === 0
        ? "[home] No market stats strip: this site has no service areas. Set AGENT_SERVICE_AREAS (or MARKET_CITIES) in .env.local."
        : `[home] No market stats strip: none of ${statsCities.join(", ")} has active for-sale inventory yet. ` +
            "That is a seeding question (npx @chatrealty/sync doctor), not a broken endpoint — the section renders as soon as one of them does."
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="rounded-2xl bg-brand px-6 py-16 text-center text-white">
        <h1 className="text-3xl font-bold sm:text-4xl">
          {agent.headline || "Find your next home"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-white/80">
          {agent.tagline ||
            "Search live listings, explore the map, save your favorites, and dig into neighborhood market data."}
          {agent.name ? ` — with ${agent.name}.` : ""}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {/* Literal white, not bg-surface: these sit on the brand hero, which
              does not follow the light/dark tokens. */}
          <Link
            href="/listings"
            className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand transition hover:bg-white/90"
          >
            Browse listings
          </Link>
          <Link
            href="/neighborhoods"
            className="rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Explore neighborhoods
          </Link>
        </div>
      </section>

      {/* Featured listings — live data */}
      {featured.items.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-gray-900">Featured homes</h2>
            <Link href="/listings" className="text-sm font-medium text-brand hover:underline">
              See all →
            </Link>
          </div>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.items.map((l) => (
              <ListingCard key={l.listingKey} listing={l} priority />
            ))}
          </div>
        </section>
      )}

      {/* Recommended for you — personalized from the visitor's saved homes
          (client-side; renders only once they've saved at least one). */}
      <RecommendedRail />

      {/* Market strip — live stats */}
      {stats && stats.activeCount > 0 && (
        <section
          className={`mt-12 grid gap-4 rounded-2xl border border-gray-200 bg-surface p-6 ${
            medianIsMeaningful ? "sm:grid-cols-3" : ""
          }`}
        >
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{num(stats.activeCount)}</p>
            <p className="text-sm text-gray-500">Active listings{statsCity ? ` in ${statsCity}` : ""}</p>
          </div>
          {medianIsMeaningful ? (
            <>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {stats.medianListPrice ? money(stats.medianListPrice) : "—"}
                </p>
                <p className="text-sm text-gray-500">Median list price</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {stats.medianDaysOnMarket ?? "—"}
                </p>
                <p className="text-sm text-gray-500">Median days on market</p>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Too few active listings here right now to quote a meaningful median price or
              days-on-market. Ask about a specific home or neighborhood instead.
            </p>
          )}
        </section>
      )}

      {/* Agent intro */}
      {(agent.bio || agent.name) && (
        <section className="mt-12 flex flex-col items-center gap-6 rounded-2xl border border-gray-200 bg-surface p-8 sm:flex-row">
          {agent.headshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.headshot}
              alt={agent.name || "Agent"}
              className="h-24 w-24 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-brand text-3xl font-bold text-white">
              {(agent.name || "A").slice(0, 1)}
            </div>
          )}
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-bold text-gray-900">
              {agent.name || "Your local agent"}
              {agent.brokerageName ? (
                <span className="ml-2 text-sm font-normal text-gray-500">{agent.brokerageName}</span>
              ) : null}
            </h2>
            <p className="mt-2 line-clamp-3 text-sm text-gray-600">
              {agent.bio || "Local expertise, live data, and a direct line when you're ready."}
            </p>
            <Link href="/about" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
              More about {agent.name ? agent.name.split(" ")[0] : "me"} →
            </Link>
          </div>
        </section>
      )}

      {/* CTA — an INVERTED block: ink background, page-coloured text. Written
          as bg-ink/text-surface rather than bg-gray-900/text-white so it flips
          with the theme; in a dark build `bg-gray-900` is a light slab and
          white text on it disappears. */}
      <section className="mt-12 rounded-2xl bg-ink px-6 py-12 text-center text-surface">
        <h2 className="text-2xl font-bold">
          {firstArea ? `Thinking about ${firstArea}?` : "Ready when you are"}
        </h2>
        {/* opacity-80, not text-surface/80: Tailwind 3 can't apply an alpha
            modifier to a raw var() colour — it silently drops the modifier. */}
        <p className="mx-auto mt-2 max-w-md text-sm text-surface opacity-80">
          Get a straight answer about any home, neighborhood, or number on this site.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-block rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white"
        >
          Get in touch
        </Link>
      </section>
    </div>
  );
}
