"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bed, Bath, Maximize, ArrowRight } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

function fmtPrice(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(n % 100000 === 0 ? 1 : 2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export default function FeaturedListings({ cityId, cityName }: { cityId: string; cityName: string }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/cities/${cityId}/listings?limit=6&propertyType=sale`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.listings) setListings(data.listings.slice(0, 6));
      })
      .catch(() => {});
  }, [cityId]);

  if (listings.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl md:text-3xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
          Featured in {cityName}
        </h2>
        <Link
          href={`/neighborhoods/${cityId}`}
          className={`text-sm font-medium flex items-center gap-1 ${
            isLight ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-300"
          }`}
        >
          View All <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 md:grid md:grid-cols-3 md:overflow-visible">
        {listings.map((l: any) => (
          <Link
            key={l.listingKey}
            href={`/mls-listings/${l.slugAddress || l.listingKey}`}
            className={`flex-shrink-0 w-[75vw] md:w-auto rounded-2xl overflow-hidden transition-all group ${
              isLight
                ? "bg-white border border-gray-200 hover:shadow-lg"
                : "bg-white/5 border border-white/10 hover:border-white/20 hover:shadow-xl"
            }`}
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              {l.photoUrl ? (
                <Image
                  src={l.photoUrl}
                  alt={l.address || "Property"}
                  fill
                  sizes="(max-width: 768px) 75vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized={l.photoUrl?.includes("media.crmls.org")}
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${isLight ? "bg-gray-100" : "bg-neutral-800"}`}>
                  <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </div>
              )}
              <div className={`absolute bottom-2 left-2 px-2.5 py-1 rounded-lg text-sm font-bold backdrop-blur-md ${
                isLight ? "bg-white/90 text-gray-900" : "bg-black/70 text-white"
              }`}>
                {fmtPrice(l.listPrice || 0)}
              </div>
            </div>
            <div className="p-3">
              <p className={`text-sm font-semibold truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                {l.address || l.unparsedAddress || "Address unavailable"}
              </p>
              <div className={`flex items-center gap-3 mt-1.5 text-xs font-medium ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                {l.beds != null && <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{l.beds}</span>}
                {l.baths != null && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{l.baths}</span>}
                {l.livingArea != null && <span className="flex items-center gap-1"><Maximize className="w-3.5 h-3.5" />{l.livingArea.toLocaleString()}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
