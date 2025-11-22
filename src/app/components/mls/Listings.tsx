// src/components/mls/Listings.tsx
"use client";

import { useThemeClasses } from "@/app/contexts/ThemeContext";

type Listing = {
  id: string;
  unparsed_address: string;
  standard_status: string;
  list_agent_name: string;
  list_office_name: string;
  list_price?: number;
  beds_total?: number;
  baths_total?: number;
  photo_url?: string;
};

export default function Listings({ listings }: { listings: Listing[] }) {
  const { textPrimary, textSecondary, textMuted, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => (
        <div
          key={listing.id}
          className={`border rounded-xl overflow-hidden shadow-md hover:shadow-lg transition ${isLight ? 'bg-white border-gray-200' : 'bg-gray-900/50 border-gray-800'}`}
        >
          {listing.photo_url ? (
            <img
              src={listing.photo_url}
              alt={`Photo of ${listing.unparsed_address}`}
              className="w-full h-56 object-cover"
            />
          ) : (
            <div className={`w-full h-56 ${isLight ? 'bg-gray-200' : 'bg-gray-800'} flex items-center justify-center ${textMuted}`}>
              No Image
            </div>
          )}

          <div className="p-4">
            <h2 className={`text-lg font-semibold ${textPrimary}`}>{listing.unparsed_address}</h2>
            <p className={`text-sm ${textSecondary} mb-2`}>{listing.standard_status}</p>

            {listing.list_price && (
              <p className="text-xl font-bold text-blue-600 mb-2">
                ${listing.list_price.toLocaleString()}
              </p>
            )}

            <p className={`text-sm ${textSecondary} mb-1`}>
              {listing.beds_total || 0} beds | {listing.baths_total || 0} baths
            </p>
            <p className={`text-sm ${textMuted}`}>
              Agent: {listing.list_agent_name}
              <br />
              Office: {listing.list_office_name}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
