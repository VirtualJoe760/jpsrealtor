"use client";

import { useEffect, useState } from "react";
import ListingBottomPanel from "@/app/components/mls/map/ListingBottomPanel";
import type { IUnifiedListing } from "@/models/unified-listing";

export default function TestListingPanelPage() {
  const [listing, setListing] = useState<any>(null);
  const [fullListing, setFullListing] = useState<IUnifiedListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    async function fetchListing() {
      try {
        // First, try to fetch from the specific listing slug address
        // This is the 77300 Minnesota Avenue listing from your screenshot
        const slugAddress = '77300-minnesota-avenue-palm-desert-ca-92211';

        let response = await fetch(`/api/mls-listings/${slugAddress}`);
        let firstListing = null;

        if (response.ok) {
          const data = await response.json();
          firstListing = data.listing; // Extract listing from wrapper
          console.log('[Test Page] Direct listing fetch SUCCESS:', firstListing);
        } else {
          console.log('[Test Page] Direct listing fetch failed, trying query API...');

          // Fallback to query API
          response = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subdivision: 'Palm Desert Country Club',
              minPrice: 490000,
              maxPrice: 510000,
              limit: 5
            })
          });
          const data = await response.json();
          console.log('[Test Page] Query API Response:', data);
          firstListing = data.summary?.sampleListings?.[0];
        }

        console.log('[Test Page] Final listing data:', firstListing);

        if (firstListing) {
          // Log what fields we got
          console.log('[Test Page] Fields in listing:', Object.keys(firstListing).sort());
          console.log('[Test Page] publicRemarks:', firstListing.publicRemarks);
          console.log('[Test Page] listOfficeName:', firstListing.listOfficeName);
          console.log('[Test Page] listAgentName:', firstListing.listAgentName);
          console.log('[Test Page] listAgentFullName:', firstListing.listAgentFullName);
          console.log('[Test Page] daysOnMarket:', firstListing.daysOnMarket);

          // Create listing object for panel (MapListing format)
          const mapListing = {
            _id: firstListing.listingKey,
            listingId: firstListing.listingKey,
            listingKey: firstListing.listingKey,
            slug: firstListing.slug || firstListing.listingKey,
            slugAddress: firstListing.slugAddress || firstListing.slug,
            primaryPhotoUrl: firstListing.primaryPhotoUrl || '',
            unparsedAddress: firstListing.address || firstListing.unparsedAddress,
            address: firstListing.address || firstListing.unparsedAddress,
            latitude: firstListing.latitude || 0,
            longitude: firstListing.longitude || 0,
            listPrice: firstListing.listPrice,
            bedsTotal: firstListing.bedroomsTotal || firstListing.bedsTotal,
            bathroomsTotalInteger: firstListing.bathroomsTotalInteger,
            livingArea: firstListing.livingArea,
            city: firstListing.city,
            subdivisionName: firstListing.subdivisionName,
          };

          setListing(mapListing);
          setFullListing(firstListing as IUnifiedListing);
        }
      } catch (error) {
        console.error('[Test Page] Error fetching listing:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchListing();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading listing...</div>
      </div>
    );
  }

  if (!listing || !fullListing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">No listing found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-white">
          ListingBottomPanel Test Page
        </h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 text-white">
          <h2 className="text-2xl font-semibold mb-4">Listing Data Debug</h2>

          <div className="space-y-2 text-sm font-mono">
            <div>
              <span className="text-emerald-400">Address:</span> {fullListing.unparsedAddress}
            </div>
            <div>
              <span className="text-emerald-400">Price:</span> ${fullListing.listPrice?.toLocaleString()}
            </div>
            <div>
              <span className="text-emerald-400">Days on Market:</span> {fullListing.daysOnMarket || 'N/A'}
            </div>
            <div>
              <span className="text-emerald-400">Has publicRemarks:</span> {fullListing.publicRemarks ? '✅ YES' : '❌ NO'}
            </div>
            {fullListing.publicRemarks && (
              <div>
                <span className="text-emerald-400">publicRemarks length:</span> {fullListing.publicRemarks.length} chars
              </div>
            )}
            {fullListing.publicRemarks && (
              <div>
                <span className="text-emerald-400">publicRemarks preview:</span>
                <div className="mt-2 p-3 bg-gray-700 rounded text-xs">
                  {fullListing.publicRemarks.substring(0, 200)}...
                </div>
              </div>
            )}
            <div>
              <span className="text-emerald-400">listOfficeName:</span> {fullListing.listOfficeName || 'N/A'}
            </div>
            <div>
              <span className="text-emerald-400">listAgentName:</span> {fullListing.listAgentName || 'N/A'}
            </div>
            <div>
              <span className="text-emerald-400">listAgentFullName:</span> {(fullListing as any).listAgentFullName || 'N/A'}
            </div>
            <div>
              <span className="text-emerald-400">listOfficePhone:</span> {fullListing.listOfficePhone || 'N/A'}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <details>
              <summary className="cursor-pointer text-emerald-400 mb-2">
                View All Fields ({Object.keys(fullListing).length} fields)
              </summary>
              <pre className="text-xs overflow-auto max-h-96 bg-gray-900 p-4 rounded">
                {JSON.stringify(fullListing, null, 2)}
              </pre>
            </details>
          </div>
        </div>

        <button
          onClick={() => setShowPanel(true)}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-4 rounded-lg text-lg transition-colors"
        >
          Open ListingBottomPanel
        </button>

        <div className="mt-4 text-gray-400 text-sm">
          <p>This test page:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Fetches a listing from Palm Desert Country Club via /api/query</li>
            <li>Shows all the data that's available</li>
            <li>Opens the actual ListingBottomPanel component</li>
            <li>Check browser console for detailed logs</li>
          </ul>
        </div>
      </div>

      {showPanel && listing && fullListing && (
        <ListingBottomPanel
          listing={listing}
          fullListing={fullListing}
          onClose={() => setShowPanel(false)}
          isSidebarOpen={false}
          isLeftSidebarCollapsed={false}
        />
      )}
    </div>
  );
}
