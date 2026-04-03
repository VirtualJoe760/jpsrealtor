"use client";

import React, { useState, useEffect } from "react";
import { Home, MapPin, Bed, Bath, Maximize, TrendingUp, ArrowRight, Loader2, ChevronDown, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import Link from "next/link";

interface Listing {
  ListingKey: string;
  slugAddress?: string;
  UnparsedAddress: string;
  City: string;
  StateOrProvince: string;
  ListPrice: number;
  BedroomsTotal: number;
  BathroomsTotalInteger: number;
  LivingArea: number;
  SubdivisionName?: string;
}

interface Community {
  type: 'subdivision' | 'city';
  name: string;
  slug: string;
  citySlug?: string;
  city?: string;
  region?: string;
  url: string;
  stats: {
    listingCount: number;
    avgPrice: number;
    medianPrice?: number;
    priceRange?: {
      min: number;
      max: number;
    };
  };
  description?: string;
}

interface Photo {
  uri800?: string;
  uri1024?: string;
  uri1280?: string;
  uriLarge?: string;
  uriThumb?: string;
}

interface CommunitySpotlightProps {
  className?: string;
}

// Large ListingCard component with photo fetching
const ListingCard: React.FC<{
  listing: Listing;
  isLight: boolean;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
}> = ({ listing, isLight, textPrimary, textSecondary, textMuted, cardBg, cardBorder }) => {
  // Use PhotoUrl from API response (server-side resolved) — no per-listing fetch needed
  const [photoUrl, setPhotoUrl] = useState<string | null>((listing as any).PhotoUrl || null);
  const [loading, setLoading] = useState(!(listing as any).PhotoUrl);

  // Only fetch if API didn't provide a photo (fallback for legacy data)
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
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <a
      href={`/mls-listings/${listing.slugAddress || listing.ListingKey}`}
      className={`rounded-xl overflow-hidden ${cardBg} ${cardBorder} border cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] block`}
    >
      {/* Large Image */}
      <div className="relative aspect-[4/3] bg-gray-200">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : photoUrl ? (
          <img
            src={photoUrl}
            alt={listing.UnparsedAddress}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <MapPin className="w-16 h-16 text-gray-400" />
          </div>
        )}
        {/* Price Badge */}
        <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full text-lg font-bold shadow-xl">
          {formatPrice(listing.ListPrice)}
        </div>
      </div>

      {/* Details */}
      <div className="p-5">
        <h3 className={`text-lg font-semibold ${textPrimary} mb-2 line-clamp-1`}>
          {listing.UnparsedAddress}
        </h3>
        <p className={`text-sm ${textSecondary} mb-4 flex items-center gap-1`}>
          <MapPin className="w-4 h-4" />
          {listing.City}, {listing.StateOrProvince}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 text-base ${textMuted}`}>
            <Bed className="w-5 h-5" />
            <span className="font-medium">{listing.BedroomsTotal || 0}</span>
          </div>
          <div className={`flex items-center gap-2 text-base ${textMuted}`}>
            <Bath className="w-5 h-5" />
            <span className="font-medium">{listing.BathroomsTotalInteger || 0}</span>
          </div>
          <div className={`flex items-center gap-2 text-base ${textMuted}`}>
            <Maximize className="w-5 h-5" />
            <span className="font-medium">{listing.LivingArea?.toLocaleString() || 0} sqft</span>
          </div>
        </div>
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
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <a
      href={`/mls-listings/${listing.slugAddress || listing.ListingKey}`}
      className={`flex gap-3 p-3 rounded-lg ${cardBg} ${cardBorder} border cursor-pointer transition-all duration-200 hover:shadow-lg block`}
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
    </a>
  );
};

const CommunitySpotlight: React.FC<CommunitySpotlightProps> = ({ className = "" }) => {
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [community, setCommunity] = useState<Community | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [allCommunities, setAllCommunities] = useState<Array<{ name: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
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
    loadCommunitySpotlight();
  }, []);

  // Reset to page 1 when switching view modes
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  // Track carousel scroll position
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const cardWidth = carousel.offsetWidth * 0.85; // 85vw
      const index = Math.round(scrollLeft / cardWidth);
      setActiveCarouselIndex(Math.min(index, listings.length - 1));
    };

    // Enable horizontal scroll with mouse wheel (for desktop testing)
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > 0) return; // Already scrolling horizontally
      e.preventDefault();
      carousel.scrollLeft += e.deltaY;
    };

    carousel.addEventListener('scroll', handleScroll);
    carousel.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      carousel.removeEventListener('scroll', handleScroll);
      carousel.removeEventListener('wheel', handleWheel);
    };
  }, [listings.length]);

  const loadCommunitySpotlight = async (communityName?: string) => {
    try {
      const url = communityName
        ? `/api/insights/community-spotlight?community=${encodeURIComponent(communityName)}`
        : "/api/insights/community-spotlight";

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCommunity(data.community);
        setAllCommunities(data.allCommunities || []);
        setListings(data.listings || []);
      }
    } catch (error) {
      console.error("Failed to load community spotlight:", error);
    } finally {
      setLoading(false);
      setIsSwitching(false);
      setShowSpinner(false);
    }
  };

  const handleCommunitySwitch = (communityName: string) => {
    setIsSwitching(true);
    setIsDropdownOpen(false); // Close dropdown after selection
    setCurrentPage(1); // Reset to first page when switching communities

    // Delay showing spinner to prevent flash on quick loads
    const spinnerTimeout = setTimeout(() => {
      if (isSwitching) {
        setShowSpinner(true);
      }
    }, 150);

    loadCommunitySpotlight(communityName).then(() => {
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

  const formatStatValue = (value: number, isCurrency = false) => {
    if (isCurrency) {
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      }
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return value.toLocaleString();
  };

  // Show loading skeleton
  if (loading) {
    return (
      <div className={`${className} mb-4 md:mb-8`}>
        <div className={`p-0 md:p-8 rounded-none md:rounded-2xl ${cardBorder} md:border md:backdrop-blur-xl relative overflow-hidden ${isLight ? 'md:bg-white/80' : 'md:bg-neutral-900/50'} ${isLight ? 'md:shadow-lg' : 'md:shadow-2xl md:shadow-black/40'} animate-pulse`}>
          {/* Skeleton Header */}
          <div className="px-4 py-3 md:px-0 md:py-0 mb-2 md:mb-6">
            <div className="flex items-start justify-between gap-3 mb-2 md:mb-4">
              <div className="flex-1">
                <div className="h-8 md:h-10 bg-gray-300 dark:bg-gray-700 rounded-lg w-3/4 mb-1 md:mb-2"></div>
                <div className="h-3 md:h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded-lg w-16"></div>
                <div className="h-8 md:h-10 bg-gray-300 dark:bg-gray-700 rounded-lg w-16 md:w-24"></div>
              </div>
            </div>
            {/* Skeleton Stats - Mobile Inline */}
            <div className="md:hidden flex gap-4">
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
            </div>
            {/* Skeleton Stats - Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`p-4 rounded-lg ${isLight ? "bg-gray-100" : "bg-neutral-800/50"}`}>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
          {/* Skeleton Listings - Mobile Carousel */}
          <div className="md:hidden">
            <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory">
              <div className="flex gap-4 px-4 pb-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex-none w-[85vw] max-w-[400px] snap-center rounded-xl overflow-hidden ${cardBg} ${cardBorder} border`}>
                    <div className="aspect-[4/3] bg-gray-300 dark:bg-gray-700"></div>
                    <div className="p-5">
                      <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                      <div className="flex gap-6">
                        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-12"></div>
                        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-12"></div>
                        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex-none w-4"></div>
              </div>
            </div>
            {/* Skeleton Indicator Dots */}
            <div className="flex justify-center gap-2 mt-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full ${i === 1 ? 'w-6' : 'w-2'} bg-gray-300 dark:bg-gray-600`}
                />
              ))}
            </div>
          </div>

          {/* Skeleton Listings - Desktop Grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`rounded-xl overflow-hidden ${cardBg} ${cardBorder} border`}>
                <div className="aspect-[4/3] bg-gray-300 dark:bg-gray-700"></div>
                <div className="p-5">
                  <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="flex gap-6">
                    <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-12"></div>
                    <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-12"></div>
                    <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
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
  if (!community || listings.length === 0) {
    return null;
  }

  return (
    <div className={`${className} mb-4 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700`}>
      <div className={`p-0 md:p-8 rounded-none md:rounded-2xl ${cardBorder} md:border md:backdrop-blur-xl relative overflow-hidden ${isLight ? 'md:bg-white/80' : 'md:bg-neutral-900/50'} ${isLight ? 'md:shadow-lg' : 'md:shadow-2xl md:shadow-black/40'}`}>
        {/* Loading Spinner Overlay - Pure CSS transition */}
        {showSpinner && (
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] rounded-2xl flex items-center justify-center z-10 transition-opacity duration-200">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Header Section */}
        <div className="px-4 py-3 md:px-0 md:py-0 mb-2 md:mb-6">
          <div className="flex items-start justify-between gap-3 mb-2 md:mb-4">
            <div className="flex-1">
              <h2 className={`text-xl md:text-4xl font-bold ${textPrimary} flex items-center gap-2 md:gap-3 mb-1 md:mb-2`}>
                {/* Hide Home icon on mobile */}
                <Home className="hidden md:block w-8 h-8 text-blue-500" />
                Real Estate in {community.name}
              </h2>
              <p className={`text-xs md:text-base ${textSecondary}`}>
                Fresh listings you haven't seen yet
                {community.city && community.type === 'subdivision' && (
                  <span className="hidden md:inline"> • {community.city}, {community.region}</span>
                )}
              </p>

              {/* Desktop: Pills */}
              {allCommunities.length > 1 && (
                <div className="hidden md:flex mt-3 items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold ${textSecondary} mr-1`}>Looking somewhere else?</span>
                  {allCommunities.map((comm) => (
                    <button
                      key={comm.name}
                      onClick={() => handleCommunitySwitch(comm.name)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                        community.name === comm.name
                          ? "bg-blue-600 text-white shadow-md"
                          : isLight
                          ? "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm border border-blue-200"
                          : "bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 hover:shadow-sm border border-blue-700/50"
                      }`}
                    >
                      {comm.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Mobile: Dropdown */}
              {allCommunities.length > 1 && (
                <div className="md:hidden mt-3 relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                      isLight
                        ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                        : "bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 border border-blue-700/50"
                    }`}
                  >
                    <span className="truncate">{community.name}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg border z-20 overflow-hidden ${
                      isLight ? "bg-white border-gray-200" : "bg-neutral-900 border-neutral-700"
                    }`}>
                      {allCommunities.map((comm) => (
                        <button
                          key={comm.name}
                          onClick={() => handleCommunitySwitch(comm.name)}
                          className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                            community.name === comm.name
                              ? "bg-blue-600 text-white"
                              : isLight
                              ? "text-gray-900 hover:bg-gray-100"
                              : "text-gray-100 hover:bg-neutral-800"
                          }`}
                        >
                          {comm.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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

              <Link
                href={community.url}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base transition-colors whitespace-nowrap ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                <span className="hidden md:inline">View All</span>
                <span className="md:hidden">View</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Stats Row - Simplified on Mobile */}
          {community.stats && (
            <>
              {/* Mobile: Inline compact stats */}
              <div className="md:hidden flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className={textMuted}>Listings:</span>
                  <span className={`font-bold ${textPrimary}`}>{formatStatValue(community.stats.listingCount)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={textMuted}>Avg:</span>
                  <span className={`font-bold ${textPrimary}`}>{formatStatValue(community.stats.avgPrice, true)}</span>
                </div>
                {community.stats.medianPrice && (
                  <div className="flex items-center gap-1">
                    <span className={textMuted}>Median:</span>
                    <span className={`font-bold ${textPrimary}`}>{formatStatValue(community.stats.medianPrice, true)}</span>
                  </div>
                )}
              </div>

              {/* Desktop: Box grid */}
              <div className="hidden md:grid md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg ${isLight ? "bg-gray-50" : "bg-neutral-800/50"}`}>
                  <div className={`text-xs ${textMuted} mb-1 uppercase tracking-wide`}>Active Listings</div>
                  <div className={`text-2xl font-bold ${textPrimary}`}>
                    {formatStatValue(community.stats.listingCount)}
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${isLight ? "bg-gray-50" : "bg-neutral-800/50"}`}>
                  <div className={`text-xs ${textMuted} mb-1 uppercase tracking-wide`}>Avg Price</div>
                  <div className={`text-2xl font-bold ${textPrimary}`}>
                    {formatStatValue(community.stats.avgPrice, true)}
                  </div>
                </div>
                {community.stats.medianPrice && (
                  <div className={`p-4 rounded-lg ${isLight ? "bg-gray-50" : "bg-neutral-800/50"}`}>
                    <div className={`text-xs ${textMuted} mb-1 uppercase tracking-wide`}>Median Price</div>
                    <div className={`text-2xl font-bold ${textPrimary}`}>
                      {formatStatValue(community.stats.medianPrice, true)}
                    </div>
                  </div>
                )}
                {community.stats.priceRange && (
                  <div className={`p-4 rounded-lg ${isLight ? "bg-gray-50" : "bg-neutral-800/50"}`}>
                    <div className={`text-xs ${textMuted} mb-1 uppercase tracking-wide`}>Price Range</div>
                    <div className={`text-lg font-bold ${textPrimary}`}>
                      {formatStatValue(community.stats.priceRange.min, true)} - {formatStatValue(community.stats.priceRange.max, true)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile Listings - Card Carousel or List View */}
        {viewMode === 'card' ? (
          <>
            {/* Card Carousel */}
            <div
              ref={carouselRef}
              className="md:hidden overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex gap-4 px-4 pb-4">
                {listings.map((listing, index) => (
                  <div
                    key={listing.ListingKey}
                    className="flex-none w-[85vw] max-w-[400px] snap-center first:ml-0"
                  >
                    <ListingCard
                      listing={listing}
                      isLight={isLight}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                      textMuted={textMuted}
                      cardBg={cardBg}
                      cardBorder={cardBorder}
                    />
                  </div>
                ))}
                {/* Spacer for the last item to show it's the end */}
                <div className="flex-none w-4"></div>
              </div>
            </div>

            {/* Carousel Indicator Dots */}
            <div className="md:hidden flex justify-center gap-2 mt-4">
              {listings.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === activeCarouselIndex ? 'w-6' : 'w-2'
                  } ${
                    index === activeCarouselIndex
                      ? isLight ? 'bg-blue-600' : 'bg-blue-400'
                      : isLight ? 'bg-gray-300' : 'bg-gray-600'
                  }`}
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

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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

export default CommunitySpotlight;
