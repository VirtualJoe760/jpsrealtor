"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface ListingBreadcrumbsProps {
  city?: string;
  subdivisionName?: string;
  address: string;
}

export default function ListingBreadcrumbs({ city, subdivisionName, address }: ListingBreadcrumbsProps) {
  const citySlug = city
    ? city.toLowerCase().replace(/\s+/g, "-")
    : null;

  const subdivisionSlug = subdivisionName
    ? subdivisionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    : null;

  // Determine back destination: subdivision > city > listings
  let backHref = "/mls-listings";
  let backLabel = "Listings";

  if (subdivisionSlug && citySlug) {
    backHref = `/neighborhoods/${citySlug}/${subdivisionSlug}`;
    backLabel = subdivisionName!;
  } else if (citySlug) {
    backHref = `/neighborhoods/${citySlug}`;
    backLabel = city!;
  }

  return (
    <nav className="py-3 px-4 md:px-0">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to {backLabel}
      </Link>
    </nav>
  );
}
