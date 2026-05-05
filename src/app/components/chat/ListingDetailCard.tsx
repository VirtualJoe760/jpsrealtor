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
  School as SchoolIcon,
  Phone,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useAgentProfile } from "@/app/hooks/useAgentProfile";

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

  const [photos, setPhotos] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enriched, setEnriched] = useState<EnrichedListing | null>(null);
  const [showRemarks, setShowRemarks] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
        </div>
      </div>

      {/* ==== Lightbox ==== */}
      {lightboxOpen && photos.length > 0 && (
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
          <div
            className="absolute top-4 left-4 text-white/80 text-sm font-mono px-3 py-1 rounded-full bg-white/10"
          >
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
        </div>
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
