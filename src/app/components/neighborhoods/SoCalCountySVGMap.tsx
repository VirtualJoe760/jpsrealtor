"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";
import { countyBoundaries } from "./countyBoundaries";
import { useTheme } from "@/app/contexts/ThemeContext";

export default function SoCalCountySVGMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [hoveredCounty, setHoveredCounty] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<{name: string, slug: string, listings: string, medianPrice: string, id: number} | null>(null);
  const selectedFeatureIdRef = useRef<number | null>(null);
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Calculate bounds from our GeoJSON data
    const calculateBounds = () => {
      let minLng = Infinity, maxLng = -Infinity;
      let minLat = Infinity, maxLat = -Infinity;

      countyBoundaries.features.forEach(feature => {
        if (feature.geometry.type === "Polygon" && feature.geometry.coordinates[0]) {
          feature.geometry.coordinates[0].forEach(coord => {
            const [lng, lat] = coord;
            if (typeof lng === 'number' && typeof lat === 'number') {
              minLng = Math.min(minLng, lng);
              maxLng = Math.max(maxLng, lng);
              minLat = Math.min(minLat, lat);
              maxLat = Math.max(maxLat, lat);
            }
          });
        }
      });

      return [
        [minLng, minLat], // Southwest
        [maxLng, maxLat]  // Northeast
      ] as [[number, number], [number, number]];
    };

    const bounds = calculateBounds();

    // Calculate responsive padding based on screen size
    const getResponsivePadding = () => {
      const width = window.innerWidth;
      if (width < 640) { // Mobile
        return { top: 120, bottom: 80, left: 20, right: 20 };
      } else if (width < 768) { // Tablet
        return { top: 140, bottom: 100, left: 40, right: 120 };
      } else if (width < 1024) { // Small desktop
        return { top: 150, bottom: 110, left: 60, right: 200 };
      } else { // Large desktop
        return { top: 180, bottom: 120, left: 80, right: 280 };
      }
    };

    // Initialize map with locked view and responsive padding
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: isLight
        ? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"  // Light mode
        : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json", // Dark mode
      bounds: bounds,
      fitBoundsOptions: {
        padding: getResponsivePadding()
      },
      dragPan: false, // Completely disable panning
      scrollZoom: false, // Disable scroll zoom
      doubleClickZoom: false, // Disable double click zoom
      touchZoomRotate: false, // Disable touch zoom
      boxZoom: false, // Disable box zoom
      keyboard: false, // Disable keyboard navigation
      dragRotate: false, // Disable rotation
    });

    // Navigation control removed - map is locked to this view

    map.current.on("load", () => {
      if (!map.current) return;

      // Add GeoJSON source with our county boundaries
      map.current.addSource("socal-counties", {
        type: "geojson",
        data: countyBoundaries as any,
      });

      // Add county fill layer with hover and selected effects
      map.current.addLayer({
        id: "county-fills",
        type: "fill",
        source: "socal-counties",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#f59e0b", // Yellow/amber for selected
            "#2563eb"  // Blue for normal
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.75, // Higher opacity for selected
            ["boolean", ["feature-state", "hover"], false],
            0.65, // Medium opacity for hover
            0.45  // Normal opacity
          ],
        },
      });

      // Add BRIGHT county border layer - responsive width
      map.current.addLayer({
        id: "county-borders",
        type: "line",
        source: "socal-counties",
        paint: {
          "line-color": "#60a5fa",
          "line-width": window.innerWidth < 640 ? 3 : window.innerWidth < 1024 ? 4 : 5,
          "line-opacity": 1.0,
        },
      });

      // Add labels for our SoCal counties - responsive text size and name
      const isMobile = window.innerWidth < 640;
      const isTablet = window.innerWidth < 1024;
      const labelSize = isMobile ? 11 : isTablet ? 15 : 18;
      const labelField = isMobile ? ["upcase", ["get", "shortName"]] : ["upcase", ["get", "name"]];

      map.current.addLayer({
        id: "county-labels",
        type: "symbol",
        source: "socal-counties",
        layout: {
          "text-field": labelField as any,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": labelSize,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-line-height": 1.2,
          "text-letter-spacing": isMobile ? 0.05 : 0,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": isMobile ? 2.5 : 3,
        },
      });

      // Track hover state
      let hoveredFeatureId: number | null = null;

      // Mouse move on fills
      map.current.on("mousemove", "county-fills", (e) => {
        if (!map.current) return;

        map.current.getCanvas().style.cursor = "pointer";

        if (e.features && e.features.length > 0 && e.features[0]) {
          if (hoveredFeatureId !== null) {
            map.current.setFeatureState(
              { source: "socal-counties", id: hoveredFeatureId },
              { hover: false }
            );
          }

          const feature = e.features[0];
          hoveredFeatureId = feature.id as number;
          const countyName = feature.properties?.name;

          if (countyName) {
            setHoveredCounty(countyName);
          }

          map.current.setFeatureState(
            { source: "socal-counties", id: hoveredFeatureId },
            { hover: true }
          );
        }
      });

      // Mouse move on borders (same behavior)
      map.current.on("mousemove", "county-borders", (e) => {
        if (!map.current) return;

        map.current.getCanvas().style.cursor = "pointer";

        if (e.features && e.features.length > 0 && e.features[0]) {
          if (hoveredFeatureId !== null) {
            map.current.setFeatureState(
              { source: "socal-counties", id: hoveredFeatureId },
              { hover: false }
            );
          }

          const feature = e.features[0];
          hoveredFeatureId = feature.id as number;
          const countyName = feature.properties?.name;

          if (countyName) {
            setHoveredCounty(countyName);
          }

          map.current.setFeatureState(
            { source: "socal-counties", id: hoveredFeatureId },
            { hover: true }
          );
        }
      });


      map.current.on("mouseleave", "county-fills", () => {
        if (!map.current) return;

        map.current.getCanvas().style.cursor = "";

        if (hoveredFeatureId !== null) {
          map.current.setFeatureState(
            { source: "socal-counties", id: hoveredFeatureId },
            { hover: false }
          );
        }

        hoveredFeatureId = null;
        setHoveredCounty(null);
      });

      map.current.on("mouseleave", "county-borders", () => {
        if (!map.current) return;

        map.current.getCanvas().style.cursor = "";

        if (hoveredFeatureId !== null) {
          map.current.setFeatureState(
            { source: "socal-counties", id: hoveredFeatureId },
            { hover: false }
          );
        }

        hoveredFeatureId = null;
        setHoveredCounty(null);
      });


      // Click/Touch handlers with double-tap behavior
      const handleCountyClick = (e: any) => {
        if (e.features && e.features.length > 0 && e.features[0]) {
          const feature = e.features[0];
          const featureId = feature.id as number;
          const properties = feature.properties;
          const slug = properties?.slug;
          const name = properties?.name;
          const listings = properties?.listings;
          const medianPrice = properties?.medianPrice;

          // If clicking the already selected county, navigate to it (second tap)
          if (selectedFeatureIdRef.current === featureId && slug) {
            router.push(`/neighborhoods/${slug}`);
            return;
          }

          // Clear previous selection
          if (selectedFeatureIdRef.current !== null) {
            map.current?.setFeatureState(
              { source: "socal-counties", id: selectedFeatureIdRef.current },
              { selected: false }
            );
          }

          // Set new selection (yellow highlight)
          selectedFeatureIdRef.current = featureId;
          map.current?.setFeatureState(
            { source: "socal-counties", id: featureId },
            { selected: true }
          );

          // Update selected county state for popup
          setSelectedCounty({ name, slug, listings, medianPrice, id: featureId });
        }
      };

      map.current.on("click", "county-fills", handleCountyClick);
      map.current.on("click", "county-borders", handleCountyClick);
    });

    // Handle window resize to keep map fitted with responsive padding
    const handleResize = () => {
      if (map.current) {
        map.current.fitBounds(bounds, {
          padding: getResponsivePadding(),
          duration: 0
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.current?.remove();
      map.current = null;
    };
  }, [router]);

  return (
    <div className={`w-full h-[65vh] sm:h-[80vh] md:h-screen relative overflow-hidden ${isLight ? 'bg-gray-100' : 'bg-gray-900'}`}>
      {/* Title Overlay with Background - Responsive */}
      <div className={`absolute top-0 left-0 right-0 z-10 backdrop-blur-sm p-3 sm:p-6 md:p-8 rounded-br-2xl md:rounded-br-3xl pointer-events-none ${
        isLight
          ? 'bg-gradient-to-br from-white/95 via-white/90 to-transparent'
          : 'bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-transparent'
      }`}>
        <h1 className={`text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-3 md:mb-4 drop-shadow-lg ${
          isLight ? 'text-gray-900' : 'text-white'
        }`}>
          Southern California
        </h1>
        <p className={`text-xs sm:text-sm md:text-base lg:text-xl leading-relaxed hidden sm:block ${
          isLight ? 'text-gray-700' : 'text-gray-200'
        }`}>
          Explore real estate across Southern California. Hover over a region to see details, click to explore cities and properties.
        </p>
        <p className={`text-xs leading-snug sm:hidden ${
          isLight ? 'text-gray-700' : 'text-gray-200'
        }`}>
          Tap a region to explore cities and properties.
        </p>
      </div>

      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full"
      />

      {/* County Info - Below Header - Shows selected or hovered county */}
      {(selectedCounty || hoveredCounty) && (
        <div className={`absolute top-[90px] sm:top-24 md:top-44 lg:top-48 left-3 sm:left-6 md:left-8 px-3 sm:px-6 md:px-8 py-2 sm:py-4 md:py-5 rounded-lg sm:rounded-2xl shadow-2xl z-20 animate-fade-in pointer-events-none backdrop-blur-md border-2 max-w-[90vw] sm:max-w-md ${
          selectedCounty
            ? (isLight ? 'bg-amber-500/95 border-amber-600/50' : 'bg-amber-600/95 border-amber-400/50')
            : (isLight ? 'bg-blue-500/95 border-blue-600/50' : 'bg-blue-600/95 border-blue-400/50')
        }`}>
          <p className={`text-sm sm:text-lg md:text-xl lg:text-2xl font-bold drop-shadow-lg ${
            isLight ? 'text-white' : 'text-white'
          }`}>
            {selectedCounty ? selectedCounty.name : hoveredCounty}
          </p>

          {selectedCounty && (
            <>
              <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
                <p className={`text-xs sm:text-sm ${isLight ? 'text-white' : 'text-white/90'}`}>
                  <span className="font-semibold">{selectedCounty.listings}</span> active listings
                </p>
                <p className={`text-xs sm:text-sm ${isLight ? 'text-white' : 'text-white/90'}`}>
                  Median: <span className="font-semibold">{selectedCounty.medianPrice}</span>
                </p>
              </div>
              <p className={`text-xs sm:text-sm mt-1.5 sm:mt-2 hidden sm:block ${
                isLight ? 'text-white' : 'text-amber-50'
              }`}>
                Tap again to explore cities and properties
              </p>
              <p className={`text-[10px] mt-1 sm:hidden leading-tight ${
                isLight ? 'text-white' : 'text-amber-50'
              }`}>
                Tap again to explore
              </p>
            </>
          )}

          {!selectedCounty && (
            <>
              <p className={`text-xs sm:text-sm mt-1 hidden sm:block ${
                isLight ? 'text-white' : 'text-blue-50'
              }`}>
                Click to select and view details
              </p>
              <p className={`text-[10px] mt-0.5 sm:hidden leading-tight ${
                isLight ? 'text-white' : 'text-blue-50'
              }`}>
                Tap to select
              </p>
            </>
          )}
        </div>
      )}

    </div>
  );
}
