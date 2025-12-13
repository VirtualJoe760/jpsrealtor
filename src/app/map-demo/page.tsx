"use client";

import { useState } from "react";
import { useMapControl } from "@/app/hooks/useMapControl";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

/**
 * Map Background Demo Page
 *
 * Test page to demonstrate the map background functionality.
 * This shows how chat or other components can control the map.
 */
export default function MapDemoPage() {
  const {
    showMapAtLocation,
    hideMap,
    setOpacity,
    showMapWithListings,
    toggleMapInteraction,
    isMapInteractive
  } = useMapControl();
  const { cardBg, cardBorder, textPrimary, textSecondary, buttonPrimary } = useThemeClasses();
  const [currentOpacity, setCurrentOpacity] = useState(0.8);

  // Sample locations in Coachella Valley
  const locations = [
    { name: "Palm Desert", lat: 33.8303, lng: -116.5453, zoom: 12 },
    { name: "Indian Wells", lat: 33.7206, lng: -116.3403, zoom: 13 },
    { name: "La Quinta", lat: 33.6633, lng: -116.3100, zoom: 12 },
    { name: "Rancho Mirage", lat: 33.7397, lng: -116.4128, zoom: 13 },
    { name: "Palm Springs", lat: 33.8303, lng: -116.5453, zoom: 12 },
    { name: "California (Full State)", lat: 37.0, lng: -119.5, zoom: 5.5 },
  ];

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setCurrentOpacity(value);
    setOpacity(value);
  };

  return (
    <div className="min-h-screen p-8" style={{ pointerEvents: isMapInteractive ? 'none' : 'auto' }}>
      <div className="max-w-4xl mx-auto space-y-6" style={{ pointerEvents: 'auto' }}>
        {/* Header */}
        <div className={`${cardBg} ${cardBorder} border rounded-xl p-6`}>
          <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>
            Map Background Demo
          </h1>
          <p className={textSecondary}>
            Test the map background functionality. Click locations to see the map
            render as a background layer behind this content.
          </p>
        </div>

        {/* Controls */}
        <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 space-y-4`}>
          <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>
            Map Controls
          </h2>

          {/* Location Buttons */}
          <div>
            <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
              Show Map at Location:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {locations.map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => showMapAtLocation(loc.lat, loc.lng, loc.zoom)}
                  className={`${buttonPrimary} px-4 py-2 rounded-lg text-sm font-medium transition-all`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity Slider */}
          <div>
            <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
              Map Opacity: {currentOpacity.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={currentOpacity}
              onChange={handleOpacityChange}
              className="w-full"
            />
            <p className={`text-xs ${textSecondary} mt-1`}>
              Lower opacity makes content more readable, higher opacity shows map more clearly
            </p>
          </div>

          {/* Map Interaction Toggle */}
          <div>
            <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
              Map Interaction Mode: {isMapInteractive ? 'Enabled ✅' : 'Disabled ❌'}
            </label>
            <button
              onClick={toggleMapInteraction}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                isMapInteractive
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
            >
              {isMapInteractive ? 'Disable Map Interaction' : 'Enable Map Interaction'}
            </button>
            <p className={`text-xs ${textSecondary} mt-2`}>
              {isMapInteractive
                ? '🗺️ You can now drag, zoom, and interact with the map'
                : '🖱️ Content is clickable, map is in the background'}
            </p>
          </div>

          {/* Hide Map Button */}
          <button
            onClick={hideMap}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all"
          >
            Hide Map
          </button>
        </div>

        {/* Info Card */}
        <div className={`${cardBg} ${cardBorder} border rounded-xl p-6`}>
          <h2 className={`text-xl font-semibold ${textPrimary} mb-3`}>
            How It Works
          </h2>
          <ul className={`space-y-2 ${textSecondary}`}>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                The map renders as a <strong>fixed background layer</strong> (z-index: 1)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Page content sits <strong>above the map</strong> (z-index: 10) with pointer-events enabled
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                The map can be controlled from <strong>anywhere in the app</strong> via useMapControl() hook
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Opacity is adjustable to balance <strong>map visibility vs content readability</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Perfect for <strong>chat integration</strong> - chat can show listings on the map without page navigation
              </span>
            </li>
          </ul>
        </div>

        {/* Usage Example */}
        <div className={`${cardBg} ${cardBorder} border rounded-xl p-6`}>
          <h2 className={`text-xl font-semibold ${textPrimary} mb-3`}>
            Usage Example (Chat Integration)
          </h2>
          <pre className={`${textSecondary} text-sm bg-black/20 p-4 rounded-lg overflow-x-auto`}>
            {`// In your chat component:
import { useMapControl } from "@/app/hooks/useMapControl";

const { showMapWithListings, showMapAtLocation } = useMapControl();

// When AI finds homes in Palm Desert:
showMapWithListings(listings, {
  centerLat: 33.8303,
  centerLng: -116.5453,
  zoom: 12
});

// When user asks about a city:
showMapAtLocation(33.8303, -116.5453, 13);`}
          </pre>
        </div>
      </div>
    </div>
  );
}
