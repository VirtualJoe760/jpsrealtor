"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

type Filters = {
  minPrice: string;
  maxPrice: string;
  beds: string;
  baths: string;
  propertyType: string;
  hoa: string;
  associationYN?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: Filters) => void;
  defaultFilters: Filters;
};

export default function FiltersPanel({
  isOpen,
  onClose,
  onApply,
  defaultFilters,
}: Props) {
  const [minPrice, setMinPrice] = useState(defaultFilters.minPrice);
  const [maxPrice, setMaxPrice] = useState(defaultFilters.maxPrice);
  const [beds, setBeds] = useState(defaultFilters.beds);
  const [baths, setBaths] = useState(defaultFilters.baths);
  const [propertyType, setPropertyType] = useState(defaultFilters.propertyType);
  const [hoa, setHoa] = useState(defaultFilters.hoa);
  const [hoaPresence, setHoaPresence] = useState<string>("any");

  useEffect(() => {
    setMinPrice(defaultFilters.minPrice);
    setMaxPrice(defaultFilters.maxPrice);
    setBeds(defaultFilters.beds);
    setBaths(defaultFilters.baths);
    setPropertyType(defaultFilters.propertyType);
    setHoa(defaultFilters.hoa);
    setHoaPresence(
      defaultFilters.associationYN === true ? "yes" : defaultFilters.associationYN === false ? "no" : "any"
    );
  }, [defaultFilters]);

  const handleApplyFilters = () => {
    const appliedFilters: Filters = {
      minPrice,
      maxPrice,
      beds,
      baths,
      propertyType,
      hoa,
      associationYN: hoaPresence === "yes" ? true : hoaPresence === "no" ? false : undefined,
    };

    console.log("📤 Filters sent to parent:", appliedFilters);
    onApply(appliedFilters);
  };

  return (
    <aside
      className={`fixed top-16 left-0 h-[calc(100vh-64px)] w-[90%] sm:w-[70%] md:w-[60%] lg:w-[25%] 2xl:w-[15%] bg-zinc-950 text-white transform transition-transform duration-300 z-50
        ${isOpen ? "translate-x-0" : "-translate-x-full"} border-r border-r-zinc-800 px-4 py-6 overflow-y-auto`}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold tracking-wide text-emerald-400">Filters</h2>
        <button onClick={onClose} aria-label="Close Filters Panel">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Price Range */}
      <div className="mb-4">
        <label className="text-sm mb-1 block">Price Range</label>
        <div className="flex gap-2">
          <div className="relative w-1/2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md placeholder-gray-400 pr-10"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
              000
            </span>
          </div>
          <div className="relative w-1/2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md placeholder-gray-400 pr-10"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
              000
            </span>
          </div>
        </div>
      </div>

      {/* Bed & Bath Count */}
      <div className="mb-4">
        <label className="text-sm mb-1 block">Beds</label>
        <input
          type="number"
          value={beds}
          onChange={(e) => setBeds(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md placeholder-gray-400"
          placeholder="Minimum Beds"
        />
      </div>
      <div className="mb-4">
        <label className="text-sm mb-1 block">Baths</label>
        <input
          type="number"
          value={baths}
          onChange={(e) => setBaths(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md placeholder-gray-400"
          placeholder="Minimum Baths"
        />
      </div>

      {/* Property Type */}
      <div className="mb-4">
        <label className="text-sm mb-1 block">Property Type</label>
        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white"
        >
          <option value="">Any</option>
          <option value="Single Family Home">Single Family Home</option>
          <option value="Condominium">Condominium</option>
          <option value="Townhouse">Townhouse</option>
          <option value="Manufactured Home">Manufactured Home</option>
          <option value="Mobile Home">Mobile Home</option>
        </select>
      </div>

      {/* HOA Presence */}
      <div className="mb-4">
        <label className="text-sm mb-1 block">Has HOA</label>
        <select
          value={hoaPresence}
          onChange={(e) => setHoaPresence(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white"
        >
          <option value="any">Any</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>

      {/* Max HOA Fee */}
      <div className="mb-4">
        <label className="text-sm mb-1 block">Max HOA Fee</label>
        <input
          type="number"
          value={hoa}
          onChange={(e) => setHoa(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md placeholder-gray-400"
          placeholder="Max HOA Fee"
        />
      </div>

      {/* Apply Button */}
      <button
        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-md transition duration-200"
        onClick={handleApplyFilters}
      >
        Apply Filters
      </button>
    </aside>
  );
}
