"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bed, Bath, Maximize, ArrowRight } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface RelatedListing {
  listingKey: string;
  slugAddress: string;
  unparsedAddress: string;
  city: string;
  stateOrProvince: string;
  listPrice: number;
  bedroomsTotal?: number;
  bathroomsTotalInteger?: number;
  livingArea?: number;
  primaryPhotoUrl?: string;
}

interface RelatedListingsProps {
  city: string;
  subdivisionName?: string;
  excludeListingKey: string;
  listPrice?: number;
}

function formatPrice(price: number) {
  if (price >= 1000000) return `$${(price / 1000000).toFixed(price % 100000 === 0 ? 1 : 2)}M`;
  if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`;
  return `$${price.toLocaleString()}`;
}

export default function RelatedListings({
  city,
  subdivisionName,
  excludeListingKey,
  listPrice,
}: RelatedListingsProps) {
  const [listings, setListings] = useState<RelatedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const params = new URLSearchParams({
          city,
          limit: "6",
          exclude: excludeListingKey,
        });
        if (subdivisionName) params.set("subdivision", subdivisionName);
        if (listPrice) {
          params.set("minPrice", String(Math.round(listPrice * 0.7)));
          params.set("maxPrice", String(Math.round(listPrice * 1.3)));
        }

        const res = await fetch(`/api/listings/related?${params}`);
        if (res.ok) {
          const data = await res.json();
          setListings(data.listings || []);
        }
      } catch {
        // Silently fail — related listings are supplementary
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
  }, [city, subdivisionName, excludeListingKey, listPrice]);

  if (loading) {
    return (
      <section className="py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-6 w-48 rounded bg-neutral-800/50 animate-pulse mb-6" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex-shrink-0 w-64 rounded-2xl overflow-hidden animate-pulse ${isLight ? "bg-white" : "bg-neutral-900"}`}>
                <div className={`h-44 ${isLight ? "bg-gray-200" : "bg-neutral-800"}`} />
                <div className="p-3 space-y-2">
                  <div className={`h-4 rounded w-3/4 ${isLight ? "bg-gray-200" : "bg-neutral-800"}`} />
                  <div className={`h-3 rounded w-1/2 ${isLight ? "bg-gray-200" : "bg-neutral-800"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (listings.length === 0) return null;

  const citySlug = city.toLowerCase().replace(/\s+/g, "-");

  return (
    <section className="py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-2xl md:text-3xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
            Similar Properties
          </h2>
          <Link
            href={subdivisionName
              ? `/neighborhoods/${citySlug}/${subdivisionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`
              : `/neighborhoods/${citySlug}`
            }
            className={`text-sm font-medium flex items-center gap-1 ${
              isLight ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-300"
            }`}
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 md:grid md:grid-cols-3 md:overflow-visible">
          {listings.map((listing) => (
            <Link
              key={listing.listingKey}
              href={`/mls-listings/${listing.slugAddress}`}
              className={`flex-shrink-0 w-[72vw] md:w-auto rounded-2xl overflow-hidden transition-all duration-200 group ${
                isLight
                  ? "bg-white border border-gray-200 hover:shadow-lg"
                  : "bg-neutral-900/80 border border-neutral-800 hover:border-neutral-600 hover:shadow-xl hover:shadow-black/30"
              }`}
            >
              {/* Photo */}
              <div className="relative aspect-[4/3] overflow-hidden">
                {listing.primaryPhotoUrl ? (
                  <Image
                    src={listing.primaryPhotoUrl}
                    alt={listing.unparsedAddress}
                    fill
                    sizes="(max-width: 768px) 72vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized={listing.primaryPhotoUrl.includes('media.crmls.org')}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    isLight ? "bg-gray-100" : "bg-neutral-800"
                  }`}>
                    <svg className={`w-10 h-10 ${isLight ? "text-gray-300" : "text-neutral-700"}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>
                )}
                {/* Price badge */}
                <div className={`absolute bottom-2 left-2 px-2.5 py-1 rounded-lg text-sm font-bold backdrop-blur-md ${
                  isLight
                    ? "bg-white/90 text-gray-900 shadow-sm"
                    : "bg-black/70 text-white"
                }`}>
                  {formatPrice(listing.listPrice)}
                </div>
              </div>

              {/* Details */}
              <div className="p-3">
                <h3 className={`text-sm font-semibold truncate mb-1.5 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}>
                  {listing.unparsedAddress}
                </h3>
                <div className={`flex items-center gap-3 text-xs font-medium ${
                  isLight ? "text-gray-500" : "text-neutral-400"
                }`}>
                  {listing.bedroomsTotal != null && (
                    <span className="flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5" />
                      {listing.bedroomsTotal}
                    </span>
                  )}
                  {listing.bathroomsTotalInteger != null && (
                    <span className="flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5" />
                      {listing.bathroomsTotalInteger}
                    </span>
                  )}
                  {listing.livingArea != null && (
                    <span className="flex items-center gap-1">
                      <Maximize className="w-3.5 h-3.5" />
                      {listing.livingArea.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
