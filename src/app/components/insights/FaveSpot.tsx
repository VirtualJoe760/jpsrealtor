"use client";

import React, { useState, useEffect } from "react";
import { Heart, MapPin, Bed, Bath, Maximize, ChevronLeft, ChevronRight, Loader2, ChevronDown, LayoutGrid, List } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface Listing {
  ListingKey: string;
  SlugAddress?: string;
  UnparsedAddress: string;
  City: string;
  StateOrProvince: string;
  PostalCode: string;
  ListPrice: number;
  BedroomsTotal: number;
  BathroomsTotalInteger: number;
  LivingArea: number;
  SubdivisionName?: string;
}

interface Photo {
  uri800?: string;
  uri1024?: string;
  uri1280?: string;
  uriLarge?: string;
  uriThumb?: string;
}

interface FaveSpotProps {
  className?: string;
}

// ListingCard component that fetches its own photo
const ListingCard: React.FC<{
  listing: Listing;
  isLight: boolean;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
}> = ({ listing, isLight, textPrimary, textSecondary, textMuted, cardBg, cardBorder }) => {
  // Use PhotoUrl from API response if available
  const [photoUrl, setPhotoUrl] = useState<string | null>((listing as any).PhotoUrl || null);
  const [loading, setLoading] = useState(!(listing as any).PhotoUrl);

  // Only fetch if API didn't provide a photo (fallback)
  useEffect(() => {
    if (photoUrl) { setLoading(false); return; }

    let isMounted = true;
    const abortController = new AbortController();

    const fetchPhoto = async () => {
      try {
        const response = await fetch(`/api/listings/${listing.ListingKey}/photos`, {
          signal: abortController.signal
        });
        if (response.ok) {
          const data = await response.json();
          const photos: Photo[] = data.photos || [];
          if (photos.length > 0 && isMounted) {
            // Use highest quality available
            const photo = photos[0];
            const url = photo.uri1280 || photo.uri1024 || photo.uri800 || photo.uriLarge || photo.uriThumb;
            setPhotoUrl(url || null);
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error(`Failed to fetch photo for ${listing.ListingKey}:`, error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPhoto();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [listing.ListingKey]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <a
      href={`/mls-listings/${listing.SlugAddress || listing.ListingKey}`}
      key={listing.ListingKey}
      className={`flex-shrink-0 w-72 rounded-lg overflow-hidden ${cardBg} ${cardBorder} border cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-200">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : photoUrl ? (
          <img
            src={photoUrl}
            alt={listing.UnparsedAddress}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <MapPin className="w-12 h-12 text-gray-400" />
          </div>
        )}
        {/* Price Tag */}
        <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
          {formatPrice(listing.ListPrice)}
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <h3 className={`font-semibold ${textPrimary} mb-1 truncate`}>
          {listing.UnparsedAddress}
        </h3>
        <p className={`text-sm ${textSecondary} mb-3 flex items-center gap-1`}>
          <MapPin className="w-3 h-3" />
          {listing.City}, {listing.StateOrProvince}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1 text-sm ${textMuted}`}>
            <Bed className="w-4 h-4" />
            <span>{listing.BedroomsTotal || 0}</span>
          </div>
          <div className={`flex items-center gap-1 text-sm ${textMuted}`}>
            <Bath className="w-4 h-4" />
            <span>{listing.BathroomsTotalInteger || 0}</span>
          </div>
          <div className={`flex items-center gap-1 text-sm ${textMuted}`}>
            <Maximize className="w-4 h-4" />
            <span>{listing.LivingArea?.toLocaleString() || 0} sqft</span>
          </div>
        </div>

        {listing.SubdivisionName && (
          <p className={`text-xs ${textMuted} mt-2 truncate`}>
            {listing.SubdivisionName}
          </p>
        )}
      </div>
    </a>
  );
};

// Compact List View Item
const ListingListItem: React.FC<{
  listing: Listing;
  isLight: boolean;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
}> = ({ listing, isLight, textPrimary, textSecondary, textMuted, cardBg, cardBorder }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchPhoto = async () => {
      try {
        const response = await fetch(`/api/listings/${listing.ListingKey}/photos`, {
          signal: abortController.signal
        });
        if (response.ok) {
          const data = await response.json();
          const photos: Photo[] = data.photos || [];
          if (photos.length > 0 && isMounted) {
            const photo = photos[0];
            const url = photo.uri800 || photo.uri1024 || photo.uriLarge || photo.uriThumb;
            setPhotoUrl(url || null);
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error(`Failed to fetch photo for ${listing.ListingKey}:`, error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPhoto();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [listing.ListingKey]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg ${cardBg} ${cardBorder} border cursor-pointer transition-all duration-200`}
    >
      {/* Thumbnail */}
      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : photoUrl ? (
          <img
            src={photoUrl}
            alt={listing.UnparsedAddress}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`text-base font-semibold ${textPrimary} line-clamp-1`}>
            {listing.UnparsedAddress}
          </h3>
          <span className="text-blue-600 font-bold text-base flex-shrink-0">
            {formatPrice(listing.ListPrice)}
          </span>
        </div>
        <p className={`text-xs ${textSecondary} mb-2 flex items-center gap-1`}>
          <MapPin className="w-3 h-3" />
          {listing.City}, {listing.StateOrProvince}
        </p>
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1 text-sm ${textMuted}`}>
            <Bed className="w-4 h-4" />
            <span>{listing.BedroomsTotal || 0}</span>
          </div>
          <div className={`flex items-center gap-1 text-sm ${textMuted}`}>
            <Bath className="w-4 h-4" />
            <span>{listing.BathroomsTotalInteger || 0}</span>
          </div>
          <div className={`flex items-center gap-1 text-sm ${textMuted}`}>
            <Maximize className="w-4 h-4" />
            <span>{listing.LivingArea?.toLocaleString() || 0} sqft</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const FaveSpot: React.FC<FaveSpotProps> = ({ className = "" }) => {
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [listings, setListings] = useState<Listing[]>([]);
  const [topCommunities, setTopCommunities] = useState<string[]>([]);
  const [allCommunities, setAllCommunities] = useState<Array<{ name: string; type: string }>>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const cardBg = isLight ? "bg-white/80" : "bg-neutral-900/50";
  const cardBorder = isLight ? "border-gray-200" : "border-neutral-700/50";
  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textSecondary = isLight ? "text-gray-600" : "text-gray-400";
  const textMuted = isLight ? "text-gray-500" : "text-gray-500";
  const shadow = isLight ? "shadow-lg" : "shadow-2xl shadow-black/40";

  useEffect(() => {
    loadFavoriteSpotlight();
  }, []);

  // Reset to page 1 when switching view modes
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  // Add mouse wheel support for carousel (mobile card view)
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || viewMode !== 'card') return;

    // Enable horizontal scroll with mouse wheel (for desktop testing)
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > 0) return; // Already scrolling horizontally
      e.preventDefault();
      carousel.scrollLeft += e.deltaY;
    };

    carousel.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      carousel.removeEventListener('wheel', handleWheel);
    };
  }, [viewMode]);

  const loadFavoriteSpotlight = async (community?: string) => {
    try {
      const url = community
        ? `/api/insights/favorite-spotlight?community=${encodeURIComponent(community)}`
        : "/api/insights/favorite-spotlight";

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTopCommunities(data.topCommunities || []);
        setAllCommunities(data.allCommunities || []);
        setSelectedCommunity(data.selectedCommunity || '');
        setListings(data.listings || []);
      }
    } catch (error) {
      console.error("Failed to load favorite spotlight:", error);
    } finally {
      setLoading(false);
      setIsSwitching(false);
      setShowSpinner(false);
    }
  };

  const handleCommunitySwitch = (communityName: string) => {
    setIsSwitching(true);
    setSelectedCommunity(communityName);
    setIsDropdownOpen(false); // Close dropdown after selection
    setCurrentPage(1); // Reset to first page when switching communities

    // Delay showing spinner to prevent flash on quick loads
    const spinnerTimeout = setTimeout(() => {
      if (isSwitching) {
        setShowSpinner(true);
      }
    }, 150);

    loadFavoriteSpotlight(communityName).then(() => {
      clearTimeout(spinnerTimeout);
    });
  };

  // Pagination calculations
  const totalPages = Math.ceil(listings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentListings = listings.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of list
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    const containerId = viewMode === 'card' && window.innerWidth < 768 ? "favespot-scroll" : "favespot-scroll-desktop";
    const container = document.getElementById(containerId);
    if (container) {
      const scrollAmount = 300;
      const newPosition = direction === "left"
        ? scrollPosition - scrollAmount
        : scrollPosition + scrollAmount;

      container.scrollTo({ left: newPosition, behavior: "smooth" });
      setScrollPosition(newPosition);
    }
  };

  // Show loading skeleton
  if (loading) {
    return (
      <div className={`${className} mb-4 md:mb-8`}>
        <div className={`p-0 md:p-6 rounded-none md:rounded-xl ${cardBorder} md:border md:backdrop-blur-xl relative overflow-hidden ${isLight ? 'md:bg-white/80' : 'md:bg-neutral-900/50'} ${isLight ? 'md:shadow-lg' : 'md:shadow-2xl md:shadow-black/40'} animate-pulse`}>
          {/* Skeleton Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded-lg w-64 mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-48"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
              <div className="h-10 w-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            </div>
          </div>
          {/* Skeleton Listings Scroll */}
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-shrink-0 w-72 rounded-lg overflow-hidden">
                <div className="h-48 bg-gray-300 dark:bg-gray-700"></div>
                <div className="p-4">
                  <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                  <div className="flex gap-4">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-12"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-12"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Don't show if no data
  if (listings.length === 0) {
    return null;
  }

  return (
    <div className={`${className} mb-4 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700`}>
      <div className={`p-0 md:p-6 rounded-none md:rounded-xl ${cardBorder} md:border md:backdrop-blur-xl relative overflow-hidden ${isLight ? 'md:bg-white/80' : 'md:bg-neutral-900/50'} ${isLight ? 'md:shadow-lg' : 'md:shadow-2xl md:shadow-black/40'}`}>
        {/* Loading Spinner Overlay - Pure CSS transition */}
        {showSpinner && (
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10 transition-opacity duration-200">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Header */}
        <div className="px-4 py-3 md:px-0 md:py-0 mb-2 md:mb-4">
          <div className="flex items-start justify-between gap-3 mb-2 md:mb-0">
            <div className="flex-1">
              <h2 className={`text-xl md:text-2xl font-bold ${textPrimary} flex items-center gap-2 mb-1`}>
                <Heart className="w-5 h-5 md:w-6 md:h-6 fill-red-500 text-red-500" />
                Favorites Spotlight
              </h2>
              <p className={`text-xs md:text-sm ${textSecondary}`}>
                Fresh listings from {selectedCommunity || topCommunities.slice(0, 2).join(" & ")}
              </p>

              {/* Desktop: Pills */}
              {allCommunities.length > 1 && (
                <div className="hidden md:flex mt-3 items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold ${textSecondary} mr-1`}>Looking somewhere else?</span>
                  {allCommunities.map((community, idx) => (
                    <button
                      key={community.name}
                      onClick={() => handleCommunitySwitch(community.name)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                        selectedCommunity === community.name
                          ? "bg-blue-600 text-white shadow-md"
                          : isLight
                          ? "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm border border-blue-200"
                          : "bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 hover:shadow-sm border border-blue-700/50"
                      }`}
                    >
                      {community.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Mobile: Dropdown */}
              {allCommunities.length > 1 && (
                <div className="md:hidden mt-2 relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                      isLight
                        ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                        : "bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 border border-blue-700/50"
                    }`}
                  >
                    <span className="truncate">{selectedCommunity || "Select Community"}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg border z-20 overflow-hidden ${
                      isLight ? "bg-white border-gray-200" : "bg-neutral-900 border-neutral-700"
                    }`}>
                      {allCommunities.map((community) => (
                        <button
                          key={community.name}
                          onClick={() => handleCommunitySwitch(community.name)}
                          className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                            selectedCommunity === community.name
                              ? "bg-blue-600 text-white"
                              : isLight
                              ? "text-gray-900 hover:bg-gray-100"
                              : "text-gray-100 hover:bg-neutral-800"
                          }`}
                        >
                          {community.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* View Toggle & Scroll Controls */}
            <div className="flex items-center gap-2">
              {/* View Toggle - Mobile Only */}
              <div className="md:hidden flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-neutral-800">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'card'
                      ? isLight
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'bg-neutral-700 text-blue-400'
                      : isLight
                      ? 'text-gray-500'
                      : 'text-gray-400'
                  }`}
                  aria-label="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'list'
                      ? isLight
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'bg-neutral-700 text-blue-400'
                      : isLight
                      ? 'text-gray-500'
                      : 'text-gray-400'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Scroll Controls - Desktop Only & Card View */}
              <div className={`${viewMode === 'card' ? 'flex' : 'hidden md:flex'} gap-2`}>
                <button
                  onClick={() => handleScroll("left")}
                  className={`p-2 rounded-full transition-colors ${
                    isLight
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      : "bg-neutral-800 hover:bg-neutral-700 text-gray-300"
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleScroll("right")}
                  className={`p-2 rounded-full transition-colors ${
                    isLight
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      : "bg-neutral-800 hover:bg-neutral-700 text-gray-300"
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Listings - Card Carousel or List View */}
        {viewMode === 'card' ? (
          <>
            {/* Card Carousel */}
            <div
              id="favespot-scroll"
              ref={carouselRef}
              className="md:hidden flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth px-4 pb-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: 'touch' }}
            >
              {listings.map((listing) => (
                <ListingCard
                  key={listing.ListingKey}
                  listing={listing}
                  isLight={isLight}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  textMuted={textMuted}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* List View */}
            <div
              ref={listRef}
              className="md:hidden px-4 pb-2 space-y-3"
            >
              {currentListings.map((listing) => (
                <ListingListItem
                  key={listing.ListingKey}
                  listing={listing}
                  isLight={isLight}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  textMuted={textMuted}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                />
              ))}
            </div>

            {/* Pagination Controls - Mobile Only */}
            {totalPages > 1 && (
              <div className="md:hidden px-4 pb-4 pt-2">
                <div className="flex items-center justify-between">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === 1
                        ? isLight
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-neutral-800 text-gray-600 cursor-not-allowed'
                        : isLight
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? isLight
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-500 text-white'
                            : isLight
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === totalPages
                        ? isLight
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-neutral-800 text-gray-600 cursor-not-allowed'
                        : isLight
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Page Info */}
                <div className={`text-center mt-2 text-xs ${textMuted}`}>
                  Showing {startIndex + 1}-{Math.min(endIndex, listings.length)} of {listings.length} listings
                </div>
              </div>
            )}
          </>
        )}

        {/* Desktop Scroll */}
        <div
          id="favespot-scroll-desktop"
          className="hidden md:flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {listings.map((listing) => (
            <ListingCard
              key={listing.ListingKey}
              listing={listing}
              isLight={isLight}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FaveSpot;
