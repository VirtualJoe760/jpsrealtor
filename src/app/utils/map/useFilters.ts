import { useState, useMemo } from "react";
import type { Filters } from "@/types/types";

const defaultFilterState: Filters = {
  // Price
  minPrice: "",
  maxPrice: "",

  // Beds/Baths
  beds: "",
  baths: "",

  // Square Footage
  minSqft: "",
  maxSqft: "",

  // Lot Size
  minLotSize: "",
  maxLotSize: "",

  // Year Built
  minYear: "",
  maxYear: "",

  // Property Type
  propertyType: "",
  propertySubType: "",

  // Amenities
  poolYn: false,
  spaYn: false,
  viewYn: false,
  garageYn: false,

  // Garage count
  minGarages: "",

  // HOA
  hoa: "",
  associationYN: false,

  // Community
  gatedCommunity: false,
  seniorCommunity: false,

  // Land Type
  landType: "",

  // Location
  city: "",
  subdivision: "",
};

export default function useFilters() {
  const [filters, setFilters] = useState<Filters>(defaultFilterState);
  const [isFiltersOpen, setFiltersOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (next && isFiltersOpen) setFiltersOpen(false);
      return next;
    });
  };

  const toggleFilters = () => {
    setFiltersOpen((prev) => {
      const next = !prev;
      if (next && isSidebarOpen) setSidebarOpen(false);
      return next;
    });
  };

  const applyFilters = (newFilters: Filters) => {
    setFilters(newFilters);
    setFiltersOpen(false);
  };

  const mapPaddingClass = useMemo(() => {
    return isSidebarOpen ? "lg:right-[25%] lg:left-0" : "lg:left-0 lg:right-0";
  }, [isSidebarOpen]);

  return {
    filters,
    setFilters,
    applyFilters,
    isFiltersOpen,
    setFiltersOpen,
    isSidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    toggleFilters,
    mapPaddingClass,
  };
}
