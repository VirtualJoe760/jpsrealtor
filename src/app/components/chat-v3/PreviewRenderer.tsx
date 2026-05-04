"use client";

// src/app/components/chat-v3/PreviewRenderer.tsx
//
// Renders a Layer 1 PreviewResult into the right production component,
// matching what /test-chat does in its inline ComponentPreview function.
// Both /test-chat and /chat-v3 use this so the component-rendering logic
// lives in one place.

import CMAReport from "@/app/components/cma/CMAReport";
import SubdivisionCmaSection from "@/app/components/cma/subdivision/SubdivisionCmaSection";
import { AppreciationContainer } from "@/app/components/chat/AppreciationContainer";
import ListingDetailCard from "@/app/components/chat/ListingDetailCard";
import ListingCarousel, {
  type Listing as CarouselListing,
} from "@/app/components/chat/ListingCarousel";
import ListingListView from "@/app/components/chat/ListingListView";
import { ArticleResults } from "@/app/components/chat/ArticleCard";
import type {
  PreviewResult,
  PreviewListing,
  PreviewStats,
} from "@/lib/chat-search/types";

// ---------------------------------------------------------------------------
// Adapter: PreviewListing → ListingCarousel/ListingListView Listing shape
// ---------------------------------------------------------------------------

function toCarouselListing(l: PreviewListing): CarouselListing {
  return {
    id: l.listingKey,
    listingKey: l.listingKey,
    listingId: l.listingKey,
    price: l.price ?? 0,
    beds: l.beds ?? 0,
    baths: l.baths ?? 0,
    sqft: l.sqft ?? 0,
    city: l.city ?? "",
    address: l.address ?? "",
    image: l.primaryPhotoUrl,
    subdivision: l.subdivision,
    slug: l.slugAddress,
    slugAddress: l.slugAddress,
    url: `/mls-listings/${l.slugAddress || l.listingKey}`,
    daysOnMarket: l.daysOnMarket,
    standardStatus: l.standardStatus,
    propertySubType: l.propertySubType,
    yearBuilt: l.yearBuilt,
    lotSizeSqft: l.lotSize,
    associationFee: l.associationFee,
  };
}

// ---------------------------------------------------------------------------
// StatsCard — same as the one in test-chat. Kept here so /chat-v3 can render
// areaStats / compare without depending on the sandbox file.
// ---------------------------------------------------------------------------

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function StatsCard({
  stats,
  scope,
  propertyType,
}: {
  stats: PreviewStats;
  scope?: { type: string; value: string };
  propertyType?: string;
}) {
  if (!stats || stats.totalListings === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
        No listings matched.
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {scope && (
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          {scope.type} · {scope.value}
          {propertyType && propertyType !== "A" && ` · type ${propertyType}`}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCell label="Total" value={stats.totalListings.toLocaleString()} />
        <StatCell label="New (7d)" value={stats.newListingsCount.toString()} />
        <StatCell label="Avg" value={`$${stats.avgPrice.toLocaleString()}`} />
        <StatCell label="Median" value={`$${stats.medianPrice.toLocaleString()}`} />
        <StatCell
          label="Range"
          value={`$${stats.priceRange.min.toLocaleString()}–$${stats.priceRange.max.toLocaleString()}`}
        />
        {stats.medianPricePerSqft > 0 && (
          <StatCell
            label="Median $/sqft"
            value={`$${stats.medianPricePerSqft.toLocaleString()}`}
          />
        )}
      </div>
      {stats.hoa && (
        <div className="text-xs text-gray-600 mt-3">
          <strong>HOA</strong> ({stats.hoa.count} listings):{" "}
          ${stats.hoa.min.toLocaleString()}–${stats.hoa.max.toLocaleString()}/mo · avg $
          {stats.hoa.avg.toLocaleString()}
        </div>
      )}
      {stats.amenities && (
        <div className="text-xs text-gray-600 mt-1">
          <strong>Amenities</strong>:{" "}
          {[
            stats.amenities.poolPct && `${stats.amenities.poolPct}% pool`,
            stats.amenities.spaPct && `${stats.amenities.spaPct}% spa`,
            stats.amenities.viewPct && `${stats.amenities.viewPct}% view`,
            stats.amenities.gatedPct && `${stats.amenities.gatedPct}% gated`,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </div>
      )}
      {stats.propertyTypes && stats.propertyTypes.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
            Property type breakdown
          </div>
          <table className="w-full text-xs">
            <tbody>
              {stats.propertyTypes.slice(0, 6).map((p) => (
                <tr key={p.subType} className="border-t border-gray-100">
                  <td className="py-1 text-gray-700">{p.subType}</td>
                  <td className="py-1 text-right text-gray-600">{p.count}</td>
                  <td className="py-1 text-right text-gray-600">
                    ${p.avgPrice.toLocaleString()}
                  </td>
                  <td className="py-1 text-right text-gray-500">
                    ${p.avgPricePerSqft || 0}/sqft
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PreviewRenderer — main export
// ---------------------------------------------------------------------------

export default function PreviewRenderer({
  preview,
}: {
  preview: PreviewResult | null;
}) {
  if (!preview) return null;
  if (preview.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
        {preview.error}
      </div>
    );
  }
  if (preview.reason && !preview.component) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
        {preview.reason}
      </div>
    );
  }

  // listingDetail → ListingDetailCard
  if (preview.component === "listingDetail") {
    if (!preview.listing) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
          {preview.reason || "No matching listing found."}
        </div>
      );
    }
    const l = preview.listing;
    return (
      <ListingDetailCard
        listingKey={l.listingKey}
        slugAddress={l.slugAddress || l.listingKey}
        address={l.address}
        primaryPhotoUrl={l.primaryPhotoUrl}
        city={l.city}
        subdivision={l.subdivision}
        price={l.price}
        status={l.standardStatus}
        beds={l.beds}
        baths={l.baths}
        sqft={l.sqft}
        lotSizeSqft={l.lotSize}
        yearBuilt={l.yearBuilt}
        propertySubType={l.propertySubType}
        hoaFee={l.associationFee}
        daysOnMarket={l.daysOnMarket}
      />
    );
  }

  // neighborhood / areaStats → stats + carousel
  if (preview.component === "neighborhood" || preview.component === "areaStats") {
    return (
      <div className="space-y-4">
        {preview.stats && (
          <StatsCard
            stats={preview.stats}
            scope={preview.scope}
            propertyType={preview.propertyType}
          />
        )}
        {preview.listings && preview.listings.length > 0 && (
          <ListingCarousel
            listings={preview.listings.map(toCarouselListing)}
            title={`Top ${preview.listings.length} listings · ${preview.scope?.value || ""}`}
          />
        )}
      </div>
    );
  }

  // listingResults → ListingListView
  if (preview.component === "listingResults") {
    return (
      <ListingListView
        listings={(preview.listings || []).map(toCarouselListing)}
        title={`${preview.totalCount ?? 0} listings`}
        totalCount={preview.totalCount}
        hasMore={Boolean(
          preview.totalCount &&
            preview.listings &&
            preview.listings.length < preview.totalCount
        )}
      />
    );
  }

  // compare → side-by-side StatsCards
  if (preview.component === "compare") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {preview.a && (
          <StatsCard stats={preview.a.stats} scope={(preview as any).a.scope} />
        )}
        {preview.b && (
          <StatsCard stats={preview.b.stats} scope={(preview as any).b.scope} />
        )}
      </div>
    );
  }

  // trend → AppreciationContainer
  if (preview.component === "trend") {
    if (preview.reason && !preview.locationName) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
          {preview.reason}
        </div>
      );
    }
    if (!preview.locationName || !preview.locationType) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
          {preview.reason || "No trend data available — entity scope missing."}
        </div>
      );
    }
    return (
      <AppreciationContainer
        location={preview.locationName}
        locationType={preview.locationType as any}
        period={(preview.period as any) || "5y"}
      />
    );
  }

  // cma → CMAReport (listing) or SubdivisionCmaSection (subdivision)
  if (preview.component === "cma") {
    if (preview.cmaScope === "listing") {
      if (!preview.listingKey) {
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
            {preview.reason || "No listing resolved for CMA."}
          </div>
        );
      }
      return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {!preview.hasPrebuilt && preview.reason && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-3 py-2 text-xs text-yellow-800">
              {preview.reason}
            </div>
          )}
          <CMAReport
            listingKey={preview.listingKey}
            subdivisionName={preview.subdivisionName}
            result={preview.cma || undefined}
          />
        </div>
      );
    }
    if (preview.cmaScope === "subdivision") {
      if (!preview.slug) {
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
            {preview.reason || "No subdivision slug for CMA."}
          </div>
        );
      }
      return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <SubdivisionCmaSection slug={preview.slug} />
        </div>
      );
    }
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
        {preview.reason || "CMA scope unclear."}
      </div>
    );
  }

  // articles → ArticleResults
  if (preview.component === "articles") {
    if (!preview.articles || preview.articles.length === 0) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
          No matching articles found{preview.query ? ` for "${preview.query}"` : ""}.
        </div>
      );
    }
    return (
      <ArticleResults
        results={preview.articles.map((a, i) => ({
          _id: a.slug || `article-${i}`,
          title: a.title,
          slug: a.slug || "",
          excerpt: a.excerpt || "",
          category: a.category || "",
          publishedAt: new Date().toISOString(),
        }))}
        query={preview.query || ""}
      />
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-600">
      Component <code className="font-mono">{preview.component}</code> not yet wired.
    </div>
  );
}
