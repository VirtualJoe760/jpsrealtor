"use client";

import { useState, useEffect, useCallback } from "react";
import ListingCarousel from "./ListingCarousel";
import ListingListView from "./ListingListView";
import ChatMapView from "./ChatMapView";
import { AppreciationContainer } from "./AppreciationContainer";
import SubdivisionComparisonChart from "./SubdivisionComparisonChart";
import MarketStatsCard from "./MarketStatsCard";
import { ArticleResults } from "./ArticleCard";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { ComponentData } from "./ChatProvider";
import type { Listing } from "./ListingCarousel";
import type { MapListing } from "@/types/types";
import type { SwipeQueueHook } from "@/app/utils/map/useSwipeQueue";

interface ChatResultsContainerProps {
  components: ComponentData;
  onOpenListingPanel: (listings: any[], startIndex: number) => void;
  swipeQueue: SwipeQueueHook;
  onSetQueueMode: (isQueue: boolean) => void;
}

export default function ChatResultsContainer({
  components,
  onOpenListingPanel,
  swipeQueue,
  onSetQueueMode,
}: ChatResultsContainerProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const [listingViewMode, setListingViewMode] = useState<'carousel' | 'list'>('carousel');

  // Fetch listings for neighborhood queries
  const [neighborhoodListings, setNeighborhoodListings] = useState<Listing[]>([]);
  const [neighborhoodTotalCount, setNeighborhoodTotalCount] = useState(0);
  const [loadingNeighborhood, setLoadingNeighborhood] = useState(false);

  // Fetch listings when neighborhood component is present
  useEffect(() => {
    if (components.neighborhood) {
      console.log('[ChatResultsContainer] 🏘️ Neighborhood component detected:', components.neighborhood);
      fetchNeighborhoodListings();
    }
  }, [components.neighborhood]);

  const fetchNeighborhoodListings = async () => {
    if (!components.neighborhood) return;

    console.log('[ChatResultsContainer] 🔍 Fetching neighborhood listings for:', components.neighborhood);
    setLoadingNeighborhood(true);
    try {
      let apiUrl = "";

      // Build API URL based on neighborhood type
      if (components.neighborhood.type === "subdivision" && components.neighborhood.subdivisionSlug) {
        apiUrl = `/api/subdivisions/${components.neighborhood.subdivisionSlug}/listings`;
      } else if (components.neighborhood.type === "city" && components.neighborhood.cityId) {
        apiUrl = `/api/cities/${components.neighborhood.cityId}/listings`;
      }

      if (!apiUrl) {
        console.error("[ChatResultsContainer] ❌ No API URL for neighborhood type:", components.neighborhood.type);
        return;
      }

      console.log('[ChatResultsContainer] 🌐 Base API URL:', apiUrl);

      // Add filters to query params
      const params = new URLSearchParams();
      if (components.neighborhood.filters) {
        const f = components.neighborhood.filters;

        // Price filters
        if (f.minPrice) params.append('minPrice', f.minPrice.toString());
        if (f.maxPrice) params.append('maxPrice', f.maxPrice.toString());

        // Subdivision API uses 'beds' (exact match), City API uses 'minBeds' (range)
        if (f.beds) {
          const paramName = components.neighborhood.type === 'subdivision' ? 'beds' : 'minBeds';
          params.append(paramName, f.beds.toString());
        }
        if (f.baths) {
          const paramName = components.neighborhood.type === 'subdivision' ? 'baths' : 'minBaths';
          params.append(paramName, f.baths.toString());
        }

        // Size filters
        if (f.minSqft) params.append('minSqft', f.minSqft.toString());
        if (f.maxSqft) params.append('maxSqft', f.maxSqft.toString());
        if (f.minLotSize) params.append('minLotSize', f.minLotSize.toString());
        if (f.maxLotSize) params.append('maxLotSize', f.maxLotSize.toString());

        // Year filters
        if (f.minYear) params.append('minYear', f.minYear.toString());
        if (f.maxYear) params.append('maxYear', f.maxYear.toString());

        // Amenity filters
        if (f.pool) params.append('pool', 'true');
        if (f.spa) params.append('spa', 'true');
        if (f.view) params.append('view', 'true');
        if (f.fireplace) params.append('fireplace', 'true');
        if (f.gatedCommunity) params.append('gatedCommunity', 'true');
        if (f.seniorCommunity) params.append('seniorCommunity', 'true');

        // Garage/Stories
        if (f.garageSpaces) params.append('garageSpaces', f.garageSpaces.toString());
        if (f.stories) params.append('stories', f.stories.toString());

        // Property type
        if (f.propertyType) params.append('propertyType', f.propertyType);

        // Geographic filters
        if (f.eastOf) params.append('eastOf', f.eastOf);
        if (f.westOf) params.append('westOf', f.westOf);
        if (f.northOf) params.append('northOf', f.northOf);
        if (f.southOf) params.append('southOf', f.southOf);

        // HOA filters
        if (f.hasHOA !== undefined) params.append('hasHOA', String(f.hasHOA));
        if (f.maxHOA) params.append('maxHOA', f.maxHOA.toString());
        if (f.minHOA) params.append('minHOA', f.minHOA.toString());
      }

      const urlWithParams = params.toString() ? `${apiUrl}?${params.toString()}` : apiUrl;

      console.log('[ChatResultsContainer] 🚀 Fetching:', urlWithParams);
      const response = await fetch(urlWithParams);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const data = await response.json();
      console.log('[ChatResultsContainer] ✅ API Response:', {
        listingsCount: data.listings?.length || 0,
        total: data.pagination?.total || data.total || 0,
        stats: data.stats
      });

      // Store total count from API response (subdivision API returns pagination.total)
      const totalCount = data.pagination?.total || data.total || data.totalCount || data.stats?.totalListings || (data.listings || []).length;
      setNeighborhoodTotalCount(totalCount);

      // Transform API response to Listing format
      const listings: Listing[] = (data.listings || []).map((listing: any) => {
        const mapped = {
          // Identifiers
          id: listing.listingKey || listing.listingId || listing._id,
          listingKey: listing.listingKey,
          listingId: listing.listingId,
          _id: listing._id,

          // Carousel/List view display
          price: listing.listPrice || 0,
          beds: listing.bedroomsTotal || listing.bedsTotal || 0,
          baths: listing.bathroomsTotalDecimal || listing.bathroomsTotalInteger || 0,
          sqft: listing.livingArea || 0,
          city: listing.city || "",
          address: listing.unparsedAddress || listing.unparsedFirstLineAddress || listing.address || "",
          image: listing.primaryPhotoUrl || "/placeholder-home.jpg",
          subdivision: listing.subdivisionName || "",
          type: listing.propertyType || "",
          url: `/listings/${listing.slug || listing.slugAddress || listing.listingKey}`,
          slug: listing.slug || listing.slugAddress,
          slugAddress: listing.slugAddress || listing.slug,
          latitude: listing.latitude,
          longitude: listing.longitude,

          // Additional fields for ListingBottomPanel
          unparsedAddress: listing.unparsedAddress,
          unparsedFirstLineAddress: listing.unparsedFirstLineAddress,
          bedsTotal: listing.bedsTotal,
          bedroomsTotal: listing.bedroomsTotal,
          bathroomsTotalInteger: listing.bathroomsTotalInteger,
          bathroomsTotalDecimal: listing.bathroomsTotalDecimal,
          bathroomsFull: listing.bathroomsFull,
          bathroomsHalf: listing.bathroomsHalf,
          livingArea: listing.livingArea,
          lotSizeArea: listing.lotSizeArea,
          lotSizeSqft: listing.lotSizeSqft,
          yearBuilt: listing.yearBuilt,
          daysOnMarket: listing.daysOnMarket,
          standardStatus: listing.standardStatus,
          propertySubType: listing.propertySubType,
          subdivisionName: listing.subdivisionName,
          mlsSource: listing.mlsSource,
          landType: listing.landType,
          associationFee: listing.associationFee,
          poolYN: listing.poolYN,
          pool: listing.pool,
          spaYN: listing.spaYN,
          spa: listing.spa,
          viewYN: listing.viewYN,
          view: listing.view,
          fireplaceYN: listing.fireplaceYN,
          fireplacesTotal: listing.fireplacesTotal,
          seniorCommunityYN: listing.seniorCommunityYN,
          gatedCommunity: listing.gatedCommunity,
          garageSpaces: listing.garageSpaces,
          parkingTotal: listing.parkingTotal,
          stories: listing.stories,
          levels: listing.levels,
          publicRemarks: listing.publicRemarks,
          modificationTimestamp: listing.modificationTimestamp,
        };

        return mapped;
      });

      setNeighborhoodListings(listings);
    } catch (error) {
      console.error("[ChatResultsContainer] Error fetching neighborhood listings:", error);
      setNeighborhoodListings([]);
    } finally {
      setLoadingNeighborhood(false);
    }
  };

  // Check if we have neighborhood component
  const hasNeighborhood = !!components.neighborhood;

  // Handle opening listing panel with queue support
  const handleOpenListingPanelWithQueue = useCallback(async (listings: Listing[], startIndex: number) => {
    if (!hasNeighborhood || listings.length === 0) {
      // No neighborhood context, use original handler
      onOpenListingPanel(listings, startIndex);
      return;
    }

    // Convert Listing to MapListing for queue initialization
    const clickedListing: MapListing = {
      _id: listings[startIndex].id,
      listingId: listings[startIndex].id,
      listingKey: listings[startIndex].listingKey || listings[startIndex].id,
      slug: listings[startIndex].slug || listings[startIndex].id,
      slugAddress: listings[startIndex].slugAddress || listings[startIndex].slug || listings[startIndex].id,
      primaryPhotoUrl: listings[startIndex].image || '',
      unparsedAddress: listings[startIndex].address,
      address: listings[startIndex].address,
      latitude: listings[startIndex].latitude || 0,
      longitude: listings[startIndex].longitude || 0,
      listPrice: listings[startIndex].price,
      bedsTotal: listings[startIndex].beds,
      bathroomsTotalInteger: Math.floor(listings[startIndex].baths),
      livingArea: listings[startIndex].sqft,
      city: listings[startIndex].city,
      subdivisionName: listings[startIndex].subdivision || null,
      propertyType: listings[startIndex].type || null,
      propertySubType: listings[startIndex].propertySubType || null,
      postalCode: '',
    };

    // Build query metadata for ChatQueueStrategy
    const queryMetadata = JSON.stringify({
      neighborhoodType: components.neighborhood?.type,
      neighborhoodId: components.neighborhood?.subdivisionSlug || components.neighborhood?.cityId,
      filters: components.neighborhood?.filters || {},
    });

    // Initialize queue with neighborhood metadata passed via query parameter
    await swipeQueue.initializeQueue(clickedListing, 'ai_chat', queryMetadata);

    // Enable queue mode in parent
    onSetQueueMode(true);

    // Open the panel using the original handler (which manages the panel state)
    onOpenListingPanel(listings, startIndex);
  }, [hasNeighborhood, components.neighborhood, swipeQueue, onOpenListingPanel, onSetQueueMode]);

  // Check if we have any components to render
  const hasCarousel = components.carousel && components.carousel.listings?.length > 0;
  const hasMapView = components.mapView && !components.listView;
  const hasAppreciation = !!components.appreciation;
  const hasComparison = !!components.comparison;
  const hasMarketStats = !!components.marketStats;
  const hasArticles = components.articles && components.articles.results?.length > 0;

  // Use neighborhood listings if available
  const displayListings = hasNeighborhood ? neighborhoodListings : (components.carousel?.listings || []);
  const hasListings = displayListings.length > 0;

  // Get the total count to display (unfiltered total)
  const displayTotalCount = hasNeighborhood ? neighborhoodTotalCount : (components.carousel?.listings?.length || 0);

  // If no components, don't render anything
  if (!hasCarousel && !hasMapView && !hasAppreciation && !hasComparison && !hasMarketStats && !hasArticles && !hasNeighborhood) {
    return null;
  }

  return (
    <div className="w-full overflow-hidden px-2 xl:px-16 2xl:px-12 space-y-4">
      {/* Neighborhood or Carousel Listings with Toggle */}
      {(hasNeighborhood || hasCarousel) && (hasListings || loadingNeighborhood) && (
        <div>
          {/* Title and Toggle Pill */}
          <div className="mb-3">
            <p className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {hasNeighborhood && components.neighborhood
                ? `Homes in ${components.neighborhood.name}`
                : components.carousel?.title || "Listings"}
            </p>
            {!loadingNeighborhood && (
              <div className="flex items-center gap-3 mt-1">
                <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>
                  {displayTotalCount} {displayTotalCount === 1 ? 'property' : 'properties'}
                </p>

                {/* Pill Toggle */}
                <div className={`inline-flex rounded-full p-0.5 ${
                  isLight
                    ? 'bg-gray-200'
                    : 'bg-neutral-700'
                }`}>
                  <button
                    onClick={() => setListingViewMode('carousel')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      listingViewMode === 'carousel'
                        ? isLight
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'bg-neutral-800 text-emerald-400 shadow-md'
                        : isLight
                          ? 'text-gray-600 hover:text-gray-900'
                          : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    <span>Panels</span>
                  </button>
                  <button
                    onClick={() => setListingViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      listingViewMode === 'list'
                        ? isLight
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'bg-neutral-800 text-emerald-400 shadow-md'
                        : isLight
                          ? 'text-gray-600 hover:text-gray-900'
                          : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span>List</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Loading state */}
          {loadingNeighborhood && (
            <div className={`p-8 text-center ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mx-auto mb-2"></div>
              <p>Loading listings...</p>
            </div>
          )}

          {/* No results state with filter suggestion */}
          {!loadingNeighborhood && !hasListings && hasNeighborhood && (
            <div className={`p-8 rounded-lg text-center ${
              isLight
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-neutral-800/50 border border-neutral-700'
            }`}>
              <svg
                className={`w-16 h-16 mx-auto mb-4 ${isLight ? 'text-blue-300' : 'text-neutral-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className={`text-lg font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                No listings found
              </h3>
              <p className={`text-sm mb-4 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>
                We couldn't find any properties matching all your criteria in {components.neighborhood?.name}.
              </p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                isLight
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-neutral-700 text-emerald-400'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">
                  Try expanding your search filters (e.g., broader price range, fewer amenities)
                </span>
              </div>
            </div>
          )}

          {/* Render based on view mode */}
          {!loadingNeighborhood && hasListings && (
            <>
              {listingViewMode === 'carousel' ? (
                <ListingCarousel
                  listings={displayListings}
                  title="" // Don't show title in carousel since we show it above
                  onOpenPanel={handleOpenListingPanelWithQueue}
                />
              ) : (
                <ListingListView
                  listings={displayListings}
                  title="" // Don't show title in list view since we show it above
                  totalCount={displayListings.length}
                  hasMore={false}
                  onOpenPanel={handleOpenListingPanelWithQueue}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Map View */}
      {(hasMapView || hasNeighborhood) && hasListings && (
        <ChatMapView
          listings={displayListings}
        />
      )}

      {/* Appreciation Card */}
      {hasAppreciation && (() => {
        const loc = components.appreciation.location;
        const locationName = loc?.city || loc?.subdivision || loc?.county || "Unknown Location";
        const locationType = loc?.city ? "city" : loc?.subdivision ? "subdivision" : loc?.county ? "county" : "region";

        return (
          <AppreciationContainer
            location={locationName}
            locationType={locationType as any}
            period={(components.appreciation.period as any) || "5y"}
          />
        );
      })()}

      {/* Subdivision Comparison Chart */}
      {hasComparison && (
        <SubdivisionComparisonChart
          items={components.comparison.items}
          title={components.comparison.title || "Comparison"}
        />
      )}

      {/* Market Stats Card */}
      {hasMarketStats && (
        <MarketStatsCard {...components.marketStats} />
      )}

      {/* Article Results */}
      {hasArticles && (
        <ArticleResults
          results={components.articles.results}
          query={components.articles.query || ""}
        />
      )}
    </div>
  );
}
