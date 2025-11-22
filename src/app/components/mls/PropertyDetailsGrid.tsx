// src/app/components/mls/PropertyDetailsGrid.tsx
"use client";

import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { IListing } from '@/models/listings';

interface Props {
  listing: IListing;
  className?: string;
}

export default function PropertyDetailsGrid({ listing, className = '' }: Props) {
  const { textPrimary, textSecondary } = useThemeClasses();

  return (
    <section className={`mt-10 ${className}`}>
      <h2 className={`text-xl font-semibold mb-4 ${textPrimary}`}>Property Details</h2>
      <ul className={`grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm ${textSecondary}`}>
        {listing.apn && <li><strong>APN:</strong> {listing.apn}</li>}
        {listing.subdivisionName && <li><strong>Subdivision:</strong> {listing.subdivisionName}</li>}
        {listing.countyOrParish && <li><strong>County:</strong> {listing.countyOrParish}</li>}
        {listing.landType && <li><strong>Land Type:</strong> {listing.landType}</li>}
        {listing.gatedCommunity !== undefined && <li><strong>Gated Community:</strong> {listing.gatedCommunity ? 'Yes' : 'No'}</li>}
        {listing.view && <li><strong>View:</strong> {listing.view}</li>}
        {listing.stories && <li><strong>Stories:</strong> {listing.stories}</li>}
        {listing.flooring && <li><strong>Flooring:</strong> {listing.flooring}</li>}
        {listing.laundryFeatures && <li><strong>Laundry:</strong> {listing.laundryFeatures}</li>}
      </ul>
    </section>
  );
}
