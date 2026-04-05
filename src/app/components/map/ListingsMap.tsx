"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Map, { Marker, ViewState } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import AnimatedMarker from "@/app/components/mls/map/AnimatedMarker";
import { useTheme } from "@/app/contexts/ThemeContext";

// ─── Shared listing shape that any data source can provide ───
export interface MapListing {
  listingKey: string;
  slugAddress?: string;
  latitude: number;
  longitude: number;
  listPrice?: number;
  propertyType?: string;   // A=sale, B=rental, C=multifamily, D=land
  mlsSource?: string;
  bedsTotal?: number;
  bathsTotal?: number;
  bathroomsTotalInteger?: number;
  livingArea?: number;
  lotSize?: number;
  associationFee?: number;
  subdivisionName?: string;
  address?: string;
  photoUrl?: string;
}

export interface ListingsMapProps {
  /** Array of listings to display as markers */
  listings: MapListing[];
  /** Show loading overlay */
  loading?: boolean;
  /** Map container height */
  height?: string;
  /** Initial center coordinates */
  center?: { latitude: number; longitude: number };
  /** Initial zoom level */
  zoom?: number;
  /** Fit map bounds to markers on first load (default true) */
  fitBoundsOnLoad?: boolean;
  /** Show property type filter bar below map */
  showFilters?: boolean;
  /** Available filter options */
  filterOptions?: Array<{ value: string; label: string }>;
  /** Current active filter */
  activeFilter?: string;
  /** Filter change callback */
  onFilterChange?: (filter: string) => void;
  /** Listing click callback */
  onListingClick?: (listing: MapListing) => void;
  /** Show the cogwheel advanced filter button */
  showAdvancedFilters?: boolean;
  /** Advanced filter content (rendered inside the overlay panel) */
  advancedFilterContent?: React.ReactNode;
  /** Optional: text shown below the map (e.g., "Showing 100 properties...") */
  statusText?: string;
  /** Optional: action button below map (e.g., "View All Listings") */
  actionButton?: React.ReactNode;
  /** Selected listing key (for highlighting) */
  selectedListingKey?: string;
}

// ─── Price formatter ───
function formatPrice(price?: number): string {
  if (!price) return "";
  if (price >= 1000000) return `$${(price / 1000000).toFixed(price % 100000 === 0 ? 1 : 2)}M`;
  if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`;
  return `$${price.toLocaleString()}`;
}

// ─── Popup card (rendered as React, not HTML string) ───
function ListingPopup({
  listing,
  isLight,
  onClose,
}: {
  listing: MapListing;
  isLight: boolean;
  onClose: () => void;
}) {
  const priceStr = formatPrice(listing.listPrice);
  const address = listing.address || "Address not available";
  const beds = listing.bedsTotal;
  const baths = listing.bathsTotal ?? listing.bathroomsTotalInteger;
  const sqft = listing.livingArea;
  const lotSize = listing.lotSize;
  const hoaFee = listing.associationFee;
  const subdivision = listing.subdivisionName;
  const rental = listing.propertyType === "B";
  const slug = listing.slugAddress || listing.listingKey;

  const details: string[] = [];
  if (beds != null) details.push(`${beds}bd`);
  if (baths != null) details.push(`${baths}ba`);
  if (sqft) details.push(`${sqft.toLocaleString()} sqft`);
  if (lotSize) details.push(`${Math.round(lotSize).toLocaleString()} lot`);

  return (
    <div
      className="absolute z-50"
      style={{ transform: "translate(-50%, -110%)" }}
    >
      <a
        href={`/mls-listings/${slug}`}
        className={`block w-[280px] rounded-xl overflow-hidden shadow-2xl border transition-opacity ${
          isLight
            ? "bg-white border-gray-200"
            : "bg-[#1a1a2e] border-gray-700"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo */}
        <div className="relative w-full h-[100px] overflow-hidden">
          {listing.photoUrl ? (
            <img
              src={listing.photoUrl}
              alt="Property"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center ${
                isLight ? "bg-gray-100" : "bg-[#2d2d44]"
              }`}
            >
              <svg
                width="28"
                height="28"
                fill={isLight ? "#d1d5db" : "#555"}
                viewBox="0 0 20 20"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
          )}
          {/* Price badge */}
          <div
            className={`absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md text-sm font-extrabold backdrop-blur-sm ${
              isLight
                ? "bg-white/90 text-blue-600"
                : "bg-black/75 text-blue-400"
            }`}
          >
            {priceStr}
          </div>
          {rental && (
            <div className="absolute top-1.5 left-1.5 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
              FOR RENT
            </div>
          )}
          {/* Close button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70"
          >
            ✕
          </button>
        </div>
        {/* Details */}
        <div className="px-2.5 py-2">
          <div
            className={`text-xs font-semibold truncate ${
              isLight ? "text-gray-900" : "text-gray-200"
            }`}
          >
            {address}
          </div>
          {details.length > 0 && (
            <div
              className={`flex gap-1.5 mt-1 text-[11px] font-semibold flex-wrap ${
                isLight ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {details.map((d, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <span className={isLight ? "text-gray-300" : "text-gray-600"}>
                      ·
                    </span>
                  )}
                  <span>{d}</span>
                </React.Fragment>
              ))}
            </div>
          )}
          {(subdivision || (hoaFee && hoaFee > 0)) && (
            <div
              className={`flex gap-1.5 mt-1 text-[10px] flex-wrap ${
                isLight ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {subdivision && (
                <span className="truncate max-w-[160px]">{subdivision}</span>
              )}
              {subdivision && hoaFee && hoaFee > 0 && (
                <span className={isLight ? "text-gray-300" : "text-gray-600"}>
                  ·
                </span>
              )}
              {hoaFee && hoaFee > 0 && (
                <span>HOA ${hoaFee.toLocaleString()}/mo</span>
              )}
            </div>
          )}
        </div>
      </a>
      {/* Arrow */}
      <div className="flex justify-center">
        <div
          className={`w-3 h-3 rotate-45 -mt-1.5 ${
            isLight ? "bg-white" : "bg-[#1a1a2e]"
          }`}
        />
      </div>
    </div>
  );
}

// ─── Main component ───
export default function ListingsMap({
  listings,
  loading = false,
  height = "500px",
  center,
  zoom = 12,
  fitBoundsOnLoad = true,
  showFilters = false,
  filterOptions,
  activeFilter,
  onFilterChange,
  onListingClick,
  showAdvancedFilters = false,
  advancedFilterContent,
  statusText,
  actionButton,
  selectedListingKey,
}: ListingsMapProps) {
  const mapRef = useRef<any>(null);
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const boundsSetRef = useRef(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [popupListing, setPopupListing] = useState<MapListing | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(zoom);

  const mapStyle = isLight
    ? "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

  // Compute initial view
  const initialViewState: Partial<ViewState> = {
    latitude: center?.latitude ?? 33.8303,
    longitude: center?.longitude ?? -116.5453,
    zoom,
    bearing: 0,
    pitch: 0,
  };

  // Fit bounds once when listings first arrive
  useEffect(() => {
    if (!fitBoundsOnLoad || boundsSetRef.current || listings.length === 0) return;
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const valid = listings.filter((l) => l.latitude && l.longitude);
    if (valid.length === 0) return;

    if (valid.length === 1) {
      map.flyTo({
        center: [valid[0].longitude, valid[0].latitude],
        zoom: 14,
        duration: 600,
      });
    } else {
      const maplibregl = require("maplibre-gl");
      const bounds = new maplibregl.LngLatBounds();
      valid.forEach((l) => bounds.extend([l.longitude, l.latitude]));
      map.fitBounds(bounds.toArray(), {
        padding: 50,
        maxZoom: 15,
        duration: 600,
      });
    }
    boundsSetRef.current = true;
  }, [listings, fitBoundsOnLoad]);

  const handleMarkerClick = useCallback(
    (listing: MapListing) => {
      setPopupListing((prev) =>
        prev?.listingKey === listing.listingKey ? null : listing
      );
      onListingClick?.(listing);
    },
    [onListingClick]
  );

  const handleMapClick = useCallback(() => {
    setPopupListing(null);
  }, []);

  const handleMoveEnd = useCallback((e: any) => {
    const z = e.viewState?.zoom;
    if (z != null) setCurrentZoom(z);
  }, []);

  const showAsDot = currentZoom < 14;

  return (
    <div className="space-y-3">
      <div className="relative" style={{ height }}>
        <div
          className={`w-full h-full rounded-xl overflow-hidden shadow-xl border ${
            isLight ? "border-gray-300" : "border-gray-700"
          }`}
          style={{ touchAction: "pan-x pan-y" }}
        >
          <Map
            ref={mapRef}
            initialViewState={initialViewState}
            mapStyle={mapStyle}
            style={{ width: "100%", height: "100%" }}
            onClick={handleMapClick}
            onMoveEnd={handleMoveEnd}
            cursor="default"
            cooperativeGestures={true}
          >
            {/* Markers */}
            {listings
              .filter((l) => l.latitude && l.longitude)
              .map((listing, i) => {
                const isSelected =
                  selectedListingKey === listing.listingKey ||
                  popupListing?.listingKey === listing.listingKey;
                const isHovered = hoveredId === listing.listingKey;

                return (
                  <Marker
                    key={listing.listingKey}
                    longitude={listing.longitude}
                    latitude={listing.latitude}
                    anchor={showAsDot ? "center" : "bottom"}
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      handleMarkerClick(listing);
                    }}
                  >
                    <AnimatedMarker
                      price={formatPrice(listing.listPrice)}
                      propertyType={listing.propertyType}
                      mlsSource={listing.mlsSource}
                      isSelected={isSelected}
                      isHovered={isHovered}
                      onMouseEnter={() => setHoveredId(listing.listingKey)}
                      onMouseLeave={() => setHoveredId(null)}
                      isLight={isLight}
                      showAsDot={showAsDot}
                      staggerIndex={i}
                    />
                  </Marker>
                );
              })}

            {/* Popup */}
            {popupListing && (
              <Marker
                longitude={popupListing.longitude}
                latitude={popupListing.latitude}
                anchor="bottom"
              >
                <ListingPopup
                  listing={popupListing}
                  isLight={isLight}
                  onClose={() => setPopupListing(null)}
                />
              </Marker>
            )}
          </Map>
        </div>

        {/* Cogwheel advanced filter button */}
        {showAdvancedFilters && (
          <>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`absolute top-3 left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${
                filtersOpen
                  ? isLight
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : isLight
                    ? "bg-white/90 text-gray-700 hover:bg-white border border-gray-300"
                    : "bg-gray-800/90 text-gray-300 hover:bg-gray-700 border border-gray-600"
              }`}
              title="Advanced Filters"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {filtersOpen && advancedFilterContent && (
              <div
                className={`absolute top-16 left-3 z-10 rounded-xl shadow-xl border p-4 w-72 ${
                  isLight
                    ? "bg-white/95 border-gray-300 backdrop-blur-md"
                    : "bg-gray-900/95 border-gray-700 backdrop-blur-md"
                }`}
              >
                {advancedFilterContent}
              </div>
            )}
          </>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 rounded-xl z-20">
            <div className="text-center">
              <div
                className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2 ${
                  isLight ? "border-blue-600" : "border-emerald-500"
                }`}
              />
              <p className="text-sm text-gray-300">Loading listings...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && listings.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-xl z-20">
            <p className="text-gray-300 text-sm">No listings to display</p>
          </div>
        )}
      </div>

      {/* Property type filter bar */}
      {showFilters && filterOptions && onFilterChange && (
        <div
          className={`flex gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide rounded-xl border p-1.5 ${
            isLight
              ? "bg-white border-gray-200"
              : "bg-black/85 border-gray-700"
          }`}
        >
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFilterChange(opt.value)}
              className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                activeFilter === opt.value
                  ? isLight
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-blue-500 text-white shadow-sm"
                  : isLight
                    ? "text-gray-600 hover:bg-gray-100"
                    : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Status text + action button */}
      {(statusText || actionButton) && (
        <div className="flex items-center justify-between">
          {statusText && (
            <div className={`text-xs md:text-sm ${isLight ? "text-gray-500" : "text-gray-500"}`}>
              {statusText}
            </div>
          )}
          {actionButton}
        </div>
      )}
    </div>
  );
}
