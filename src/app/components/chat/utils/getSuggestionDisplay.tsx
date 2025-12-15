// src/app/components/chat/utils/getSuggestionDisplay.tsx
// Display formatting for autocomplete suggestions

import React from "react";
import { Globe2, Map, Building2, Home, MapPin } from "lucide-react";
import type { AutocompleteSuggestion } from "../hooks/useAutocomplete";

interface SuggestionDisplay {
  icon: React.ReactElement | null;
  subtitle: string;
  isAskAI?: boolean;
}

export function getSuggestionDisplay(
  suggestion: AutocompleteSuggestion,
  isLight: boolean
): SuggestionDisplay {
  const iconClass = `w-5 h-5 flex-shrink-0 ${isLight ? "text-blue-600" : "text-emerald-400"}`;

  switch (suggestion.type) {
    case "ai":
      return {
        icon: (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        ),
        subtitle: "",
        isAskAI: true,
      };
    case "region":
      return {
        icon: <Globe2 className={iconClass} />,
        subtitle: "Region",
      };
    case "county":
      return {
        icon: <Map className={iconClass} />,
        subtitle: "County",
      };
    case "city":
      return {
        icon: <Building2 className={iconClass} />,
        subtitle: suggestion.totalListings
          ? `City • ${suggestion.totalListings} listings`
          : "City",
      };
    case "subdivision":
      return {
        icon: <Home className={iconClass} />,
        subtitle: suggestion.city ? `Subdivision in ${suggestion.city}` : "Subdivision",
      };
    case "geocode":
      return {
        icon: <MapPin className={iconClass} />,
        subtitle: "Location",
      };
    case "listing":
      return {
        icon: null, // Listings show photo
        subtitle: [
          suggestion.listPrice && `$${suggestion.listPrice.toLocaleString()}`,
          suggestion.bedrooms && `${suggestion.bedrooms} bd`,
          suggestion.bathrooms && `${suggestion.bathrooms} ba`,
          suggestion.sqft && `${suggestion.sqft.toLocaleString()} sqft`,
        ]
          .filter(Boolean)
          .join(" • "),
      };
    default:
      return {
        icon: <MapPin className={iconClass} />,
        subtitle: "Location",
      };
  }
}
