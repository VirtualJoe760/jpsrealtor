"use client";

import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { Filters } from "@/types/types";
import { useTheme } from "@/app/contexts/ThemeContext";

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
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Theme-aware classes
  const panelBg = isLight ? 'bg-white' : 'bg-zinc-950';
  const panelBorder = isLight ? 'border-gray-300' : 'border-zinc-800';
  const sectionBorder = isLight ? 'border-gray-200' : 'border-zinc-800';
  const textPrimary = isLight ? 'text-gray-900' : 'text-white';
  const textSecondary = isLight ? 'text-gray-600' : 'text-gray-400';
  const textAccent = isLight ? 'text-blue-600' : 'text-emerald-400';
  const inputBg = isLight ? 'bg-gray-50' : 'bg-zinc-900';
  const inputBorder = isLight ? 'border-gray-300' : 'border-zinc-700';
  const inputFocus = isLight ? 'focus:border-blue-500' : '${inputFocus}';
  const buttonInactive = isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-zinc-800 text-white hover:bg-zinc-700';
  const buttonActive = isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-black';
  const hoverAccent = isLight ? 'hover:text-blue-600' : 'hover:text-emerald-400';

  // State for all filters
  const [listingType, setListingType] = useState(defaultFilters.listingType);
  const [minPrice, setMinPrice] = useState(defaultFilters.minPrice);
  const [maxPrice, setMaxPrice] = useState(defaultFilters.maxPrice);
  const [beds, setBeds] = useState(defaultFilters.beds);
  const [baths, setBaths] = useState(defaultFilters.baths);
  const [minSqft, setMinSqft] = useState(defaultFilters.minSqft);
  const [maxSqft, setMaxSqft] = useState(defaultFilters.maxSqft);
  const [minLotSize, setMinLotSize] = useState(defaultFilters.minLotSize);
  const [maxLotSize, setMaxLotSize] = useState(defaultFilters.maxLotSize);
  const [minYear, setMinYear] = useState(defaultFilters.minYear);
  const [maxYear, setMaxYear] = useState(defaultFilters.maxYear);
  const [propertySubType, setPropertySubType] = useState(defaultFilters.propertySubType);
  const [landType, setLandType] = useState(defaultFilters.landType);
  const [city, setCity] = useState(defaultFilters.city);
  const [subdivision, setSubdivision] = useState(defaultFilters.subdivision);
  const [minGarages, setMinGarages] = useState(defaultFilters.minGarages);
  const [hoa, setHoa] = useState(defaultFilters.hoa);

  // Boolean filters
  const [poolYn, setPoolYn] = useState<boolean | undefined>(defaultFilters.poolYn);
  const [spaYn, setSpaYn] = useState<boolean | undefined>(defaultFilters.spaYn);
  const [viewYn, setViewYn] = useState<boolean | undefined>(defaultFilters.viewYn);
  const [garageYn, setGarageYn] = useState<boolean | undefined>(defaultFilters.garageYn);
  const [hoaPresence, setHoaPresence] = useState<string>(
    defaultFilters.associationYN === true ? "yes" : defaultFilters.associationYN === false ? "no" : "any"
  );
  const [gatedCommunity, setGatedCommunity] = useState<boolean | undefined>(defaultFilters.gatedCommunity);
  const [seniorCommunity, setSeniorCommunity] = useState<boolean | undefined>(defaultFilters.seniorCommunity);

  // Collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    property: false,
    amenities: false,
    community: false,
    location: false,
  });

  useEffect(() => {
    setListingType(defaultFilters.listingType);
    setMinPrice(defaultFilters.minPrice);
    setMaxPrice(defaultFilters.maxPrice);
    setBeds(defaultFilters.beds);
    setBaths(defaultFilters.baths);
    setMinSqft(defaultFilters.minSqft);
    setMaxSqft(defaultFilters.maxSqft);
    setMinLotSize(defaultFilters.minLotSize);
    setMaxLotSize(defaultFilters.maxLotSize);
    setMinYear(defaultFilters.minYear);
    setMaxYear(defaultFilters.maxYear);
    setPropertySubType(defaultFilters.propertySubType);
    setLandType(defaultFilters.landType);
    setCity(defaultFilters.city);
    setSubdivision(defaultFilters.subdivision);
    setMinGarages(defaultFilters.minGarages);
    setHoa(defaultFilters.hoa);
    setPoolYn(defaultFilters.poolYn);
    setSpaYn(defaultFilters.spaYn);
    setViewYn(defaultFilters.viewYn);
    setGarageYn(defaultFilters.garageYn);
    setHoaPresence(defaultFilters.associationYN === true ? "yes" : defaultFilters.associationYN === false ? "no" : "any");
    setGatedCommunity(defaultFilters.gatedCommunity);
    setSeniorCommunity(defaultFilters.seniorCommunity);
  }, [defaultFilters]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleApplyFilters = () => {
    const appliedFilters: Filters = {
      listingType,
      minPrice,
      maxPrice,
      beds,
      baths,
      minSqft,
      maxSqft,
      minLotSize,
      maxLotSize,
      minYear,
      maxYear,
      propertyType: "", // Legacy - keep for compatibility
      propertySubType,
      landType,
      city,
      subdivision,
      minGarages,
      hoa,
      poolYn: poolYn === true ? true : poolYn === false ? false : undefined,
      spaYn: spaYn === true ? true : spaYn === false ? false : undefined,
      viewYn: viewYn === true ? true : undefined,
      garageYn: garageYn === true ? true : undefined,
      associationYN: hoaPresence === "yes" ? true : hoaPresence === "no" ? false : undefined,
      gatedCommunity: gatedCommunity === true ? true : undefined,
      seniorCommunity: seniorCommunity === true ? true : undefined,
    };

    onApply(appliedFilters);
  };

  const handleClearFilters = () => {
    setListingType("sale"); // Reset to default
    setMinPrice("");
    setMaxPrice("");
    setBeds("");
    setBaths("");
    setMinSqft("");
    setMaxSqft("");
    setMinLotSize("");
    setMaxLotSize("");
    setMinYear("");
    setMaxYear("");
    setPropertySubType("");
    setLandType("");
    setCity("");
    setSubdivision("");
    setMinGarages("");
    setHoa("");
    setPoolYn(undefined);
    setSpaYn(undefined);
    setViewYn(undefined);
    setGarageYn(undefined);
    setHoaPresence("any");
    setGatedCommunity(undefined);
    setSeniorCommunity(undefined);
  };

  const SectionHeader = ({ title, section }: { title: string; section: string }) => (
    <button
      onClick={() => toggleSection(section)}
      className={`w-full flex justify-between items-center py-2 ${textAccent} font-semibold text-sm ${hoverAccent} transition`}
    >
      <span>{title}</span>
      {openSections[section] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  );

  return (
    <aside
      className={`fixed top-16 left-0 h-[calc(100vh-64px)] w-[90%] sm:w-[70%] md:w-[60%] lg:w-[30%] 2xl:w-[20%] ${panelBg} ${textPrimary} transform transition-transform duration-300 z-50
        ${isOpen ? "translate-x-0" : "-translate-x-full"} border-r ${panelBorder} px-4 py-4 overflow-y-auto shadow-2xl`}
    >
      {/* Header */}
      <div className={`flex justify-between items-center mb-4 sticky top-0 ${panelBg} pb-2 border-b ${sectionBorder}`}>
        <h2 className={`text-lg font-bold tracking-wide ${textAccent}`}>Advanced Filters</h2>
        <button onClick={onClose} aria-label="Close Filters Panel" className={`${hoverAccent} transition`}>
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* ========== BASIC FILTERS ========== */}
      <div className="mb-4">
        <SectionHeader title="Basic Filters" section="basic" />
        {openSections.basic && (
          <div className="space-y-3 pl-2">
            {/* Listing Type Toggle */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Listing Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setListingType("sale")}
                  className={`px-2 py-2 text-sm rounded-md font-medium transition ${
                    listingType === "sale"
                      ? buttonActive
                      : buttonInactive
                  }`}
                >
                  For Sale
                </button>
                <button
                  onClick={() => setListingType("rental")}
                  className={`px-2 py-2 text-sm rounded-md font-medium transition ${
                    listingType === "rental"
                      ? "bg-purple-500 text-white"
                      : buttonInactive
                  }`}
                >
                  For Rent
                </button>
                <button
                  onClick={() => setListingType("multifamily")}
                  className={`px-2 py-2 text-sm rounded-md font-medium transition ${
                    listingType === "multifamily"
                      ? "bg-yellow-500 text-black"
                      : buttonInactive
                  }`}
                >
                  Multi-Family
                </button>
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Price Range</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))}
                  className="w-1/2 px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
                  className="w-1/2 px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                />
              </div>
            </div>

            {/* Beds & Baths */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`text-xs ${textSecondary} mb-1 block`}>Min Beds</label>
                <input
                  type="number"
                  value={beds}
                  onChange={(e) => setBeds(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                  placeholder="Any"
                  min="0"
                />
              </div>
              <div>
                <label className={`text-xs ${textSecondary} mb-1 block`}>Min Baths</label>
                <input
                  type="number"
                  value={baths}
                  onChange={(e) => setBaths(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                  placeholder="Any"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== PROPERTY DETAILS ========== */}
      <div className="mb-4">
        <SectionHeader title="Property Details" section="property" />
        {openSections.property && (
          <div className="space-y-3 pl-2">
            {/* Property Type */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Property Type</label>
              <select
                value={propertySubType}
                onChange={(e) => setPropertySubType(e.target.value)}
                className="w-full px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md text-white ${inputFocus} focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="Single Family Residence">Single Family Home</option>
                <option value="Condominium">Condominium</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Manufactured Home">Manufactured Home</option>
                <option value="Mobile Home">Mobile Home</option>
                <option value="Residential Income">Multi-Family</option>
              </select>
            </div>

            {/* Square Footage */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Square Footage (Interior)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Min"
                  value={minSqft}
                  onChange={(e) => setMinSqft(e.target.value.replace(/\D/g, ""))}
                  className="w-1/2 px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Max"
                  value={maxSqft}
                  onChange={(e) => setMaxSqft(e.target.value.replace(/\D/g, ""))}
                  className="w-1/2 px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                />
              </div>
            </div>

            {/* Lot Size */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Lot Size (Sqft)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Min"
                  value={minLotSize}
                  onChange={(e) => setMinLotSize(e.target.value.replace(/\D/g, ""))}
                  className="w-1/2 px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Max"
                  value={maxLotSize}
                  onChange={(e) => setMaxLotSize(e.target.value.replace(/\D/g, ""))}
                  className="w-1/2 px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                />
              </div>
            </div>

            {/* Year Built */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Year Built</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Min"
                  value={minYear}
                  onChange={(e) => setMinYear(e.target.value.replace(/\D/g, ""))}
                  className="w-1/2 px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Max"
                  value={maxYear}
                  onChange={(e) => setMaxYear(e.target.value.replace(/\D/g, ""))}
                  className="w-1/2 px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                />
              </div>
            </div>

            {/* Land Type (Fee Simple vs Lease) */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Land Ownership</label>
              <select
                value={landType}
                onChange={(e) => setLandType(e.target.value)}
                className="w-full px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md text-white ${inputFocus} focus:outline-none"
              >
                <option value="">All</option>
                <option value="Fee Simple">Fee Simple (Own Land)</option>
                <option value="Leasehold">Leasehold (Lease Land)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ========== AMENITIES ========== */}
      <div className="mb-4">
        <SectionHeader title="Amenities & Features" section="amenities" />
        {openSections.amenities && (
          <div className="space-y-3 pl-2">
            {/* Pool */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Pool</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPoolYn(poolYn === true ? undefined : true)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${
                    poolYn === true ? "bg-emerald-600 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setPoolYn(poolYn === false ? undefined : false)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${
                    poolYn === false ? "bg-red-600 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  No
                </button>
                <button
                  onClick={() => setPoolYn(undefined)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${
                    poolYn === undefined ? "bg-zinc-600 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  Any
                </button>
              </div>
            </div>

            {/* Spa */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Spa/Hot Tub</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSpaYn(spaYn === true ? undefined : true)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${
                    spaYn === true ? "bg-emerald-600 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setSpaYn(spaYn === false ? undefined : false)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${
                    spaYn === false ? "bg-red-600 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  No
                </button>
                <button
                  onClick={() => setSpaYn(undefined)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${
                    spaYn === undefined ? "bg-zinc-600 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  Any
                </button>
              </div>
            </div>

            {/* View */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>View</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewYn(viewYn === true ? undefined : true)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${
                    viewYn === true ? "bg-emerald-600 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  Has View
                </button>
                <button
                  onClick={() => setViewYn(undefined)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${
                    viewYn === undefined ? "bg-zinc-600 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  Any
                </button>
              </div>
            </div>

            {/* Garage */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Min Garage Spaces</label>
              <input
                type="number"
                value={minGarages}
                onChange={(e) => setMinGarages(e.target.value)}
                className="w-full px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                placeholder="Any"
                min="0"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========== COMMUNITY & HOA ========== */}
      <div className="mb-4">
        <SectionHeader title="Community & HOA" section="community" />
        {openSections.community && (
          <div className="space-y-3 pl-2">
            {/* HOA Presence */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Has HOA</label>
              <select
                value={hoaPresence}
                onChange={(e) => setHoaPresence(e.target.value)}
                className="w-full px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md text-white ${inputFocus} focus:outline-none"
              >
                <option value="any">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Max HOA Fee */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Max HOA Fee (Monthly)</label>
              <input
                type="text"
                inputMode="numeric"
                value={hoa}
                onChange={(e) => setHoa(e.target.value.replace(/\D/g, ""))}
                className="w-full px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                placeholder="No Limit"
              />
            </div>

            {/* Gated Community */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Gated Community</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGatedCommunity(gatedCommunity === true ? undefined : true)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${
                    gatedCommunity === true ? "bg-emerald-600 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setGatedCommunity(undefined)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${
                    gatedCommunity === undefined ? "bg-zinc-600 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  Any
                </button>
              </div>
            </div>

            {/* Senior Community */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>55+ Senior Community</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSeniorCommunity(seniorCommunity === true ? undefined : true)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${
                    seniorCommunity === true ? "bg-emerald-600 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setSeniorCommunity(undefined)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${
                    seniorCommunity === undefined ? "bg-zinc-600 text-white" : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  Any
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== LOCATION ========== */}
      <div className="mb-4">
        <SectionHeader title="Location" section="location" />
        {openSections.location && (
          <div className="space-y-3 pl-2">
            {/* City */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md text-white ${inputFocus} focus:outline-none"
              >
                <option value="">All Cities</option>
                <option value="Palm Springs">Palm Springs</option>
                <option value="Cathedral City">Cathedral City</option>
                <option value="Palm Desert">Palm Desert</option>
                <option value="Rancho Mirage">Rancho Mirage</option>
                <option value="Indian Wells">Indian Wells</option>
                <option value="La Quinta">La Quinta</option>
                <option value="Indio">Indio</option>
                <option value="Coachella">Coachella</option>
                <option value="Desert Hot Springs">Desert Hot Springs</option>
              </select>
            </div>

            {/* Subdivision */}
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Subdivision/Community</label>
              <input
                type="text"
                value={subdivision}
                onChange={(e) => setSubdivision(e.target.value)}
                className="w-full px-2 py-1.5 text-sm ${inputBg} border ${inputBorder} rounded-md placeholder-gray-500 ${inputFocus} focus:outline-none"
                placeholder="Search by name..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-zinc-950 pt-4 pb-2 border-t border-zinc-800 space-y-2">
        <button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-md transition duration-200"
          onClick={handleApplyFilters}
        >
          Apply Filters
        </button>
        <button
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2 rounded-md transition duration-200"
          onClick={handleClearFilters}
        >
          Clear All
        </button>
      </div>
    </aside>
  );
}
