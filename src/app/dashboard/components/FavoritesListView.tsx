// src/app/dashboard/components/FavoritesListView.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import ListingPhoto from "../../components/ListingPhoto";
import { FavoriteProperty } from "../utils/types";

interface FavoritesListViewProps {
  favorites: FavoriteProperty[];
  selectedListings: Set<string>;
  toggleSelectListing: (key: string) => void;
  removeFavorite: (key: string) => void;
  textPrimary: string;
  textSecondary: string;
  isLight: boolean;
}

const ITEMS_PER_PAGE = 8;

export default function FavoritesListView({
  favorites,
  selectedListings,
  toggleSelectListing,
  removeFavorite,
  textPrimary,
  textSecondary,
  isLight,
}: FavoritesListViewProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination
  const totalPages = Math.ceil(favorites.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentListings = favorites.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <div>
      {/* List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {currentListings.map((listing) => {
          const isSelected = selectedListings.has(listing.listingKey);

          return (
            <div
              key={listing.listingKey}
              className={`relative group border rounded-xl overflow-hidden transition-all ${
                isSelected
                  ? "border-blue-500 ring-2 ring-blue-500/30"
                  : isLight
                    ? "border-gray-200 hover:border-gray-300"
                    : "border-gray-700 hover:border-gray-600"
              } ${isLight ? "bg-white" : "bg-gray-800/50"}`}
            >
              <div className="flex gap-4 p-4">
                {/* Checkbox */}
                <div className="flex-shrink-0 pt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectListing(listing.listingKey)}
                    className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                {/* Photo */}
                <div className="w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden relative">
                  <ListingPhoto
                    listingKey={listing.listingKey}
                    mlsId={listing.mlsId}
                    mlsSource={listing.mlsSource}
                    alt={listing.address || "Property"}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Heart button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removeFavorite(listing.listingKey);
                    }}
                    className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${
                      isLight
                        ? "bg-white/80 hover:bg-white"
                        : "bg-black/60 hover:bg-black/80"
                    }`}
                  >
                    <Heart className="w-4 h-4 fill-red-400 text-red-400" />
                  </button>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/mls-listings/${listing.slugAddress || listing.listingKey}`}
                    className="block"
                  >
                    <p className={`text-xl font-bold ${textPrimary} mb-1 hover:underline`}>
                      ${listing.listPrice?.toLocaleString() || "N/A"}
                    </p>
                    <p className={`text-sm ${textSecondary} mb-2 truncate`}>
                      {listing.address || listing.unparsedAddress || "No address"}
                    </p>

                    {/* Property details */}
                    <div className={`flex items-center gap-4 text-sm ${textSecondary} mb-2`}>
                      <span>{listing.bedsTotal ?? 0} bd</span>
                      <span>{listing.bathroomsTotalInteger ?? 0} ba</span>
                      <span>{listing.livingArea?.toLocaleString() ?? 0} sqft</span>
                    </div>

                    {/* Subdivision */}
                    {listing.subdivisionName && (
                      <p className={`text-xs ${textSecondary} truncate`}>
                        {listing.subdivisionName}
                      </p>
                    )}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={`text-sm ${textSecondary}`}>
            Showing {startIndex + 1}-{Math.min(endIndex, favorites.length)} of {favorites.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 1
                  ? "opacity-50 cursor-not-allowed"
                  : isLight
                    ? "hover:bg-gray-100"
                    : "hover:bg-gray-800"
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className={`text-sm ${textSecondary}`}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === totalPages
                  ? "opacity-50 cursor-not-allowed"
                  : isLight
                    ? "hover:bg-gray-100"
                    : "hover:bg-gray-800"
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
