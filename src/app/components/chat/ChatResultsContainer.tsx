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
  const { isLight } = useTheme();
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
          {/* Toggle View Mode Button */}
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setListingViewMode(listingViewMode === 'carousel' ? 'list' : 'carousel')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isLight
                  ? 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 shadow-sm'
                  : 'bg-neutral-800 text-emerald-400 hover:bg-neutral-700 border border-neutral-600 shadow-md'
              }`}
            >
              {listingViewMode === 'carousel' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span>List View</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  <span>Carousel View</span>
                </>
              )}
            </button>
          </div>

          {/* Render based on view mode */}
          {listingViewMode === 'carousel' ? (
            <ListingCarousel
              listings={components.carousel.listings}
              title={components.carousel.title}
              onOpenPanel={onOpenListingPanel}
            />
          ) : (
            <ListingListView
              listings={components.carousel.listings}
              title={components.carousel.title}
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
