"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Bed, Bath, Maximize, ArrowRight } from "lucide-react";

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

export default function RelatedListings({
  city,
  subdivisionName,
  excludeListingKey,
  listPrice,
}: RelatedListingsProps) {
  const [listings, setListings] = useState<RelatedListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        // Build query params to find related listings
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
      } catch (err) {
        // Silently fail — related listings are supplementary
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
  }, [city, subdivisionName, excludeListingKey, listPrice]);

  if (loading) {
    return (
      <section className="py-8 px-4 md:px-8 bg-neutral-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-4">More Homes Nearby</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg overflow-hidden bg-neutral-900 animate-pulse">
                <div className="h-40 bg-neutral-800" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-800 rounded w-1/2" />
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

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(price);

  return (
    <section className="py-8 px-4 md:px-8 bg-neutral-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            {subdivisionName ? `More in ${subdivisionName}` : `More Homes in ${city}`}
          </h2>
          <Link
            href={subdivisionName
              ? `/neighborhoods/${citySlug}/${subdivisionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`
              : `/neighborhoods/${citySlug}`
            }
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <Link
              key={listing.listingKey}
              href={`/mls-listings/${listing.slugAddress}`}
              className="group rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-all duration-200 hover:shadow-lg"
            >
              {/* Photo */}
              <div className="relative h-40 bg-neutral-800">
                {listing.primaryPhotoUrl ? (
                  <img
                    src={listing.primaryPhotoUrl}
                    alt={listing.unparsedAddress}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    width={400}
                    height={160}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-neutral-600" />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-blue-600 text-white px-2.5 py-1 rounded-full text-xs font-bold">
                  {formatPrice(listing.listPrice)}
                </div>
              </div>

              {/* Details */}
              <div className="p-3">
                <h3 className="text-sm font-semibold text-white truncate mb-1">
                  {listing.unparsedAddress}
                </h3>
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {listing.city}, {listing.stateOrProvince}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
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
                      {listing.livingArea.toLocaleString()} sqft
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
