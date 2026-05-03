"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Bed, Bath, Square, Calendar, Car, Droplets, Eye, Home, MapPin, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/app/contexts/ThemeContext";

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
  const [photos, setPhotos] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch(`/api/listings/${listingKey}/photos`);
        if (res.ok) {
          const data = await res.json();
          const urls = (data.photos || [])
            .slice(0, 25)
            .map((p: any) =>
              p.uri1600 || p.uri1280 || p.uri1024 || p.uri800 || p.uri640 || p.uriLarge
            )
            .filter(Boolean);

          if (urls.length > 0) {
            setPhotos(urls);
          } else if (primaryPhotoUrl && primaryPhotoUrl !== "/images/no-photo.png") {
            setPhotos([primaryPhotoUrl]);
          }
        }
      } catch {
        if (primaryPhotoUrl && primaryPhotoUrl !== "/images/no-photo.png") {
          setPhotos([primaryPhotoUrl]);
        }
      } finally {
        setLoading(false);
      }
    };

    if (listingKey) fetchPhotos();
  }, [listingKey, primaryPhotoUrl]);

  const goTo = (index: number) => {
    const next = (index + photos.length) % photos.length;
    setCurrentIndex(next);
  };

  // Build subdivision URL
  const subdivisionUrl = subdivision && city
    ? (() => {
        const nonApplicable = ['not applicable', 'n/a', 'none', 'other', 'na', 'no hoa'];
        if (nonApplicable.some(v => subdivision.toLowerCase().includes(v))) return null;
        const citySlug = city.toLowerCase().replace(/\s+/g, '-');
        const subdivSlug = subdivision.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return `/neighborhoods/${citySlug}/${subdivSlug}`;
      })()
    : null;

  const cityUrl = city
    ? `/neighborhoods/${city.toLowerCase().replace(/\s+/g, '-')}`
    : null;

  const formatPrice = (p: number) => {
    if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(p % 1_000_000 === 0 ? 0 : 2)}M`;
    return `$${p.toLocaleString()}`;
  };

  const statusColor = status === 'Active'
    ? isLight ? 'bg-green-100 text-green-700' : 'bg-green-900/40 text-green-400'
    : status === 'Pending'
    ? isLight ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/40 text-yellow-400'
    : isLight ? 'bg-gray-100 text-gray-600' : 'bg-neutral-700 text-neutral-300';

  if (loading) {
    return (
      <div className={`rounded-xl overflow-hidden ${isLight ? "bg-gray-100" : "bg-neutral-800"}`}>
        <div className="h-72 md:h-96 flex items-center justify-center">
          <div className={`animate-spin h-8 w-8 border-b-2 rounded-full ${isLight ? "border-blue-500" : "border-emerald-400"}`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden shadow-lg ${isLight ? "bg-white border border-gray-200" : "bg-neutral-800/90 border border-neutral-700"}`}>

      {/* Photo Carousel — taller */}
      {photos.length > 0 && (
        <div className="relative group">
          <div className="relative h-72 md:h-[420px] overflow-hidden">
            <img
              src={photos[currentIndex]}
              alt={`${address} — photo ${currentIndex + 1}`}
              className="w-full h-full object-cover transition-all duration-300"
              loading="lazy"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

            {/* Price + Status overlay */}
            <div className="absolute bottom-4 left-4 flex items-end gap-3">
              {price && (
                <span className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                  {formatPrice(price)}
                </span>
              )}
              {status && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
                  {status}
                </span>
              )}
              {daysOnMarket != null && daysOnMarket >= 0 && (
                <span className="text-xs text-white/80 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                  {daysOnMarket} days on market
                </span>
              )}
            </div>

            {/* Photo counter */}
            <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
              {currentIndex + 1} / {photos.length}
            </div>
          </div>

          {/* Nav arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={() => goTo(currentIndex - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => goTo(currentIndex + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Dots */}
          {photos.length > 1 && photos.length <= 12 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentIndex ? "bg-white w-4" : "bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="p-4 md:p-5 space-y-4">

        {/* Address + Location Links */}
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
                <Link href={subdivisionUrl} className={`text-xs font-medium inline-flex items-center gap-1 ${isLight ? "text-blue-600 hover:text-blue-700" : "text-emerald-400 hover:text-emerald-300"}`}>
                  <MapPin className="w-3 h-3" />
                  {subdivision}
                </Link>
              </>
            )}
            {cityUrl && city && (
              <>
                <span className={`text-xs ${isLight ? "text-gray-300" : "text-neutral-600"}`}>|</span>
                <Link href={cityUrl} className={`text-xs font-medium inline-flex items-center gap-1 ${isLight ? "text-blue-600 hover:text-blue-700" : "text-emerald-400 hover:text-emerald-300"}`}>
                  {city}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className={`grid grid-cols-3 md:grid-cols-4 gap-2`}>
          {beds != null && (
            <StatPill icon={<Bed className="w-4 h-4" />} label="Beds" value={String(beds)} isLight={isLight} />
          )}
          {baths != null && (
            <StatPill icon={<Bath className="w-4 h-4" />} label="Baths" value={String(baths)} isLight={isLight} />
          )}
          {sqft != null && sqft > 0 && (
            <StatPill icon={<Square className="w-4 h-4" />} label="Sq Ft" value={sqft.toLocaleString()} isLight={isLight} />
          )}
          {yearBuilt != null && (
            <StatPill icon={<Calendar className="w-4 h-4" />} label="Built" value={String(yearBuilt)} isLight={isLight} />
          )}
          {lotSizeSqft != null && lotSizeSqft > 0 && (
            <StatPill icon={<Home className="w-4 h-4" />} label="Lot" value={`${(lotSizeSqft / 43560).toFixed(2)} ac`} isLight={isLight} />
          )}
          {garageSpaces != null && garageSpaces > 0 && (
            <StatPill icon={<Car className="w-4 h-4" />} label="Garage" value={`${garageSpaces}-car`} isLight={isLight} />
          )}
          {pool && (
            <StatPill icon={<Droplets className="w-4 h-4" />} label="Pool" value="Yes" isLight={isLight} accent />
          )}
          {spa && (
            <StatPill icon={<Droplets className="w-4 h-4" />} label="Spa" value="Yes" isLight={isLight} accent />
          )}
          {view && (
            <StatPill icon={<Eye className="w-4 h-4" />} label="View" value="Yes" isLight={isLight} accent />
          )}
          {hoaFee != null && hoaFee > 0 && (
            <StatPill icon={<span className="text-xs font-bold">$</span>} label="HOA" value={`$${hoaFee}/${hoaFrequency === 'Monthly' ? 'mo' : hoaFrequency || 'mo'}`} isLight={isLight} />
          )}
          {stories != null && stories > 0 && (
            <StatPill icon={<Home className="w-4 h-4" />} label="Stories" value={String(stories)} isLight={isLight} />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
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
          <Link
            href={`/chap?view=map&lat=${0}&lng=${0}&zoom=14&listing=${slugAddress || listingKey}`}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLight
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"
            }`}
          >
            <MapPin className="w-4 h-4" />
            View on Map
          </Link>
          <button
            onClick={() => {
              const chatInput = document.querySelector('[data-chat-input]') as HTMLInputElement;
              if (chatInput) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                nativeInputValueSetter?.call(chatInput, `Generate a CMA for ${address}`);
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                chatInput.focus();
              }
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
    </div>
  );
}

function StatPill({ icon, label, value, isLight, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLight: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
      accent
        ? isLight ? "bg-blue-50 text-blue-700" : "bg-emerald-900/30 text-emerald-400"
        : isLight ? "bg-gray-50 text-gray-700" : "bg-neutral-700/50 text-neutral-200"
    }`}>
      <span className={`${accent ? '' : isLight ? 'text-gray-400' : 'text-neutral-500'}`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-xs font-bold truncate">{value}</div>
        <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-neutral-500"}`}>{label}</div>
      </div>
    </div>
  );
}
