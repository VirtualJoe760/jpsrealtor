"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface ListingBreadcrumbsProps {
  city?: string;
  subdivisionName?: string;
  address: string;
}

export default function ListingBreadcrumbs({ city, subdivisionName, address }: ListingBreadcrumbsProps) {
  // Build city slug from city name
  const citySlug = city
    ? city.toLowerCase().replace(/\s+/g, "-")
    : null;

  // Build subdivision slug from name
  const subdivisionSlug = subdivisionName
    ? subdivisionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    : null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap py-3 px-4 md:px-0">
      <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
        <Home className="w-3.5 h-3.5" />
        <span className="sr-only">Home</span>
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />

      <Link href="/mls-listings" className="hover:text-white transition-colors">
        Listings
      </Link>

      {citySlug && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
          <Link
            href={`/neighborhoods/${citySlug}`}
            className="hover:text-white transition-colors"
          >
            {city}
          </Link>
        </>
      )}

      {subdivisionSlug && citySlug && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
          <Link
            href={`/neighborhoods/${citySlug}/${subdivisionSlug}`}
            className="hover:text-white transition-colors"
          >
            {subdivisionName}
          </Link>
        </>
      )}

      <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
      <span className="text-gray-300 truncate max-w-[200px] md:max-w-none">
        {address}
      </span>
    </nav>
  );
}
