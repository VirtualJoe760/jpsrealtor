import Link from "next/link";
import { searchListings, getMarketStats, getAgentProfile } from "@/lib/chatrealty";
import ListingCard from "@/components/ListingCard";
import { money, num } from "@/lib/format";

export const dynamic = "force-dynamic";

// The homepage is a NEUTRAL CANVAS with real sections — hero, featured
// listings, market strip, agent intro, CTA. The build guide's design step
// restyles all of it to the agent's brand; the sections give it real bones.
export default async function Home() {
  const [agent, featured, stats] = await Promise.all([
    getAgentProfile(),
    searchListings({ limit: 3 }),
    getMarketStats({}).catch(() => null),
  ]);
  const firstArea = agent.serviceAreas[0]?.name;

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
              <ListingCard key={l.listingKey} listing={l} />
            ))}
          </div>
        </section>
      )}

      {/* Market strip — live stats */}
      {stats && stats.activeCount > 0 && (
        <section className="mt-12 grid gap-4 rounded-2xl border border-gray-200 bg-white p-6 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{num(stats.activeCount)}</p>
            <p className="text-sm text-gray-500">Active listings</p>
          </div>
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
        </section>
      )}

      {/* Agent intro */}
      {(agent.bio || agent.name) && (
        <section className="mt-12 flex flex-col items-center gap-6 rounded-2xl border border-gray-200 bg-white p-8 sm:flex-row">
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

      {/* CTA */}
      <section className="mt-12 rounded-2xl bg-gray-900 px-6 py-12 text-center text-white">
        <h2 className="text-2xl font-bold">
          {firstArea ? `Thinking about ${firstArea}?` : "Ready when you are"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
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
