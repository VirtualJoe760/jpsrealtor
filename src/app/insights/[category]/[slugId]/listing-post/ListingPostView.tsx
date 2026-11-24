"use client";

// Public layout for every CMS listing blog post (category "listing-post"):
// photo carousel → title + open-house banner → property facts → post copy +
// registration form → subdivision → community → map with nearby comparables
// → MLS attribution. Reuses the /mls-listings/[slugAddress] pieces
// (CollageHero, ListingAttribution).

import { Suspense, use, useEffect, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Bed, Bath, Square, Calendar, TreePine, Home as HomeIcon, ArrowRight, CalendarClock } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import CollageHero from "@/app/components/mls/CollageHero";
import ListingAttribution from "@/app/components/mls/ListingAttribution";
import ListingPropertyDetails from "@/app/components/mls/ListingPropertyDetails";
import ListingCMASection from "@/app/components/mls/ListingCMASection";
import MortgageCalculator, { getListingMortgageCosts } from "@/app/components/mls/map/MortgageCalculator";
import type { ListingPostCity, ListingPostMapData, ListingPostPhoto, ListingPostSubdivision } from "@/lib/listings/listing-post";
import type { LeadGateClientConfig } from "@/lib/listings/lead-gate";
import ListingPostGate from "./ListingPostGate";
import OpenHouseAttendancePrompt from "./OpenHouseAttendancePrompt";
import type { ListingOpenHouse } from "@/lib/listings/listing-post-open-houses";
import { trackViewContent } from "@/lib/meta-pixel";

const ListingPostMap = dynamic(() => import("./ListingPostMap"), { ssr: false });

export interface ListingPostViewProps {
  slug: string;
  title: string;
  description: string;
  content: ReactNode;
  openHouses: ListingOpenHouse[];
  attendanceDate?: string;
  agentName: string;
  listing: any | null;
  photos: ListingPostPhoto[];
  subdivision: ListingPostSubdivision | null;
  city: ListingPostCity | null;
  mapData: Promise<ListingPostMapData | null> | null;
  preview?: boolean;
  reviewingPublishedPost?: boolean;
  promptForAttendance?: boolean;
  /**
   * False when the visitor has not registered. The server has ALREADY stripped
   * the gated half in that case (listing-post-teaser.ts) — this flag only stops
   * us rendering empty shells for sections whose data is gone.
   */
  unlocked?: boolean;
  /** null when there is no gate to run (unlocked, or the agent turned it off). */
  gateConfig?: LeadGateClientConfig | null;
  gateBannerUrl?: string;
  /** Walkthrough video, gated with the rest of the media. */
  videoUrl?: string | null;
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

const OPEN_HOUSE_TIME_ZONE = "America/Los_Angeles";

function DeferredListingMap({ data, latitude, longitude, address, isLight }: {
  data: Promise<ListingPostMapData | null>;
  latitude: number;
  longitude: number;
  address: string;
  isLight: boolean;
}) {
  const map = use(data);
  if (!map) return null;
  return <ListingPostMap latitude={latitude} longitude={longitude} address={address} data={map} isLight={isLight} />;
}
const pacificOffset = new Intl.DateTimeFormat("en-US", {
  timeZone: OPEN_HOUSE_TIME_ZONE,
  timeZoneName: "shortOffset",
});

function calendarTime(date: string, time: string) {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(time.trim());
  if (!match) return null;
  const [, rawHour, minute, second = "00", meridiem] = match;
  let hour = Number(rawHour);
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = hour % 12 + (meridiem.toLowerCase() === "pm" ? 12 : 0);
  }
  if (hour > 23 || Number(minute) > 59 || Number(second) > 59) return null;
  const wallTime = Date.parse(`${date}T${String(hour).padStart(2, "0")}:${minute}:${second}Z`);
  if (!Number.isFinite(wallTime)) return null;
  let instant = wallTime;
  // Recheck the offset at the resulting UTC instant for DST transition dates.
  for (let pass = 0; pass < 2; pass++) {
    const offset = pacificOffset.formatToParts(new Date(instant))
      .find((part) => part.type === "timeZoneName")?.value;
    const offsetHours = /^GMT([+-]\d{1,2})$/.exec(offset ?? "");
    if (!offsetHours) return null;
    instant = wallTime - Number(offsetHours[1]) * 3600000;
  }
  return new Date(instant).toISOString().replace(/[-:]/g, "").replace(".000Z", "Z");
}

function openHouseCalendarUrl(event: ListingOpenHouse, title: string, address: string) {
  const start = calendarTime(event.date, event.startTime);
  const end = calendarTime(event.date, event.endTime);
  if (!start || !end || end <= start) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE", text: `Open House · ${title}`, dates: `${start}/${end}`,
    stz: OPEN_HOUSE_TIME_ZONE, etz: OPEN_HOUSE_TIME_ZONE, location: address,
  });
  return `https://calendar.google.com/calendar/r/eventedit?${params}`;
}

export default function ListingPostView(props: ListingPostViewProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const { listing, subdivision, city } = props;
  const hasOpenHouse = props.openHouses.length > 0;
  const openHouseRow = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const row = openHouseRow.current;
    if (!row) return;

    function scrollCalendar(event: WheelEvent) {
      if (!row || !event.cancelable || event.ctrlKey || event.shiftKey ||
          Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;

      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? row.clientWidth : 1;
      const available = row.scrollWidth - row.clientWidth;
      const next = Math.round(Math.max(0, Math.min(available, row.scrollLeft + event.deltaY * unit)));
      // Let the page scroll when the calendar has reached either end.
      if (Math.abs(next - row.scrollLeft) < 1) return;
      event.preventDefault();
      row.scrollLeft = next;
    }

    row.addEventListener("wheel", scrollCalendar, { passive: false });
    return () => row.removeEventListener("wheel", scrollCalendar);
  }, [hasOpenHouse]);

  // Default true so any caller that predates the gate keeps its old behaviour
  // rather than silently rendering a locked page.
  const unlocked = props.unlocked !== false;

  const card = `rounded-2xl p-6 backdrop-blur-xl ${
    isLight ? "bg-white/85 border border-gray-200 shadow-lg" : "bg-black/40 border border-neutral-800/60"
  }`;
  const h2 = `mb-4 text-xl font-bold ${isLight ? "text-gray-900" : "text-white"}`;
  const text = isLight ? "text-gray-700" : "text-neutral-300";
  const muted = isLight ? "text-gray-500" : "text-neutral-400";

  const address = listing?.unparsedAddress || listing?.unparsedFirstLineAddress || listing?.address || "";
  const beds = listing?.bedroomsTotal ?? listing?.bedsTotal;
  const baths = listing?.bathroomsTotalInteger ?? listing?.bathsTotal;
  const lotSize = listing?.lotSizeArea || listing?.lotSizeSqft;
  const hoaFee = listing?.associationFee ?? listing?.hoaFee;
  const hoaFrequency = listing?.associationFeeFrequency || listing?.hoaFeeFrequency;
  const isActive = listing?.standardStatus === "Active";
  const lat = Number(listing?.latitude);
  const lng = Number(listing?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;

  // Meta Pixel ViewContent. These pages fired NOTHING before, so none of this
  // traffic was retargetable — the audience worth having is "viewed a listing
  // post, did not register", and it does not exist until this runs.
  //
  // Fires on the teaser too, deliberately: a visitor who bounces at the wall is
  // exactly who the agent wants to chase. The pixel id is the tenant's own,
  // resolved in the root layout from agentProfile.tracking.
  //
  // `preview` is excluded so an agent proofing their own draft does not pollute
  // their own audience.
  useEffect(() => {
    if (props.preview || props.reviewingPublishedPost || !listing?.listingKey) return;
    trackViewContent({
      listingKey: String(listing.listingKey),
      address: address || undefined,
      price: typeof listing.listPrice === "number" ? listing.listPrice : undefined,
      bedrooms: typeof beds === "number" ? beds : undefined,
      bathrooms: typeof baths === "number" ? baths : undefined,
      city: listing.city || undefined,
      subdivision: listing.subdivisionName || undefined,
    });
    // Once per post view; re-firing on a theme toggle would double-count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.listingKey, props.preview, props.reviewingPublishedPost]);

  const citySlug = city?.slug || (listing?.city ? String(listing.city).toLowerCase().replace(/\s+/g, "-") : "");
  const subUrl = subdivision?.slug && citySlug ? `/neighborhoods/${citySlug}/${subdivision.slug}` : null;
  const cityUrl = citySlug ? `/neighborhoods/${citySlug}` : null;

  const facts = [
    { icon: Bed, label: "Beds", value: beds ?? "—" },
    { icon: Bath, label: "Baths", value: baths ?? "—" },
    { icon: Square, label: "Sq Ft", value: listing?.livingArea ? Number(listing.livingArea).toLocaleString("en-US") : "—" },
    { icon: TreePine, label: "Lot", value: lotSize ? `${Number(lotSize).toLocaleString("en-US")} sf` : "—" },
    { icon: Calendar, label: "Built", value: listing?.yearBuilt ?? "—" },
    { icon: HomeIcon, label: "Type", value: listing?.propertySubType || listing?.propertyTypeName || "—" },
  ];
  const salePrice = Number(listing?.listPrice);
  const showMortgage = unlocked && isActive && Number.isFinite(salePrice) && salePrice > 0 &&
    (listing?.propertyType === "A" || listing?.propertyType === "C");

  return (
    <main className={`min-h-screen w-full ${isLight ? "text-gray-900" : "text-white"}`}>
      {props.preview && (
        <div className="sticky top-0 z-40 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black">
          Preview — this post is a draft and is not public yet.
        </div>
      )}
      {props.reviewingPublishedPost && (
        <div className="sticky top-0 z-40 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black">
          Author preview · Full listing details
        </div>
      )}

      {/* 1. Carousel — the listing's synced MLS photos, unaltered, with the
          walkthrough video first when there is one. CollageHero's MediaItem
          already accepts type "video"; a locked visitor gets neither the video
          nor the photos past the teaser slice. */}
      {(props.photos.length > 0 || props.videoUrl) && (
        <CollageHero
          media={[
            ...(props.videoUrl ? [{ type: "video" as const, src: props.videoUrl, alt: `${address} walkthrough video` }] : []),
            ...props.photos,
          ]}
        />
      )}

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
        {/* 2. Title, price, open-house banner */}
        <header className="space-y-3">
          <p className={`text-xs font-semibold uppercase tracking-widest ${isLight ? "text-blue-600" : "text-emerald-400"}`}>
            Featured Listing
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
              This home is no longer an active listing{listing.standardStatus ? ` (${listing.standardStatus})` : ""}.
            </p>
          )}
          {hasOpenHouse && (
            <section aria-label="Open house schedule" className="min-w-0">
              <h2 className="font-semibold">Upcoming open houses</h2>
              <ul ref={openHouseRow} className="mt-2 flex gap-3 overflow-x-auto overscroll-x-contain p-1 pb-3">
                {props.openHouses.map((event) => {
                  const { date, startTime, endTime } = event;
                  const href = openHouseCalendarUrl(event, props.title, address || props.title);
                  const className = `flex h-full items-start gap-3 rounded-xl border px-4 py-3 ${
                    isLight ? "border-blue-200 bg-blue-50" : "border-emerald-500/30 bg-emerald-500/10"
                  }`;
                  const summary = (
                    <>
                      <CalendarClock aria-hidden="true" className={`h-6 w-6 shrink-0 ${isLight ? "text-blue-600" : "text-emerald-400"}`} />
                      <span>
                        <span className="block font-semibold">{formatOpenHouseDate(date)}</span>
                        <span className={`block text-sm ${text}`}>{[startTime, endTime].filter(Boolean).join(" – ")}</span>
                        {href && <span className={`mt-1 block text-xs font-medium ${isLight ? "text-blue-700" : "text-emerald-300"}`}>Add to Google Calendar</span>}
                      </span>
                    </>
                  );
                  return (
                    <li key={JSON.stringify([date, startTime, endTime])} className="w-64 max-w-[85%] shrink-0">
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer"
                          className={`${className} transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${isLight ? "hover:bg-blue-100" : "hover:bg-emerald-500/20"}`}>
                          {summary}
                        </a>
                      ) : <div className={className}>{summary}</div>}
                    </li>
                  );
                })}
              </ul>
            </section>
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
            {hoaFee ? (
              <p className={`mt-4 text-sm ${text}`}>
                HOA {money(hoaFee)}
                {hoaFrequency ? ` ${String(hoaFrequency).toLowerCase()}` : ""}
              </p>
            ) : null}
          </section>
        )}

        <div className={`grid gap-6 ${showMortgage ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}`}>
          <div className="min-w-0 space-y-6">
            {(props.description || props.content) && (
              <article className={card}>
                <h2 className={h2}>Property Description</h2>
                {props.description && <p className={`whitespace-pre-line text-lg leading-relaxed ${text}`}>{props.description}</p>}
                {props.content && (
                  <div className={`prose mt-6 max-w-none ${isLight ? "prose-gray" : "prose-invert"}`}>{props.content}</div>
                )}
              </article>
            )}
            {unlocked && listing && (
              <ListingPropertyDetails listing={listing} subdivisionUrl={subUrl} isLight={isLight} />
            )}
          </div>
          {showMortgage && (
            <aside className={`min-w-0 self-start ${card}`}>
              <h2 className={h2}>Mortgage Calculator</h2>
              <MortgageCalculator price={salePrice} downPayment={Math.round(salePrice * 0.2)}
                {...getListingMortgageCosts(listing)} />
            </aside>
          )}
        </div>
        {!unlocked && props.gateConfig && (
          <ListingPostGate config={props.gateConfig} openHouses={props.openHouses} agentName={props.agentName}
            isLight={isLight} slug={props.slug} bannerUrl={props.gateBannerUrl} preview={props.preview} />
        )}
        {props.promptForAttendance && props.attendanceDate && (
          <OpenHouseAttendancePrompt key={`${props.slug}:${props.attendanceDate}`}
            slug={props.slug} eventDate={props.attendanceDate} isLight={isLight} />
        )}

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
        {unlocked && hasCoords && props.mapData && (
          <section className={card} aria-label="Map">
            <h2 className={h2}>Location</h2>
            <Suspense fallback={<p className={`text-sm ${muted}`}>Loading nearby listings…</p>}>
              <DeferredListingMap latitude={lat} longitude={lng} address={address} data={props.mapData} isLight={isLight} />
            </Suspense>
          </section>
        )}
        {unlocked && listing && <ListingCMASection listing={listing} prebuiltOnly />}

        {/* MLS attribution — required on any page showing another brokerage's listing */}
        {listing && (
          <div className={card}>
            <ListingAttribution listing={listing} className={`text-xs ${muted}`} />
          </div>
        )}
      </div>

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
