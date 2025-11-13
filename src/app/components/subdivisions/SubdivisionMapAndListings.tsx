"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import SubdivisionListings from "./SubdivisionListings";

const SubdivisionMap = dynamic(
  () => import("./SubdivisionMap"),
  { ssr: false }
);

interface Subdivision {
  name: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface SubdivisionMapAndListingsProps {
  subdivisionSlug: string;
  subdivision: Subdivision;
}

export default function SubdivisionMapAndListings({
  subdivisionSlug,
  subdivision,
}: SubdivisionMapAndListingsProps) {
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<"all" | "sale" | "rental">("all");

  return (
    <>
      {/* Property Type Toggle */}
      <div className="mb-6 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Show:</span>
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
          <button
            onClick={() => setPropertyTypeFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              propertyTypeFilter === "all"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setPropertyTypeFilter("sale")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              propertyTypeFilter === "sale"
                ? "bg-green-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-600"></span>
              For Sale
            </span>
          </button>
          <button
            onClick={() => setPropertyTypeFilter("rental")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              propertyTypeFilter === "rental"
                ? "bg-purple-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-600"></span>
              For Rent
            </span>
          </button>
        </div>
      </div>

      {/* Map */}
      {subdivision.coordinates && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Location & Listings Map</h2>
          <SubdivisionMap
            subdivisionSlug={subdivisionSlug}
            subdivision={subdivision}
            propertyTypeFilter={propertyTypeFilter}
            height="500px"
          />
        </div>
      )}

      {/* Listings */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Homes</h2>
        <SubdivisionListings
          subdivisionSlug={subdivisionSlug}
          propertyTypeFilter={propertyTypeFilter}
        />
      </div>
    </>
  );
}
