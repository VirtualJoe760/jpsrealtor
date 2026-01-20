// src/app/dashboard/components/FavoriteProperties.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Heart, Trash2, ChevronRight, LayoutGrid, List } from "lucide-react";
import ScrollPanel from "../../components/ScrollPanel";
import ListingPhoto from "../../components/ListingPhoto";
import FavoritesListView from "./FavoritesListView";
import { FavoriteProperty } from "../utils/types";

interface FavoritePropertiesProps {
  favorites: FavoriteProperty[];
  isLoadingFavorites: boolean;
  isSyncing: boolean;
  selectedListings: Set<string>;
  toggleSelectListing: (key: string) => void;
  toggleSelectAll: () => void;
  deleteSelected: () => void;
  removeFavorite: (key: string) => void;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  shadow: string;
  isLight: boolean;
}

export default function FavoriteProperties({
  favorites,
  isLoadingFavorites,
  isSyncing,
  selectedListings,
  toggleSelectListing,
  toggleSelectAll,
  deleteSelected,
  removeFavorite,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  textTertiary,
  shadow,
  isLight,
}: FavoritePropertiesProps) {
  const [viewMode, setViewMode] = useState<'panel' | 'list'>('panel');
  const [mobilePage, setMobilePage] = useState(1);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const mobileItemsPerPage = 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow} mb-8`}
    >
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className={`text-2xl font-bold ${textPrimary} flex items-center`}>
          <Heart className="w-6 h-6 mr-2 text-red-400" />
          Your Favorite Properties
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          {isSyncing && <span className={`text-sm ${textSecondary}`}>Syncing...</span>}

          {/* View Toggle Buttons */}
          {favorites.length > 0 && (
            <div className={`flex rounded-full p-1 ${isLight ? 'bg-gray-100' : 'bg-gray-800'}`}>
              <button
                onClick={() => setViewMode('panel')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  viewMode === 'panel'
                    ? isLight
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'bg-neutral-800 text-emerald-400 shadow-md'
                    : isLight
                      ? 'text-gray-600 hover:text-gray-900'
                      : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Panel
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  viewMode === 'list'
                    ? isLight
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'bg-neutral-800 text-emerald-400 shadow-md'
                    : isLight
                      ? 'text-gray-600 hover:text-gray-900'
                      : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
          )}

          {favorites.length > 0 && (
            <>
              <label
                className={`flex items-center gap-2 text-sm ${textSecondary} cursor-pointer`}
              >
                <input
                  type="checkbox"
                  checked={selectedListings.size === favorites.length && favorites.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                Select All
              </label>
              {selectedListings.size > 0 && (
                <>
                  <span className={`text-sm ${textSecondary}`}>
                    {selectedListings.size} selected
                  </span>
                  <button
                    onClick={deleteSelected}
                    className={`flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 ${textPrimary} rounded-lg transition-colors text-sm`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {isLoadingFavorites ? (
        <div className={`text-center py-12 ${textSecondary}`}>Loading favorites...</div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12">
          <Heart className={`w-16 h-16 mx-auto mb-4 ${textTertiary}`} />
          <p className={`${textSecondary} mb-4`}>No favorites yet</p>
          <Link
            href="/?view=map"
            className={`inline-block px-6 py-3 rounded-lg transition-all text-white font-medium ${
              isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            Browse Listings
          </Link>
        </div>
      ) : viewMode === 'list' ? (
        /* List View - All devices */
        <FavoritesListView
          favorites={favorites}
          selectedListings={selectedListings}
          toggleSelectListing={toggleSelectListing}
          removeFavorite={removeFavorite}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          isLight={isLight}
        />
      ) : (
        <>
          {/* Panel View - Desktop Auto-scroll */}
          <DesktopFavorites
            favorites={favorites}
            selectedListings={selectedListings}
            toggleSelectListing={toggleSelectListing}
            removeFavorite={removeFavorite}
            cardBg={cardBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            isLight={isLight}
          />

          {/* Panel View - Mobile Accordion */}
          <MobileFavorites
            favorites={favorites}
            selectedListings={selectedListings}
            toggleSelectListing={toggleSelectListing}
            removeFavorite={removeFavorite}
            mobilePage={mobilePage}
            setMobilePage={setMobilePage}
            expandedIndex={expandedIndex}
            setExpandedIndex={setExpandedIndex}
            mobileItemsPerPage={mobileItemsPerPage}
            cardBg={cardBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            textTertiary={textTertiary}
            isLight={isLight}
          />
        </>
      )}
    </motion.div>
  );
}

// Desktop scrolling favorites
function DesktopFavorites({
  favorites,
  selectedListings,
  toggleSelectListing,
  removeFavorite,
  cardBg,
  textPrimary,
  textSecondary,
  isLight,
}: {
  favorites: FavoriteProperty[];
  selectedListings: Set<string>;
  toggleSelectListing: (key: string) => void;
  removeFavorite: (key: string) => void;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  isLight: boolean;
}) {
  const duplicatedFavorites = [...favorites, ...favorites];

  return (
    <ScrollPanel className="hidden md:block">
      {duplicatedFavorites.map((listing, index) => {
        const isSelected = selectedListings.has(listing.listingKey);

        return (
          <div
            key={`${listing.listingKey}-${index}`}
            className={`flex-shrink-0 w-80 ${cardBg} border rounded-xl overflow-hidden
                       transition-all group
                       ${
                         isSelected
                           ? "border-blue-500 ring-2 ring-blue-500/50"
                           : isLight
                             ? "border-gray-300"
                             : "border-gray-700"
                       }
                       hover:border-gray-600`}
          >
            {/* Image */}
            <div className="relative h-48">
              <ListingPhoto
                listingKey={listing.listingKey}
                mlsId={listing.mlsId}
                mlsSource={listing.mlsSource}
                alt={listing.address || "Property"}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Checkbox + Delete */}
              <div className="absolute left-2 top-2 flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectListing(listing.listingKey)}
                    className="h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
              <button
                onClick={() => removeFavorite(listing.listingKey)}
                className={`absolute right-2 top-2 rounded-full p-2 transition-colors ${
                  isLight ? "bg-white/70 hover:bg-white/90" : "bg-black/50 hover:bg-black/70"
                }`}
              >
                <Heart className="h-5 w-5 fill-red-400 text-red-400" />
              </button>
            </div>

            {/* Details */}
            <div className="p-4">
              <p className={`mb-2 text-2xl font-bold ${textPrimary}`}>
                ${listing.listPrice?.toLocaleString() || "N/A"}
              </p>
              <p className={`mb-3 truncate text-sm ${textSecondary}`}>
                {listing.address || listing.unparsedAddress || "No address"}
              </p>

              <div className={`mb-3 flex gap-4 text-sm ${textSecondary}`}>
                <span>{listing.bedsTotal ?? 0} bd</span>
                <span>{listing.bathroomsTotalInteger ?? 0} ba</span>
                <span>{listing.livingArea?.toLocaleString() ?? 0} sqft</span>
              </div>

              {listing.subdivisionName && (
                <p className={`mb-2 truncate text-xs ${textSecondary}`}>
                  {listing.subdivisionName}
                </p>
              )}

              <Link
                href={`/mls-listings/${listing.slugAddress || listing.listingKey}`}
                className={`block w-full rounded-lg py-2 text-center text-sm text-white font-medium transition-colors ${
                  isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                View Details
              </Link>
            </div>
          </div>
        );
      })}
    </ScrollPanel>
  );
}

// Mobile accordion favorites
function MobileFavorites({
  favorites,
  selectedListings,
  toggleSelectListing,
  removeFavorite,
  mobilePage,
  setMobilePage,
  expandedIndex,
  setExpandedIndex,
  mobileItemsPerPage,
  cardBg,
  textPrimary,
  textSecondary,
  textTertiary,
  isLight,
}: {
  favorites: FavoriteProperty[];
  selectedListings: Set<string>;
  toggleSelectListing: (key: string) => void;
  removeFavorite: (key: string) => void;
  mobilePage: number;
  setMobilePage: (page: number) => void;
  expandedIndex: number | null;
  setExpandedIndex: (index: number | null) => void;
  mobileItemsPerPage: number;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  isLight: boolean;
}) {
  const totalPages = Math.ceil(favorites.length / mobileItemsPerPage);
  const start = (mobilePage - 1) * mobileItemsPerPage;
  const end = start + mobileItemsPerPage;
  const items = favorites.slice(start, end);

  return (
    <div className="md:hidden">
      <div className="space-y-4">
        {items.map((listing, idx) => {
          const globalIdx = start + idx;
          const expanded = expandedIndex === globalIdx;
          const selected = selectedListings.has(listing.listingKey);

          return (
            <div
              key={`${listing.listingKey}-${globalIdx}`}
              className={`${cardBg} border rounded-xl overflow-hidden ${
                selected
                  ? "border-blue-500 ring-2 ring-blue-500/50"
                  : isLight
                    ? "border-gray-300"
                    : "border-gray-700"
              }`}
            >
              {/* Header */}
              <div className="w-full p-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSelectListing(listing.listingKey)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                />
                <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden">
                  <ListingPhoto
                    listingKey={listing.listingKey}
                    mlsId={listing.mlsId}
                    mlsSource={listing.mlsSource}
                    alt={listing.address || "Property"}
                    width={56}
                    height={56}
                    className="object-cover w-full h-full"
                  />
                </div>
                <button
                  onClick={() => setExpandedIndex(expanded ? null : globalIdx)}
                  className={`flex-1 min-w-0 text-left transition-colors rounded-lg p-2 ${
                    isLight ? "hover:bg-gray-100" : "hover:bg-gray-800/70"
                  }`}
                >
                  <p className={`text-base font-bold ${textPrimary} leading-tight`}>
                    ${listing.listPrice?.toLocaleString() || "N/A"}
                  </p>
                  <p className={`${textSecondary} text-xs truncate leading-tight mt-0.5`}>
                    {listing.address || listing.unparsedAddress || "No address"}
                  </p>
                </button>
                <button
                  onClick={() => setExpandedIndex(expanded ? null : globalIdx)}
                  className="flex-shrink-0 p-1.5"
                >
                  <ChevronRight
                    className={`w-5 h-5 ${textSecondary} transition-transform ${
                      expanded ? "rotate-90" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Expanded */}
              {expanded && (
                <div
                  className={`border-t ${isLight ? "border-gray-300" : "border-gray-700"}`}
                >
                  <div className="relative h-48">
                    <ListingPhoto
                      listingKey={listing.listingKey}
                      mlsId={listing.mlsId}
                      mlsSource={listing.mlsSource}
                      alt={listing.address || "Property"}
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(listing.listingKey);
                      }}
                      className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${
                        isLight
                          ? "bg-white/70 hover:bg-white/90"
                          : "bg-black/50 hover:bg-black/70"
                      }`}
                    >
                      <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                    </button>
                  </div>

                  <div className="p-4">
                    {/* Price */}
                    <p className={`text-2xl font-bold ${textPrimary} mb-2`}>
                      ${listing.listPrice?.toLocaleString() || "N/A"}
                    </p>

                    {/* Address */}
                    <p className={`text-sm ${textSecondary} mb-3`}>
                      {listing.address || listing.unparsedAddress || "No address"}
                    </p>

                    {/* Bed/Bath/SqFt */}
                    <div className={`flex items-center gap-4 ${textSecondary} text-sm mb-3`}>
                      <span>{listing.bedsTotal || 0} bd</span>
                      <span>{listing.bathroomsTotalInteger || 0} ba</span>
                      <span>{listing.livingArea?.toLocaleString() || 0} sqft</span>
                    </div>

                    {/* Subdivision */}
                    {listing.subdivisionName && (
                      <p className={`${textTertiary} text-xs mb-3`}>
                        {listing.subdivisionName}
                      </p>
                    )}

                    {/* Abbreviated Description */}
                    {listing.publicRemarks && (
                      <p className={`text-xs ${textSecondary} mb-3 line-clamp-3`}>
                        {listing.publicRemarks}
                      </p>
                    )}

                    <Link
                      href={`/mls-listings/${listing.slugAddress || listing.listingKey}`}
                      className={`block w-full text-center py-2 text-white font-medium rounded-lg transition-colors text-sm ${
                        isLight
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setMobilePage(p);
                  setExpandedIndex(null);
                }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  mobilePage === p
                    ? `bg-blue-600 ${textPrimary}`
                    : isLight
                      ? `bg-gray-200 ${textSecondary} hover:bg-gray-300`
                      : `bg-gray-800 ${textSecondary} hover:bg-gray-700`
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
