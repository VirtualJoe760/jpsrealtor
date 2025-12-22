// src/app/components/mls/SchoolInfo.tsx
"use client";

import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { IUnifiedListing } from '@/models/unified-listing';

interface Props {
  listing: IUnifiedListing;
  className?: string;
}

export default function SchoolInfo({ listing, className = '' }: Props) {
  const { textPrimary, textSecondary } = useThemeClasses();

  const hasSchools = listing.elementarySchool || listing.middleSchool || listing.highSchool || listing.schoolDistrict;

  if (!hasSchools) return null;

  return (
    <section className={`mt-10 ${className}`}>
      <h2 className={`text-xl font-semibold mb-4 ${textPrimary}`}>Nearby Schools</h2>
      <ul className={`list-disc list-inside text-sm ${textSecondary}`}>
        {listing.schoolDistrict && <li><strong>District:</strong> {listing.schoolDistrict}</li>}
        {listing.elementarySchool && <li><strong>Elementary:</strong> {listing.elementarySchool}</li>}
        {listing.middleSchool && <li><strong>Middle:</strong> {listing.middleSchool}</li>}
        {listing.highSchool && <li><strong>High:</strong> {listing.highSchool}</li>}
      </ul>
    </section>
  );
}
