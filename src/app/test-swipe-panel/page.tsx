"use client";

import { useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import ListingBottomPanel from "@/app/components/mls/map/ListingBottomPanel";
import type { MapListing } from "@/types/types";
import type { IUnifiedListing } from "@/models/unified-listing";

// Sample listing data for testing
const sampleListing: MapListing = {
  _id: "test-listing-1",
  listingKey: "test-listing-1",
  slug: "77145-minnesota-avenue-palm-desert-ca-92211",
  slugAddress: "77145-minnesota-avenue-palm-desert-ca-92211",
  primaryPhotoUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
  unparsedAddress: "77145 Minnesota Avenue, Palm Desert, CA 92211",
  address: "77145 Minnesota Avenue",
  latitude: 33.7361,
  longitude: -116.3739,
  listPrice: 725000,
  bedsTotal: 3,
  bathroomsTotalInteger: 2,
  livingArea: 1850,
  city: "Palm Desert",
  subdivisionName: "Palm Desert Country Club",
  propertyType: "A",
  propertySubType: "Single Family Residence",
  postalCode: "92211",
};

const fullListing: IUnifiedListing = {
  ...sampleListing,
  publicRemarks: "Beautiful single-family home in the desirable Palm Desert Country Club community. This well-maintained property features 3 bedrooms, 2 bathrooms, and 1,850 square feet of living space. The open floor plan is perfect for entertaining, with a spacious living room that flows into the dining area and kitchen. The master suite offers a private retreat with an en-suite bathroom. The backyard is an oasis with a sparkling pool and plenty of space for outdoor dining. This home is located in a quiet neighborhood with easy access to shopping, dining, and golf courses.",
  listOfficeName: "Desert Sotheby's International Realty",
  listAgentFullName: "John Smith",
  daysOnMarket: 14,
  yearBuilt: 1985,
  lotSizeArea: 7200,
  garageSpaces: 2,
  standardStatus: "Active",
} as IUnifiedListing;

export default function TestSwipePanelPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [showPanel, setShowPanel] = useState(false);
  const [context, setContext] = useState<"map" | "chat" | "dashboard" | "insights">("map");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);

  const handleSwipeLeft = () => {
    console.log("[Test] Swiped left (disliked)");
    alert("Swiped Left (Disliked)!");
  };

  const handleSwipeRight = () => {
    console.log("[Test] Swiped right (liked)");
    alert("Swiped Right (Liked)!");
  };

  const handleClose = () => {
    setShowPanel(false);
  };

  return (
    <div className={`min-h-screen p-8 ${
      isLight
        ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-800'
    }`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            SwipePanel Test Page
          </h1>
          <p className={`text-lg ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            Test ListingBottomPanel (soon to be SwipePanel) across different contexts
          </p>
        </div>

        {/* Controls */}
        <div className={`p-6 rounded-xl mb-6 ${
          isLight
            ? 'bg-white shadow-lg border border-gray-200'
            : 'bg-gray-800 border border-gray-700'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            Test Controls
          </h2>

          {/* Context Selection */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Context:
            </label>
            <div className="flex gap-2 flex-wrap">
              {(['map', 'chat', 'dashboard', 'insights'] as const).map((ctx) => (
                <button
                  key={ctx}
                  onClick={() => setContext(ctx)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    context === ctx
                      ? isLight
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-emerald-500 text-black shadow-md'
                      : isLight
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {ctx.charAt(0).toUpperCase() + ctx.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="mb-4 flex gap-4 flex-wrap">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sidebarOpen}
                onChange={(e) => setSidebarOpen(e.target.checked)}
                className="w-4 h-4"
              />
              <span className={`text-sm ${
                isLight ? 'text-gray-700' : 'text-gray-300'
              }`}>
                Right Sidebar Open
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={leftSidebarCollapsed}
                onChange={(e) => setLeftSidebarCollapsed(e.target.checked)}
                className="w-4 h-4"
              />
              <span className={`text-sm ${
                isLight ? 'text-gray-700' : 'text-gray-300'
              }`}>
                Left Sidebar Collapsed
              </span>
            </label>
          </div>

          {/* Open Panel Button */}
          <button
            onClick={() => setShowPanel(true)}
            className={`px-6 py-3 rounded-lg font-semibold text-lg transition-all ${
              isLight
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg hover:shadow-xl'
            }`}
          >
            Open Swipe Panel
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Settings */}
          <div className={`p-6 rounded-xl ${
            isLight
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-gray-800 border border-gray-700'
          }`}>
            <h3 className={`text-lg font-semibold mb-3 ${
              isLight ? 'text-blue-900' : 'text-emerald-400'
            }`}>
              Current Settings
            </h3>
            <div className={`space-y-2 text-sm ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}>
              <p><strong>Context:</strong> {context}</p>
              <p><strong>Right Sidebar:</strong> {sidebarOpen ? 'Open' : 'Closed'}</p>
              <p><strong>Left Sidebar:</strong> {leftSidebarCollapsed ? 'Collapsed' : 'Expanded'}</p>
              <p><strong>Panel Visible:</strong> {showPanel ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Sample Listing Info */}
          <div className={`p-6 rounded-xl ${
            isLight
              ? 'bg-purple-50 border border-purple-200'
              : 'bg-gray-800 border border-gray-700'
          }`}>
            <h3 className={`text-lg font-semibold mb-3 ${
              isLight ? 'text-purple-900' : 'text-emerald-400'
            }`}>
              Sample Listing
            </h3>
            <div className={`space-y-2 text-sm ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}>
              <p><strong>Address:</strong> {sampleListing.unparsedAddress}</p>
              <p><strong>Price:</strong> ${sampleListing.listPrice?.toLocaleString()}</p>
              <p><strong>Beds:</strong> {sampleListing.bedsTotal} | <strong>Baths:</strong> {sampleListing.bathroomsTotalInteger}</p>
              <p><strong>SqFt:</strong> {sampleListing.livingArea?.toLocaleString()}</p>
              <p><strong>Subdivision:</strong> {sampleListing.subdivisionName}</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className={`mt-6 p-6 rounded-xl ${
          isLight
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-gray-800 border border-yellow-900'
        }`}>
          <h3 className={`text-lg font-semibold mb-3 ${
            isLight ? 'text-yellow-900' : 'text-yellow-400'
          }`}>
            Testing Instructions
          </h3>
          <ul className={`space-y-2 text-sm ${
            isLight ? 'text-gray-700' : 'text-gray-300'
          }`}>
            <li>• Select a context to test different use cases</li>
            <li>• Toggle sidebars to see how panel layout adapts</li>
            <li>• Open the panel and try swiping left/right (drag or use buttons)</li>
            <li>• Verify panel centers correctly on all screen sizes</li>
            <li>• Test responsiveness by resizing browser window</li>
            <li>• Check both light and dark themes</li>
          </ul>
        </div>
      </div>

      {/* Render ListingBottomPanel */}
      {showPanel && (
        <ListingBottomPanel
          listing={sampleListing}
          fullListing={fullListing}
          onClose={handleClose}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          isSidebarOpen={sidebarOpen}
          isLeftSidebarCollapsed={leftSidebarCollapsed}
          isDisliked={false}
        />
      )}
    </div>
  );
}
