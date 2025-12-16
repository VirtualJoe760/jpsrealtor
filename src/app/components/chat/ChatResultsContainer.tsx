"use client";

import { useState } from "react";
import ListingCarousel from "./ListingCarousel";
import ListingListView from "./ListingListView";
import ChatMapView from "./ChatMapView";
import { AppreciationCard } from "../analytics/AppreciationCard";
import SubdivisionComparisonChart from "./SubdivisionComparisonChart";
import MarketStatsCard from "./MarketStatsCard";
import { ArticleResults } from "./ArticleCard";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { ComponentData } from "./ChatProvider";

interface ChatResultsContainerProps {
  components: ComponentData;
  onOpenListingPanel: (listings: any[], startIndex: number) => void;
}

export default function ChatResultsContainer({
  components,
  onOpenListingPanel,
}: ChatResultsContainerProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const [listingViewMode, setListingViewMode] = useState<'carousel' | 'list'>('carousel');

  // Check if we have any components to render
  const hasCarousel = components.carousel && components.carousel.listings?.length > 0;
  const hasMapView = components.mapView && !components.listView;
  const hasAppreciation = !!components.appreciation;
  const hasComparison = !!components.comparison;
  const hasMarketStats = !!components.marketStats;
  const hasArticles = components.articles && components.articles.results?.length > 0;

  // If no components, don't render anything
  if (!hasCarousel && !hasMapView && !hasAppreciation && !hasComparison && !hasMarketStats && !hasArticles) {
    return null;
  }

  return (
    <div className="w-full overflow-hidden px-2 xl:px-16 2xl:px-12 space-y-4">
      {/* Listing Carousel or List View with Toggle */}
      {hasCarousel && (
        <div>
          {/* Title and Toggle Pill */}
          {components.carousel.title && (
            <div className="mb-3">
              <p className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {components.carousel.title}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>
                  {components.carousel.listings.length} properties found
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
            </div>
          )}

          {/* Render based on view mode */}
          {listingViewMode === 'carousel' ? (
            <ListingCarousel
              listings={components.carousel.listings}
              title="" // Don't show title in carousel since we show it above
              onOpenPanel={onOpenListingPanel}
            />
          ) : (
            <ListingListView
              listings={components.carousel.listings}
              title="" // Don't show title in list view since we show it above
              totalCount={components.carousel.listings.length}
              hasMore={false}
              onOpenPanel={onOpenListingPanel}
            />
          )}
        </div>
      )}

      {/* Map View */}
      {hasMapView && (
        <ChatMapView
          listings={components.carousel?.listings || components.mapView.listings || []}
        />
      )}

      {/* Appreciation Card */}
      {hasAppreciation && (
        <AppreciationCard data={components.appreciation} />
      )}

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
