// src/app/components/mls/ListingAddressBlock.tsx
"use client";

import { useThemeClasses } from "@/app/contexts/ThemeContext";

type ListingAddressBlockProps = {
    address: string
    city: string
    state: string
    zip: string
    subdivision?: string
    listingId: string
  }

  export default function ListingAddressBlock({
    address,
    city,
    state,
    zip,
    subdivision,
    listingId,
  }: ListingAddressBlockProps) {
    const { textPrimary, textSecondary, textMuted } = useThemeClasses();

    return (
      <div className={`mb-6 text-sm ${textSecondary}`}>
        <p className={`font-semibold text-lg ${textPrimary}`}>{address}</p>
        <p>
          {city}, {state} {zip}
        </p>
        {subdivision && <p>Subdivision: {subdivision}</p>}
        <p className={`text-xs mt-1 ${textMuted}`}>MLS#: {listingId}</p>
      </div>
    )
  }
