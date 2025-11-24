#!/usr/bin/env python3
with open('src/app/test/page.tsx', 'w', encoding='utf-8') as f:
    f.write('''// src/app/test/page.tsx
"use client";
import React, { useState, useEffect, Suspense } from "react";
export const dynamic = 'force-dynamic';
import ListingCarousel, { type Listing } from "@/app/components/chat/ListingCarousel";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import { EnhancedChatProvider } from "@/app/components/chat/EnhancedChatProvider";
import { MLSProvider } from "@/app/components/mls/MLSProvider";

export default function TestPage() {
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minBeds, setMinBeds] = useState(0);
  const [minBaths, setMinBaths] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000000);
  const [minPrice, setMinPrice] = useState(0);

  useEffect(() => {
    async function fetchListings() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/subdivisions/palm-desert-country-club/listings');
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const listings: Listing[] = data.listings.map((listing: any) => ({
          id: listing.ListingId,
          price: listing.ListPrice || 0,
          beds: listing.BedroomsTotal || 0,
          baths: listing.BathroomsTotalDecimal || 0,
          sqft: listing.LivingArea || 0,
          city: listing.City || '',
          address: `${listing.StreetNumber || ''} ${listing.StreetName || ''}, ${listing.City || ''}, ${listing.StateOrProvince || ''} ${listing.PostalCode || ''}`.trim(),
          image: listing.Media?.[0]?.MediaURL || '',
          subdivision: listing.SubdivisionName || '',
          type: listing.PropertyType || '',
          url: `/mls-listings/${listing.slugAddress || ''}`,
          latitude: listing.Latitude || 0,
          longitude: listing.Longitude || 0,
          slug: listing.slug || '',
          slugAddress: listing.slugAddress || '',
        }));
        setAllListings(listings);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch listings');
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  const filteredListings = allListings.filter(listing => {
    if (minBeds > 0 && listing.beds < minBeds) return false;
    if (minBaths > 0 && listing.baths < minBaths) return false;
    if (listing.price < minPrice) return false;
    if (listing.price > maxPrice) return false;
    return true;
  });

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading...</div>}>
      <MLSProvider><ChatProvider><EnhancedChatProvider>
        <div className="min-h-screen bg-gray-950 text-white">
          <div className="border-b border-gray-800 bg-gray-900">
            <div className="container mx-auto px-6 py-8">
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Test Page - Client-Side Filtering
              </h1>
              <p className="text-gray-400">Live API data with client-side filtering</p>
            </div>
          </div>
          <div className="border-b border-gray-800 bg-gray-900/50">
            <div className="container mx-auto px-6 py-6">
              <h3 className="text-lg font-bold mb-4 text-white">Filters</h3>
              {loading && <div className="text-blue-400 text-sm mb-4">Loading...</div>}
              {error && <div className="text-red-400 text-sm mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded">Error: {error}</div>}
              {!loading && !error && (
                <div className="mb-4 p-3 bg-green-900/20 border border-green-700/30 rounded">
                  <p className="text-green-400 text-sm font-semibold">Loaded {allListings.length} total listings</p>
                  <p className="text-gray-400 text-xs mt-1">Filtered: {filteredListings.length} properties</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Min Beds: {minBeds === 0 ? 'Any' : minBeds}
                  </label>
                  <input type="range" min="0" max="6" value={minBeds}
                    onChange={(e) => setMinBeds(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Min Baths: {minBaths === 0 ? 'Any' : minBaths}
                  </label>
                  <input type="range" min="0" max="5" step="0.5" value={minBaths}
                    onChange={(e) => setMinBaths(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Min Price: ${(minPrice / 1000).toFixed(0)}k
                  </label>
                  <input type="range" min="0" max="2000000" step="50000" value={minPrice}
                    onChange={(e) => setMinPrice(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Price: ${maxPrice === 10000000 ? 'No Limit' : `${(maxPrice / 1000).toFixed(0)}k`}
                  </label>
                  <input type="range" min="100000" max="10000000" step="50000" value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>
              <div className="mt-4">
                <button onClick={() => { setMinBeds(0); setMinBaths(0); setMinPrice(0); setMaxPrice(10000000); }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
          <div className="container mx-auto px-6 py-8">
            <div className="mb-12">
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-1">Filtered Listings</h2>
                <p className="text-gray-400 text-sm">Showing {filteredListings.length} of {allListings.length}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                {filteredListings.length > 0 ? (
                  <ListingCarousel listings={filteredListings} title={`${filteredListings.length} properties`} />
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-lg mb-2">No properties match</p>
                    <p className="text-sm">Try adjusting filters</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </EnhancedChatProvider></ChatProvider></MLSProvider>
    </Suspense>
  );
}
''')
print("Done!")
