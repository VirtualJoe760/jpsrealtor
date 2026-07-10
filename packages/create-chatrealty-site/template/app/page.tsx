import Link from "next/link";

export default function Home() {
  return (
    <div>
      <section className="rounded-2xl bg-brand px-6 py-16 text-center text-white">
        <h1 className="text-3xl font-bold sm:text-4xl">Find your next home</h1>
        <p className="mx-auto mt-3 max-w-xl text-white/80">
          Search live MLS listings, explore the map, save your favorites, and dig into neighborhood
          market data — all in one place.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/listings"
            className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand transition hover:bg-white/90"
          >
            Browse listings
          </Link>
          <Link
            href="/neighborhoods/palm-desert"
            className="rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Explore neighborhoods
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          { title: "Live search", body: "Filter by city, price, beds, baths, and pool against the current MLS feed." },
          { title: "Map + favorites", body: "See homes on an interactive map and save the ones you love." },
          { title: "Neighborhood data", body: "Median price, days-on-market, and active inventory per area." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
