"use client";

// Public layout for every CMS listing blog post (category "listing-post"):
// photo carousel → title + open-house banner → property facts → post copy +
// registration form → subdivision → community → map → nearby active listings
// → MLS attribution. Reuses the /mls-listings/[slugAddress] pieces
// (CollageHero, RelatedListings, ListingAttribution).

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Bed, Bath, Square, Calendar, TreePine, Home as HomeIcon, ArrowRight, CalendarClock } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import CollageHero from "@/app/components/mls/CollageHero";
import RelatedListings from "@/app/components/mls/RelatedListings";
import ListingAttribution from "@/app/components/mls/ListingAttribution";
import type { ListingPostCity, ListingPostPhoto, ListingPostSubdivision } from "@/lib/listings/listing-post";
import ListingPostRegisterForm from "./ListingPostRegisterForm";

const ListingPostMap = dynamic(() => import("./ListingPostMap"), { ssr: false });

export interface ListingPostViewProps {
  slug: string;
  title: string;
  excerpt: string;
  content: ReactNode;
  postType: "open-house" | "listing";
  openHouse?: { date?: string; startTime?: string; endTime?: string; notes?: string } | null;
  agentName: string;
  listing: any | null;
  photos: ListingPostPhoto[];
  subdivision: ListingPostSubdivision | null;
  city: ListingPostCity | null;
  preview?: boolean;
}

function money(n?: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function shortMoney(n?: number | null) {
  if (!n) return "—";
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;
}

/** "2026-11-08" → "Sunday, November 8, 2026" without a timezone shift. */
export function formatOpenHouseDate(date?: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || "");
  if (!m) return date || "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function ListingPostView(props: ListingPostViewProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const { listing, subdivision, city } = props;
  const isOpenHouse = props.postType === "open-house";

  const card = `rounded-2xl p-6 backdrop-blur-xl ${
    isLight ? "bg-white/85 border border-gray-200 shadow-lg" : "bg-black/40 border border-neutral-800/60"
  }`;
  const h2 = `mb-4 text-xl font-bold ${isLight ? "text-gray-900" : "text-white"}`;
  const text = isLight ? "text-gray-700" : "text-neutral-300";
  const muted = isLight ? "text-gray-500" : "text-neutral-400";

  const address = listing?.unparsedAddress || listing?.unparsedFirstLineAddress || listing?.address || "";
  const beds = listing?.bedroomsTotal ?? listing?.bedsTotal;
  const baths = listing?.bathroomsTotalInteger ?? listing?.bathsTotal;
  const isActive = listing?.standardStatus === "Active";
  const lat = Number(listing?.latitude);
  const lng = Number(listing?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;

  const citySlug = city?.slug || (listing?.city ? String(listing.city).toLowerCase().replace(/\s+/g, "-") : "");
  const subUrl = subdivision?.slug && citySlug ? `/neighborhoods/${citySlug}/${subdivision.slug}` : null;
  const cityUrl = citySlug ? `/neighborhoods/${citySlug}` : null;

  const facts = [
    { icon: Bed, label: "Beds", value: beds ?? "—" },
    { icon: Bath, label: "Baths", value: baths ?? "—" },
    { icon: Square, label: "Sq Ft", value: listing?.livingArea ? Number(listing.livingArea).toLocaleString("en-US") : "—" },
    { icon: TreePine, label: "Lot", value: listing?.lotSizeSqft ? `${Number(listing.lotSizeSqft).toLocaleString("en-US")} sf` : "—" },
    { icon: Calendar, label: "Built", value: listing?.yearBuilt ?? "—" },
    { icon: HomeIcon, label: "Type", value: listing?.propertySubType || listing?.propertyTypeName || "—" },
  ];

  return (
    <main className={`min-h-screen w-full ${isLight ? "text-gray-900" : "text-white"}`}>
      {props.preview && (
        <div className="sticky top-0 z-40 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black">
          Preview — this post is a draft and is not public yet.
        </div>
      )}

      {/* 1. Photo carousel — the listing's synced MLS photos, unaltered */}
      {props.photos.length > 0 && <CollageHero media={props.photos} />}

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
        {/* 2. Title, price, open-house banner */}
        <header className="space-y-3">
          <p className={`text-xs font-semibold uppercase tracking-widest ${isLight ? "text-blue-600" : "text-emerald-400"}`}>
            {isOpenHouse ? "Open House" : "Featured Listing"}
          </p>
          <h1 className="text-3xl font-bold md:text-4xl">{props.title}</h1>
          {address && (
            <p className={`text-lg ${text}`}>
              {address}
              {listing?.listPrice && isActive ? <span className="ml-3 font-semibold">{money(listing.listPrice)}</span> : null}
            </p>
          )}
          {listing && !isActive && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm">
              This home is no longer an active listing{listing.standardStatus ? ` (${listing.standardStatus})` : ""}. You can still register below for similar homes.
            </p>
          )}
          {isOpenHouse && props.openHouse?.date && (
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${isLight ? "bg-blue-50 border border-blue-200" : "bg-emerald-500/10 border border-emerald-500/30"}`}>
              <CalendarClock className={`h-6 w-6 shrink-0 ${isLight ? "text-blue-600" : "text-emerald-400"}`} />
              <div>
                <p className="font-semibold">{formatOpenHouseDate(props.openHouse.date)}</p>
                <p className={`text-sm ${text}`}>
                  {props.openHouse.startTime}
                  {props.openHouse.endTime ? ` – ${props.openHouse.endTime}` : ""}
                  {props.openHouse.notes ? ` · ${props.openHouse.notes}` : ""}
                </p>
              </div>
            </div>
          )}
        </header>

        {/* 3. Property information */}
        {listing && (
          <section className={card} aria-label="Property information">
            <h2 className={h2}>Property Information</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center gap-2">
                  <f.icon className={`h-5 w-5 ${muted}`} />
                  <div>
                    <p className={`text-xs ${muted}`}>{f.label}</p>
                    <p className="font-semibold">{String(f.value)}</p>
                  </div>
                </div>
              ))}
            </div>
            {listing.hoaFee ? (
              <p className={`mt-4 text-sm ${text}`}>
                HOA {money(listing.hoaFee)}
                {listing.hoaFeeFrequency ? ` ${String(listing.hoaFeeFrequency).toLowerCase()}` : ""}
              </p>
            ) : null}
          </section>
        )}

        {/* 4. Post copy + registration form */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <article className={`lg:col-span-3 ${card}`}>
            {props.excerpt && <p className={`mb-6 text-lg ${text}`}>{props.excerpt}</p>}
            <div className={`prose max-w-none ${isLight ? "prose-gray" : "prose-invert"}`}>{props.content}</div>
          </article>
          <aside className="lg:col-span-2">
            <div id="register" className={`${card} lg:sticky lg:top-6`}>
              <h2 className={h2}>{isOpenHouse ? "Register for the open house" : "Get details on this home"}</h2>
              <ListingPostRegisterForm
                slug={props.slug}
                isOpenHouse={isOpenHouse}
                agentName={props.agentName}
                isLight={isLight}
                preview={props.preview}
              />
            </div>
          </aside>
        </div>

        {/* 5. Subdivision info */}
        {subdivision && (
          <section className={card} aria-label="Subdivision">
            <h2 className={h2}>About {subdivision.name}</h2>
            {subdivision.description && <p className={`mb-4 leading-relaxed ${text}`}>{subdivision.description}</p>}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {subdivision.listingCount != null && <Stat label="Active listings" value={String(subdivision.listingCount)} isLight={isLight} />}
              {subdivision.medianPrice ? <Stat label="Median list price" value={shortMoney(subdivision.medianPrice)} isLight={isLight} /> : null}
              {/* No price-range tile: the precomputed subdivision range mixes in
                  rentals, so it read "$2K–$649K" for a sale community. */}
              {subdivision.hoaMonthlyMin ? <Stat label="HOA / month" value={`${money(subdivision.hoaMonthlyMin)}${subdivision.hoaMonthlyMax && subdivision.hoaMonthlyMax !== subdivision.hoaMonthlyMin ? `–${money(subdivision.hoaMonthlyMax)}` : ""}`} isLight={isLight} /> : null}
            </div>
            {subdivision.features && subdivision.features.length > 0 && (
              <ul className={`mb-4 flex flex-wrap gap-2 text-xs ${text}`}>
                {subdivision.features.map((f) => (
                  <li key={f} className={`rounded-full px-3 py-1 ${isLight ? "bg-gray-100" : "bg-white/5"}`}>{f}</li>
                ))}
              </ul>
            )}
            {subUrl && <MoreLink href={subUrl} label={`View ${subdivision.name}`} isLight={isLight} />}
          </section>
        )}

        {/* 6. Community (city) info */}
        {city && (
          <section className={card} aria-label="Community">
            <h2 className={h2}>Living in {city.name}</h2>
            {city.description && <p className={`mb-4 leading-relaxed ${text}`}>{city.description}</p>}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {city.listingCount != null && <Stat label="Active listings" value={String(city.listingCount)} isLight={isLight} />}
              {city.medianPrice ? <Stat label="Median list price" value={shortMoney(city.medianPrice)} isLight={isLight} /> : null}
              {city.subdivisionCount ? <Stat label="Communities" value={String(city.subdivisionCount)} isLight={isLight} /> : null}
              {city.region ? <Stat label="Region" value={city.region} isLight={isLight} /> : null}
            </div>
            {cityUrl && <MoreLink href={cityUrl} label={`Explore ${city.name}`} isLight={isLight} />}
          </section>
        )}

        {/* 7. Map */}
        {hasCoords && (
          <section className={card} aria-label="Map">
            <h2 className={h2}>Location</h2>
            <ListingPostMap latitude={lat} longitude={lng} address={address} isLight={isLight} />
          </section>
        )}

        {/* MLS attribution — required on any page showing another brokerage's listing */}
        {listing && (
          <div className={card}>
            <ListingAttribution listing={listing} className={`text-xs ${muted}`} />
          </div>
        )}
      </div>

      {/* 8. Sliding carousel of nearby active listings */}
      {listing?.city && (
        <RelatedListings
          city={listing.city}
          subdivisionName={listing.subdivisionName}
          excludeListingKey={listing.listingKey || ""}
          listPrice={listing.listPrice}
        />
      )}
    </main>
  );
}

function Stat({ label, value, isLight }: { label: string; value: string; isLight: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center ${isLight ? "bg-gray-50 border border-gray-200" : "bg-white/5 border border-white/10"}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>{label}</div>
    </div>
  );
}

function MoreLink({ href, label, isLight }: { href: string; label: string; isLight: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 text-sm font-semibold ${isLight ? "text-blue-600" : "text-emerald-400"}`}
    >
      {label} <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
