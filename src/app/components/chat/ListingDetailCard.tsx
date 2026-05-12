"use client";

// src/app/components/chat/ListingDetailCard.tsx
//
// Comprehensive in-chat listing detail card. Modeled after the
// production /mls-listings/[slugAddress] page but kept compact for
// the chat surface. Key features:
//
//   - Tall photo gallery (h-[420-540px]) with prev/next + counter
//   - Click any photo → full-screen lightbox with arrow-key nav
//   - Fetches the full enriched listing from /api/mls-listings/[slug]
//     so we have publicRemarks, lotFeatures, architecturalStyle,
//     interior/exterior features, schools, etc. — same data the full
//     page renders.
//   - Agent section pulled from useAgentProfile() (name, headshot,
//     bio, brokerage, license)
//   - Stats grid + property details + features + description
//   - Action row: View Full Listing, View on Map, Generate CMA
//
// Falls back gracefully when the slug-based fetch fails — renders
// only the fields available from the slim props.

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";

// ListingsMap is the polished modern map (AnimatedMarker price pills,
// hover/select states, popup cards) used on city/subdivision pages.
// Lazy-load — maplibre-gl is heavy and we only need it when the
// listing detail card renders.
const ListingsMap = dynamic(
  () => import("@/app/components/map/ListingsMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 bg-gray-100 rounded-lg animate-pulse" />
    ),
  }
);
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Bed,
  Bath,
  Square,
  Calendar,
  Car,
  Droplets,
  Eye,
  Home,
  MapPin,
  BarChart3,
  X,
  Sparkles,
  TreePine,
  TrendingUp,
  School as SchoolIcon,
  Phone,
  Mail,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useAgentProfile } from "@/app/hooks/useAgentProfile";
// Same hook ChatMapView uses to reveal the full map background. Hard
// URL nav (router.push('/chap?view=map&...')) doesn't work right —
// the background map state lives in MapStateContext, not the URL.
import { useMapControl } from "@/app/hooks/useMapControl";

interface ListingDetailCardProps {
  listingKey: string;
  slugAddress: string;
  address: string;
  primaryPhotoUrl?: string;
  city?: string;
  subdivision?: string;
  price?: number;
  status?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSizeSqft?: number;
  yearBuilt?: number;
  propertySubType?: string;
  garageSpaces?: number;
  pool?: boolean;
  spa?: boolean;
  view?: boolean;
  hoaFee?: number;
  hoaFrequency?: string;
  daysOnMarket?: number;
  stories?: number;
  onGenerateCMA?: () => void;
}

interface EnrichedListing {
  publicRemarks?: string;
  privateRemarks?: string;
  architecturalStyle?: string | string[];
  lotFeatures?: string | string[];
  viewType?: string | string[];
  view?: string | string[] | boolean;
  interiorFeatures?: string | string[];
  exteriorFeatures?: string | string[];
  poolFeatures?: string | string[];
  spaFeatures?: string | string[];
  cooling?: string | string[];
  heating?: string | string[];
  flooring?: string | string[];
  appliances?: string | string[];
  parkingFeatures?: string | string[];
  associationName?: string;
  associationFee?: number;
  associationFeeFrequency?: string;
  elementarySchool?: string;
  middleOrJuniorSchool?: string;
  highSchool?: string;
  elementarySchoolDistrict?: string;
  mlsId?: string;
  mlsSource?: string;
  listAgentName?: string;
  listOfficeName?: string;
  bedroomsTotal?: number;
  bathroomsTotalInteger?: number;
  livingArea?: number;
  yearBuilt?: number;
  garageSpaces?: number;
  stories?: number;
  latitude?: number;
  longitude?: number;
}

interface NearbyListing {
  listingKey: string;
  slugAddress?: string;
  unparsedAddress: string;
  city: string;
  listPrice: number;
  bedroomsTotal?: number;
  bathroomsTotalInteger?: number;
  livingArea?: number;
  primaryPhotoUrl?: string | null;
  latitude?: number;
  longitude?: number;
}

export default function ListingDetailCard({
  listingKey,
  slugAddress,
  address,
  primaryPhotoUrl,
  city,
  subdivision,
  price,
  status,
  beds,
  baths,
  sqft,
  lotSizeSqft,
  yearBuilt,
  propertySubType,
  garageSpaces,
  pool,
  spa,
  view,
  hoaFee,
  hoaFrequency,
  daysOnMarket,
  stories,
}: ListingDetailCardProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const { agent } = useAgentProfile();
  const { showMapWithListings } = useMapControl();

  const [photos, setPhotos] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enriched, setEnriched] = useState<EnrichedListing | null>(null);
  const [showRemarks, setShowRemarks] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [nearby, setNearby] = useState<NearbyListing[]>([]);

  // ---------- Photo fetch ----------
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch(`/api/listings/${listingKey}/photos`);
        if (res.ok) {
          const data = await res.json();
          const urls = (data.photos || [])
            .slice(0, 30)
            .map((p: any) =>
              p.uri1600 || p.uri1280 || p.uri1024 || p.uri800 || p.uri640 || p.uriLarge
            )
            .filter(Boolean);
          if (urls.length > 0) setPhotos(urls);
          else if (primaryPhotoUrl && primaryPhotoUrl !== "/images/no-photo.png")
            setPhotos([primaryPhotoUrl]);
        }
      } catch {
        if (primaryPhotoUrl && primaryPhotoUrl !== "/images/no-photo.png")
          setPhotos([primaryPhotoUrl]);
      } finally {
        setLoading(false);
      }
    };
    if (listingKey) fetchPhotos();
  }, [listingKey, primaryPhotoUrl]);

  // ---------- Full listing detail fetch ----------
  // Same /api/mls-listings/[slugAddress] endpoint the full page uses.
  // Gives us publicRemarks, lotFeatures, schools, agent name, etc.
  useEffect(() => {
    const slug = slugAddress || listingKey;
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/mls-listings/${slug}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.listing) setEnriched(data.listing);
      } catch {
        // Soft-fail — slim props still render the card
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slugAddress, listingKey]);

  // ---------- Nearby listings fetch ----------
  // Two-strategy: prefer geographic-radius (bbox query against
  // unified_listings) when the subject has lat/lng, fall back to
  // subdivision/city affinity. The geo path is more reliable —
  // doesn't fail when the subdivision name is unique or the city
  // is sparsely indexed. Capped at 5 entries; the inline map gets
  // cluttered fast.
  useEffect(() => {
    let cancelled = false;
    const subjLat = enriched?.latitude;
    const subjLng = enriched?.longitude;

    (async () => {
      try {
        let listings: any[] = [];

        // Strategy 1 — geo bbox (~3 mile radius). Most reliable when
        // we have subject coordinates. Limit raised to 25 — the
        // upgraded ListingsMap clusters/handles density nicely so
        // showing more nearby inventory is fine.
        if (
          typeof subjLat === "number" &&
          typeof subjLng === "number" &&
          subjLat !== 0 &&
          subjLng !== 0
        ) {
          const params = new URLSearchParams({
            lat: String(subjLat),
            lng: String(subjLng),
            radius: "3",
            limit: "25",
          });
          if (listingKey) params.set("exclude", listingKey);
          const res = await fetch(`/api/listings/nearby?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.listings)) listings = data.listings;
          }
        }

        // Strategy 2 — subdivision/city affinity fallback. Used when
        // we don't have subject coords OR the geo query came back
        // empty (rural area, sparse data).
        if (listings.length === 0 && city) {
          const params = new URLSearchParams({ city, limit: "12" });
          if (subdivision) params.set("subdivision", subdivision);
          if (listingKey) params.set("exclude", listingKey);
          const res = await fetch(`/api/listings/related?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.listings)) listings = data.listings;
          }
        }

        if (!cancelled) setNearby(listings);
      } catch {
        // soft-fail — no nearby section if fetch errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [city, subdivision, listingKey, enriched?.latitude, enriched?.longitude]);

  // ---------- Lightbox keyboard nav ----------
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") goTo(currentIndex - 1);
      if (e.key === "ArrowRight") goTo(currentIndex + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, currentIndex, photos.length]);

  const goTo = useCallback(
    (index: number) => {
      if (photos.length === 0) return;
      const next = (index + photos.length) % photos.length;
      setCurrentIndex(next);
    },
    [photos.length]
  );

  // ---------- Helpers ----------
  const subdivisionUrl =
    subdivision && city
      ? (() => {
          const nonApplicable = ["not applicable", "n/a", "none", "other", "na", "no hoa"];
          if (nonApplicable.some((v) => subdivision.toLowerCase().includes(v))) return null;
          const citySlug = city.toLowerCase().replace(/\s+/g, "-");
          const subdivSlug = subdivision
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
          return `/neighborhoods/${citySlug}/${subdivSlug}`;
        })()
      : null;

  const cityUrl = city
    ? `/neighborhoods/${city.toLowerCase().replace(/\s+/g, "-")}`
    : null;

  const formatPrice = (p: number) => {
    if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(p % 1_000_000 === 0 ? 0 : 2)}M`;
    return `$${p.toLocaleString()}`;
  };

  const statusColor =
    status === "Active"
      ? isLight
        ? "bg-green-100 text-green-700"
        : "bg-green-900/40 text-green-400"
      : status === "Pending"
        ? isLight
          ? "bg-yellow-100 text-yellow-700"
          : "bg-yellow-900/40 text-yellow-400"
        : isLight
          ? "bg-gray-100 text-gray-600"
          : "bg-neutral-700 text-neutral-300";

  // Coalesce slim prop with enriched record so the card uses the
  // freshest data when available.
  const e = enriched || {};
  const fmtList = (v: string | string[] | undefined): string => {
    if (!v) return "";
    if (Array.isArray(v)) return v.filter(Boolean).join(", ");
    return String(v);
  };
  const remarks = e.publicRemarks || "";
  const hasRemarks = remarks.length > 0;
  const lotFeatures = fmtList(e.lotFeatures);
  const interiorFeatures = fmtList(e.interiorFeatures);
  const exteriorFeatures = fmtList(e.exteriorFeatures);
  const poolFeatures = fmtList(e.poolFeatures);
  const cooling = fmtList(e.cooling);
  const heating = fmtList(e.heating);
  const flooring = fmtList(e.flooring);
  const appliances = fmtList(e.appliances);
  const viewText = fmtList(e.viewType || (typeof e.view === "boolean" ? "" : e.view));
  const archStyle = fmtList(e.architecturalStyle);
  const elementarySchool = e.elementarySchool;
  const highSchool = e.highSchool;
  const middleSchool = e.middleOrJuniorSchool;
  const associationName = e.associationName;
  const listAgentName = e.listAgentName;
  const listOfficeName = e.listOfficeName;
  const mlsId = e.mlsId;

  if (loading) {
    return (
      <div className={`rounded-xl overflow-hidden ${isLight ? "bg-gray-100" : "bg-neutral-800"}`}>
        <div className="h-72 md:h-96 flex items-center justify-center">
          <div
            className={`animate-spin h-8 w-8 border-b-2 rounded-full ${isLight ? "border-blue-500" : "border-emerald-400"}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl overflow-hidden shadow-lg ${
        isLight
          ? "bg-white border border-gray-200"
          : "bg-neutral-800/90 border border-neutral-700"
      }`}
    >
      {/* ==== Photo Gallery ==== */}
      {photos.length > 0 && (
        <div className="relative group">
          <div
            className="relative h-80 md:h-[480px] lg:h-[540px] overflow-hidden cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
          >
            <img
              src={photos[currentIndex]}
              alt={`${address} — photo ${currentIndex + 1}`}
              className="w-full h-full object-cover transition-all duration-300"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 flex items-end gap-3">
              {price && (
                <span className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                  {formatPrice(price)}
                </span>
              )}
              {status && (
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}
                >
                  {status}
                </span>
              )}
              {daysOnMarket != null && daysOnMarket >= 0 && (
                <span className="text-xs text-white/80 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                  {daysOnMarket} days on market
                </span>
              )}
            </div>
            <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm pointer-events-none">
              {currentIndex + 1} / {photos.length} · click to expand
            </div>
          </div>
          {photos.length > 1 && (
            <>
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  goTo(currentIndex - 1);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  goTo(currentIndex + 1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          {photos.length > 1 && photos.length <= 12 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setCurrentIndex(i);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentIndex ? "bg-white w-4" : "bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==== Body ==== */}
      <div className="p-4 md:p-5 space-y-5">
        {/* Address + Location */}
        <div>
          <h3 className={`text-lg font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
            {address}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {propertySubType && (
              <span className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                {propertySubType}
              </span>
            )}
            {subdivisionUrl && subdivision && (
              <>
                <span className={`text-xs ${isLight ? "text-gray-300" : "text-neutral-600"}`}>|</span>
                <Link
                  href={subdivisionUrl}
                  className={`text-xs font-medium inline-flex items-center gap-1 ${isLight ? "text-blue-600 hover:text-blue-700" : "text-emerald-400 hover:text-emerald-300"}`}
                >
                  <MapPin className="w-3 h-3" />
                  {subdivision}
                </Link>
              </>
            )}
            {cityUrl && city && (
              <>
                <span className={`text-xs ${isLight ? "text-gray-300" : "text-neutral-600"}`}>|</span>
                <Link
                  href={cityUrl}
                  className={`text-xs font-medium inline-flex items-center gap-1 ${isLight ? "text-blue-600 hover:text-blue-700" : "text-emerald-400 hover:text-emerald-300"}`}
                >
                  {city}
                </Link>
              </>
            )}
            {mlsId && (
              <>
                <span className={`text-xs ${isLight ? "text-gray-300" : "text-neutral-600"}`}>|</span>
                <span className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-500"}`}>MLS #{mlsId}</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {(beds ?? e.bedroomsTotal) != null && (
            <StatPill icon={<Bed className="w-4 h-4" />} label="Beds" value={String(beds ?? e.bedroomsTotal)} isLight={isLight} />
          )}
          {(baths ?? e.bathroomsTotalInteger) != null && (
            <StatPill icon={<Bath className="w-4 h-4" />} label="Baths" value={String(baths ?? e.bathroomsTotalInteger)} isLight={isLight} />
          )}
          {(sqft ?? e.livingArea) != null && (sqft ?? e.livingArea ?? 0) > 0 && (
            <StatPill icon={<Square className="w-4 h-4" />} label="Sq Ft" value={(sqft ?? e.livingArea ?? 0).toLocaleString()} isLight={isLight} />
          )}
          {(yearBuilt ?? e.yearBuilt) != null && (
            <StatPill icon={<Calendar className="w-4 h-4" />} label="Built" value={String(yearBuilt ?? e.yearBuilt)} isLight={isLight} />
          )}
          {lotSizeSqft != null && lotSizeSqft > 0 && (
            <StatPill icon={<Home className="w-4 h-4" />} label="Lot" value={`${(lotSizeSqft / 43560).toFixed(2)} ac`} isLight={isLight} />
          )}
          {(garageSpaces ?? e.garageSpaces) != null && (garageSpaces ?? e.garageSpaces ?? 0) > 0 && (
            <StatPill icon={<Car className="w-4 h-4" />} label="Garage" value={`${garageSpaces ?? e.garageSpaces}-car`} isLight={isLight} />
          )}
          {pool && <StatPill icon={<Droplets className="w-4 h-4" />} label="Pool" value="Yes" isLight={isLight} accent />}
          {spa && <StatPill icon={<Droplets className="w-4 h-4" />} label="Spa" value="Yes" isLight={isLight} accent />}
          {view && <StatPill icon={<Eye className="w-4 h-4" />} label="View" value="Yes" isLight={isLight} accent />}
          {hoaFee != null && hoaFee > 0 && (
            <StatPill icon={<span className="text-xs font-bold">$</span>} label="HOA" value={`$${hoaFee}/${hoaFrequency === "Monthly" ? "mo" : hoaFrequency || "mo"}`} isLight={isLight} />
          )}
          {(stories ?? e.stories) != null && (stories ?? e.stories ?? 0) > 0 && (
            <StatPill icon={<Home className="w-4 h-4" />} label="Stories" value={String(stories ?? e.stories)} isLight={isLight} />
          )}
        </div>

        {/* Description (publicRemarks) */}
        {hasRemarks && (
          <Section title="Description" isLight={isLight}>
            <p
              className={`text-sm leading-relaxed ${isLight ? "text-gray-700" : "text-neutral-300"} ${
                showRemarks ? "" : "line-clamp-4"
              }`}
            >
              {remarks}
            </p>
            {remarks.length > 280 && (
              <button
                onClick={() => setShowRemarks(!showRemarks)}
                className={`text-xs font-medium mt-1.5 ${
                  isLight ? "text-blue-600 hover:text-blue-700" : "text-emerald-400 hover:text-emerald-300"
                }`}
              >
                {showRemarks ? "Show less" : "Read more"}
              </button>
            )}
          </Section>
        )}

        {/* Features */}
        {(lotFeatures || interiorFeatures || exteriorFeatures || poolFeatures || viewText || archStyle) && (
          <Section title="Features" isLight={isLight}>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {archStyle && <FeatureRow label="Style" value={archStyle} icon={<Sparkles className="w-3.5 h-3.5" />} isLight={isLight} />}
              {viewText && <FeatureRow label="View" value={viewText} icon={<Eye className="w-3.5 h-3.5" />} isLight={isLight} />}
              {lotFeatures && <FeatureRow label="Lot" value={lotFeatures} icon={<TreePine className="w-3.5 h-3.5" />} isLight={isLight} />}
              {poolFeatures && <FeatureRow label="Pool" value={poolFeatures} icon={<Droplets className="w-3.5 h-3.5" />} isLight={isLight} />}
              {interiorFeatures && <FeatureRow label="Interior" value={interiorFeatures} icon={<Home className="w-3.5 h-3.5" />} isLight={isLight} />}
              {exteriorFeatures && <FeatureRow label="Exterior" value={exteriorFeatures} icon={<Home className="w-3.5 h-3.5" />} isLight={isLight} />}
              {appliances && <FeatureRow label="Appliances" value={appliances} icon={<Home className="w-3.5 h-3.5" />} isLight={isLight} />}
              {flooring && <FeatureRow label="Flooring" value={flooring} icon={<Home className="w-3.5 h-3.5" />} isLight={isLight} />}
              {cooling && <FeatureRow label="Cooling" value={cooling} icon={<Home className="w-3.5 h-3.5" />} isLight={isLight} />}
              {heating && <FeatureRow label="Heating" value={heating} icon={<Home className="w-3.5 h-3.5" />} isLight={isLight} />}
              {associationName && <FeatureRow label="HOA" value={associationName} icon={<span className="text-xs font-bold">$</span>} isLight={isLight} />}
            </dl>
          </Section>
        )}

        {/* Schools */}
        {(elementarySchool || middleSchool || highSchool) && (
          <Section title="Schools" isLight={isLight}>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              {elementarySchool && <SchoolPill label="Elementary" name={elementarySchool} isLight={isLight} />}
              {middleSchool && <SchoolPill label="Middle" name={middleSchool} isLight={isLight} />}
              {highSchool && <SchoolPill label="High" name={highSchool} isLight={isLight} />}
            </dl>
          </Section>
        )}

        {/* Listing courtesy of */}
        {(listAgentName || listOfficeName) && (
          <div className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-500"}`}>
            Listed by {listAgentName || "—"}
            {listOfficeName ? ` · ${listOfficeName}` : ""}
          </div>
        )}

        {/* Nearby listings — small inline map above the agent section.
            Pre-filter to listings that have lat/lng so we don't trigger
            ChatMapView's empty-validListings early-return path. That
            path violates rules-of-hooks (it has hooks AFTER the early
            return), so when nearby data loads we'd get a hook-order
            crash. Only mount the map when we have at least one
            mappable point. */}
        {(() => {
          const mappableNearby = nearby.filter(
            (l) => typeof l.latitude === "number" && typeof l.longitude === "number"
          );
          const subjectHasCoords =
            typeof e.latitude === "number" && typeof e.longitude === "number";
          const totalMappable = mappableNearby.length + (subjectHasCoords ? 1 : 0);
          if (totalMappable === 0) return null;

          // Map to the ListingsMap MapListing shape (different from
          // the chat-v3 PreviewListing shape) — uses listPrice, bedsTotal,
          // bathroomsTotalInteger, photoUrl rather than the slim
          // price/beds/baths/image keys ChatMapView wanted.
          const mapListings = [
            // Subject first so it lands at the map center
            ...(subjectHasCoords
              ? [
                  {
                    listingKey,
                    slugAddress,
                    address,
                    latitude: e.latitude!,
                    longitude: e.longitude!,
                    listPrice: price,
                    bedsTotal: beds ?? e.bedroomsTotal,
                    bathroomsTotalInteger: baths ?? e.bathroomsTotalInteger,
                    livingArea: sqft ?? e.livingArea,
                    photoUrl: photos[0] || primaryPhotoUrl,
                    subdivisionName: subdivision,
                  },
                ]
              : []),
            ...mappableNearby.map((l) => ({
              listingKey: l.listingKey,
              slugAddress: l.slugAddress,
              address: l.unparsedAddress,
              latitude: l.latitude!,
              longitude: l.longitude!,
              listPrice: l.listPrice,
              bedsTotal: l.bedroomsTotal,
              bathroomsTotalInteger: l.bathroomsTotalInteger,
              livingArea: l.livingArea,
              photoUrl: l.primaryPhotoUrl || undefined,
            })),
          ];

          // "Open in Map View" — uses the same useMapControl flow as
          // the top toggle and ChatMapView. Hard URL nav to /chap?view=map
          // doesn't actually populate the background map (its state
          // lives in MapStateContext, not the URL), so the previous
          // <Link> just changed the URL without revealing real map
          // state. showMapWithListings sets displayListings + flies to
          // the bounds in one shot.
          const handleOpenInMapView = () => {
            // Reuse the exact mapListings shape the inline map gets —
            // they already conform to MapListing (listingKey, lat, lng,
            // listPrice, etc.).
            const validForMap = mapListings.filter(
              (l) => typeof l.latitude === "number" && typeof l.longitude === "number"
            );
            if (validForMap.length === 0) return;
            const center =
              subjectHasCoords
                ? { centerLat: e.latitude!, centerLng: e.longitude!, zoom: 15 }
                : {
                    centerLat: validForMap[0].latitude!,
                    centerLng: validForMap[0].longitude!,
                    zoom: 15,
                  };
            showMapWithListings(validForMap as any, center);
          };

          return (
            <Section title="Nearby Listings" isLight={isLight}>
              {/* Wrapper is relative so the Open-in-Map-View overlay
                  Link can absolutely-position INSIDE the map chrome
                  (bottom-left, matching the production overlay
                  pattern) instead of rendering below the map via
                  ListingsMap's actionButton prop.
                  Zoom: tight default (15) + center on subject so
                  the user sees the immediate block, not the whole
                  city. fitBoundsOnLoad=false respects the explicit
                  zoom; otherwise ListingsMap fits all 26 markers
                  and zooms way out. */}
              {/* Center fallback: subject preferred, else first valid
                  nearby listing. ListingsMap defaults to Palm Springs
                  (33.83, -116.55) when center is undefined — that's
                  why the map was spawning there before subject coords
                  arrived. Always pass a real center.

                  ListingsMap reads `center` once into initialViewState,
                  so when subject coords arrive AFTER initial mount
                  (enriched fetch is async) the map wouldn't recenter.
                  Re-key on subjectHasCoords so the map remounts the
                  moment subject coords show up, centered on the subject. */}
              <div className="relative">
                {(() => {
                  const fallbackCoords = mappableNearby.find(
                    (l) => typeof l.latitude === "number" && typeof l.longitude === "number"
                  );
                  const centerCoords = subjectHasCoords
                    ? { latitude: e.latitude!, longitude: e.longitude! }
                    : fallbackCoords
                    ? { latitude: fallbackCoords.latitude!, longitude: fallbackCoords.longitude! }
                    : undefined;
                  return (
                    <ListingsMap
                      key={subjectHasCoords ? `subject:${listingKey}` : "nearby-fallback"}
                      listings={mapListings}
                      height="360px"
                      fitBoundsOnLoad={false}
                      zoom={13}
                      center={centerCoords}
                      selectedListingKey={listingKey}
                      cooperativeGestures={false}
                    />
                  );
                })()}
                <button
                  type="button"
                  onClick={handleOpenInMapView}
                  className={`absolute bottom-4 left-4 z-10 inline-flex items-center gap-2 font-semibold px-3 md:px-4 py-2 md:py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 text-sm md:text-base ${
                    isLight
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                  Open in Map View
                </button>
              </div>
            </Section>
          );
        })()}

        {/* Agent section */}
        <Section title="Your Agent" isLight={isLight}>
          <div
            className={`flex gap-3 p-3 rounded-lg ${
              isLight ? "bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100" : "bg-gradient-to-br from-emerald-900/10 to-teal-900/10 border border-emerald-900/30"
            }`}
          >
            {agent.headshot ? (
              <img
                src={agent.headshot}
                alt={agent.name}
                className="w-14 h-14 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className={`w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold ${
                  isLight ? "bg-blue-200 text-blue-700" : "bg-emerald-700/40 text-emerald-200"
                }`}
              >
                {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                  {agent.name}
                </span>
                <span className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                  {agent.brokerageName}
                  {agent.licenseNumber ? ` · DRE #${agent.licenseNumber}` : ""}
                </span>
              </div>
              {agent.bio && (
                <p
                  className={`text-xs leading-relaxed mt-1 line-clamp-3 ${
                    isLight ? "text-gray-600" : "text-neutral-400"
                  }`}
                >
                  {agent.bio}
                </p>
              )}
              <div className="flex gap-3 mt-2 text-xs">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone.replace(/[^0-9+]/g, "")}`}
                    className={`inline-flex items-center gap-1 font-medium ${
                      isLight ? "text-blue-600 hover:text-blue-700" : "text-emerald-400 hover:text-emerald-300"
                    }`}
                  >
                    <Phone className="w-3 h-3" />
                    {agent.phone}
                  </a>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className={`inline-flex items-center gap-1 font-medium ${
                      isLight ? "text-blue-600 hover:text-blue-700" : "text-emerald-400 hover:text-emerald-300"
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    {agent.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={`/mls-listings/${slugAddress || listingKey}`}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLight
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            View Full Listing
          </Link>
          {/* See Similar Listings — dispatches a chat message that
              produces a listing-search response (Panel/List/Map
              toggle). Uses subdivision when available since that's
              the tightest "similar" filter; falls back to city.
              Same data source as the inline nearby map above. */}
          <button
            onClick={() => {
              if (typeof window === "undefined") return;
              const scope = subdivision || city;
              if (!scope) return;
              window.dispatchEvent(
                new CustomEvent("chatv3:send-message", {
                  detail: { message: `show similar homes in ${scope}` },
                })
              );
            }}
            disabled={!subdivision && !city}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLight
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600 disabled:opacity-50"
            }`}
          >
            <Home className="w-4 h-4" />
            See Similar Listings
          </button>
          {/* Market Appreciation — subdivision-first, city fallback. Matches
              the same scope priority as See Similar Listings. Dispatches
              chatv3:send-message with "appreciation in …" → trend intent
              → AppreciationContainer. Mirrors the equivalent button on
              CMAReport's bottom action row. */}
          <button
            onClick={() => {
              if (typeof window === "undefined") return;
              const scope = subdivision || city;
              if (!scope) return;
              window.dispatchEvent(
                new CustomEvent("chatv3:send-message", {
                  detail: { message: `show appreciation in ${scope}` },
                })
              );
            }}
            disabled={!subdivision && !city}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLight
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600 disabled:opacity-50"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Market Appreciation
          </button>
          {/* Open in Map View removed — the inline nearby map already
              has its own overlay button that does the same nav. */}
          <button
            onClick={() => {
              if (typeof window === "undefined") return;
              window.dispatchEvent(
                new CustomEvent("chatv3:send-message", {
                  detail: { message: `generate a cma for ${address}` },
                })
              );
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLight
                ? "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                : "bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 border border-purple-700/50"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Generate CMA
          </button>
          {/* Share — uses native Web Share API on mobile; falls back to
              copying the URL to clipboard on desktop and shows a brief
              "Copied" toast via the chat event bus. */}
          <button
            onClick={async () => {
              if (typeof window === "undefined") return;
              const url = `${window.location.origin}/mls-listings/${slugAddress || listingKey}`;
              const shareData = {
                title: address || "Listing",
                text: `Check out this listing: ${address || ""}`,
                url,
              };
              try {
                if (typeof navigator !== "undefined" && navigator.share) {
                  await navigator.share(shareData);
                } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                  await navigator.clipboard.writeText(url);
                  window.dispatchEvent(
                    new CustomEvent("chatv3:toast", {
                      detail: { message: "Link copied to clipboard" },
                    })
                  );
                }
              } catch {
                // User cancelled share or clipboard denied — no-op
              }
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLight
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"
            }`}
            aria-label="Share listing"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* ==== Lightbox ==== */}
      {/* Rendered via portal into document.body — chat messages animate
          via Framer Motion which sets transform on parents, and any
          transformed ancestor breaks position:fixed (it positions
          relative to the ancestor instead of the viewport). The portal
          escapes that containing block so the overlay stays pinned to
          the actual viewport regardless of chat scroll position. */}
      {lightboxOpen && photos.length > 0 && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                setLightboxOpen(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute top-4 left-4 text-white/80 text-sm font-mono px-3 py-1 rounded-full bg-white/10">
              {currentIndex + 1} / {photos.length}
            </div>
            <img
              src={photos[currentIndex]}
              alt={`${address} — photo ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(ev) => ev.stopPropagation()}
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    goTo(currentIndex - 1);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    goTo(currentIndex + 1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

// ----- Sub-components -----

function Section({
  title,
  isLight,
  children,
}: {
  title: string;
  isLight: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4
        className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
          isLight ? "text-gray-500" : "text-neutral-400"
        }`}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function FeatureRow({
  label,
  value,
  icon,
  isLight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  isLight: boolean;
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className={`mt-0.5 flex-shrink-0 ${isLight ? "text-gray-400" : "text-neutral-500"}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <dt
          className={`text-[10px] uppercase tracking-wider ${
            isLight ? "text-gray-400" : "text-neutral-500"
          }`}
        >
          {label}
        </dt>
        <dd className={`text-xs ${isLight ? "text-gray-700" : "text-neutral-300"}`}>{value}</dd>
      </div>
    </div>
  );
}

function SchoolPill({ label, name, isLight }: { label: string; name: string; isLight: boolean }) {
  return (
    <div
      className={`p-2.5 rounded-lg flex items-start gap-2 ${
        isLight ? "bg-gray-50" : "bg-neutral-700/40"
      }`}
    >
      <SchoolIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isLight ? "text-gray-400" : "text-neutral-500"}`} />
      <div className="min-w-0">
        <div className={`text-[10px] uppercase tracking-wider ${isLight ? "text-gray-400" : "text-neutral-500"}`}>
          {label}
        </div>
        <div className={`text-xs font-medium truncate ${isLight ? "text-gray-700" : "text-neutral-300"}`}>
          {name}
        </div>
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  isLight,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLight: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        accent
          ? isLight
            ? "bg-blue-50 text-blue-700"
            : "bg-emerald-900/30 text-emerald-400"
          : isLight
            ? "bg-gray-50 text-gray-700"
            : "bg-neutral-700/50 text-neutral-200"
      }`}
    >
      <span
        className={`${accent ? "" : isLight ? "text-gray-400" : "text-neutral-500"}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-bold truncate">{value}</div>
        <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-neutral-500"}`}>{label}</div>
      </div>
    </div>
  );
}
