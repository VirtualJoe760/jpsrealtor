"use client";

import { X } from "lucide-react";
import type { Filters } from "@/types/types";

type Props = {
  filters: Filters;
  onRemoveFilter: (filterKey: keyof Filters) => void;
  onClearAll: () => void;
  isFiltersOpen: boolean;
};

export default function ActiveFilters({ filters, onRemoveFilter, onClearAll, isFiltersOpen }: Props) {
  const activeFilters: Array<{ key: keyof Filters; label: string; value: string }> = [];

  // Price filters
  if (filters.minPrice) {
    activeFilters.push({
      key: "minPrice",
      label: "Min Price",
      value: `$${Number(filters.minPrice).toLocaleString()}`,
    });
  }
  if (filters.maxPrice) {
    activeFilters.push({
      key: "maxPrice",
      label: "Max Price",
      value: `$${Number(filters.maxPrice).toLocaleString()}`,
    });
  }

  // Beds/Baths
  if (filters.beds) {
    activeFilters.push({ key: "beds", label: "Min Beds", value: filters.beds });
  }
  if (filters.baths) {
    activeFilters.push({ key: "baths", label: "Min Baths", value: filters.baths });
  }

  // Square Footage
  if (filters.minSqft) {
    activeFilters.push({
      key: "minSqft",
      label: "Min Sqft",
      value: `${Number(filters.minSqft).toLocaleString()} sqft`,
    });
  }
  if (filters.maxSqft) {
    activeFilters.push({
      key: "maxSqft",
      label: "Max Sqft",
      value: `${Number(filters.maxSqft).toLocaleString()} sqft`,
    });
  }

  // Lot Size
  if (filters.minLotSize) {
    activeFilters.push({
      key: "minLotSize",
      label: "Min Lot",
      value: `${Number(filters.minLotSize).toLocaleString()} sqft`,
    });
  }
  if (filters.maxLotSize) {
    activeFilters.push({
      key: "maxLotSize",
      label: "Max Lot",
      value: `${Number(filters.maxLotSize).toLocaleString()} sqft`,
    });
  }

  // Year Built
  if (filters.minYear) {
    activeFilters.push({ key: "minYear", label: "Built After", value: filters.minYear });
  }
  if (filters.maxYear) {
    activeFilters.push({ key: "maxYear", label: "Built Before", value: filters.maxYear });
  }

  // Property Type
  if (filters.propertySubType) {
    activeFilters.push({ key: "propertySubType", label: "Type", value: filters.propertySubType });
  }

  // Amenities
  if (filters.poolYn === true) {
    activeFilters.push({ key: "poolYn", label: "Pool", value: "Yes" });
  } else if (filters.poolYn === false) {
    activeFilters.push({ key: "poolYn", label: "Pool", value: "No" });
  }

  if (filters.spaYn === true) {
    activeFilters.push({ key: "spaYn", label: "Spa", value: "Yes" });
  } else if (filters.spaYn === false) {
    activeFilters.push({ key: "spaYn", label: "Spa", value: "No" });
  }

  if (filters.viewYn === true) {
    activeFilters.push({ key: "viewYn", label: "View", value: "Yes" });
  }

  if (filters.minGarages) {
    activeFilters.push({ key: "minGarages", label: "Garage", value: `${filters.minGarages}+ spaces` });
  }

  // HOA
  if (filters.associationYN === true) {
    activeFilters.push({ key: "associationYN", label: "HOA", value: "Yes" });
  } else if (filters.associationYN === false) {
    activeFilters.push({ key: "associationYN", label: "HOA", value: "No" });
  }

  if (filters.hoa) {
    activeFilters.push({ key: "hoa", label: "Max HOA", value: `$${filters.hoa}/mo` });
  }

  // Community
  if (filters.gatedCommunity === true) {
    activeFilters.push({ key: "gatedCommunity", label: "Gated", value: "Yes" });
  }

  if (filters.seniorCommunity === true) {
    activeFilters.push({ key: "seniorCommunity", label: "55+", value: "Yes" });
  }

  // Land Type
  if (filters.landType) {
    activeFilters.push({ key: "landType", label: "Land", value: filters.landType });
  }

  // Location
  if (filters.city) {
    activeFilters.push({ key: "city", label: "City", value: filters.city });
  }

  if (filters.subdivision) {
    activeFilters.push({ key: "subdivision", label: "Subdivision", value: filters.subdivision });
  }

  // If no active filters, don't render anything
  if (activeFilters.length === 0) return null;

  return (
    <div
      className={`fixed top-[140px] md:top-[128px] left-0 z-20 px-3 md:px-4 transition-all duration-300 ${
        isFiltersOpen ? "md:left-[25%] lg:left-[30%] 2xl:left-[20%]" : "left-0"
      }`}
    >
      <div className="flex flex-wrap gap-1.5 md:gap-2 items-center">
        {activeFilters.map((filter) => (
          <div
            key={filter.key}
            className="inline-flex items-center gap-1.5 bg-red-800/90 hover:bg-red-700/90 border-2 border-red-600 text-white px-2.5 md:px-3 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-all shadow-lg group"
          >
            <span className="text-red-100 text-[10px] md:text-xs font-semibold uppercase tracking-wide">
              {filter.label}:
            </span>
            <span className="font-bold">{filter.value}</span>
            <button
              onClick={() => onRemoveFilter(filter.key)}
              className="ml-0.5 p-0.5 hover:bg-red-900/60 rounded-full transition-colors"
              aria-label={`Remove ${filter.label} filter`}
            >
              <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        ))}

        {/* Clear All Button as a chip */}
        {activeFilters.length > 1 && (
          <button
            onClick={onClearAll}
            className="inline-flex items-center gap-1 bg-red-950/90 hover:bg-red-900/90 border-2 border-red-500 text-red-100 hover:text-white px-2.5 md:px-3 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-bold uppercase tracking-wide transition-all shadow-lg"
          >
            Clear All
            <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
