"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";
import { countyBoundaries } from "./countyBoundaries";

export default function SoCalCountySVGMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [hoveredCounty, setHoveredCounty] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<{name: string, slug: string, listings: string, medianPrice: string, id: number} | null>(null);
  const selectedFeatureIdRef = useRef<number | null>(null);
  const router = useRouter();

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
        return { top: 80, bottom: 100, left: 20, right: 20 };
      } else if (width < 768) { // Tablet
        return { top: 120, bottom: 100, left: 40, right: 120 };
      } else if (width < 1024) { // Small desktop
        return { top: 150, bottom: 110, left: 60, right: 200 };
      } else { // Large desktop
        return { top: 180, bottom: 120, left: 80, right: 280 };
      }
    };

    // Initialize map with locked view and responsive padding
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
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
    <div className="w-full h-[65vh] sm:h-[80vh] md:h-screen relative overflow-hidden bg-gray-900">
      {/* Title Overlay with Background - Responsive */}
      <div className="absolute top-0 left-0 z-10 bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-transparent backdrop-blur-sm p-3 sm:p-6 md:p-8 rounded-br-2xl md:rounded-br-3xl pointer-events-none max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 text-white drop-shadow-lg">
          Southern California
        </h1>
        <p className="text-xs sm:text-sm md:text-base lg:text-xl text-gray-200 leading-relaxed hidden sm:block">
          Explore real estate across Southern California. Hover over a region to see details, click to explore cities and properties.
        </p>
        <p className="text-xs text-gray-200 leading-relaxed sm:hidden">
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
        <div className={`absolute top-20 sm:top-24 md:top-44 lg:top-48 left-3 sm:left-6 md:left-8 px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 rounded-xl sm:rounded-2xl shadow-2xl z-20 animate-fade-in pointer-events-none backdrop-blur-md border-2 max-w-[90vw] sm:max-w-md ${
          selectedCounty
            ? 'bg-amber-600/95 border-amber-400/50'
            : 'bg-blue-600/95 border-blue-400/50'
        }`}>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white drop-shadow-lg">
            {selectedCounty ? selectedCounty.name : hoveredCounty}
          </p>

          {selectedCounty && (
            <>
              <div className="mt-2 space-y-1">
                <p className="text-xs sm:text-sm text-white/90">
                  <span className="font-semibold">{selectedCounty.listings}</span> active listings
                </p>
                <p className="text-xs sm:text-sm text-white/90">
                  Median: <span className="font-semibold">{selectedCounty.medianPrice}</span>
                </p>
              </div>
              <p className="text-xs sm:text-sm mt-2 text-amber-50 hidden sm:block">
                Tap again to explore cities and properties
              </p>
              <p className="text-xs mt-1.5 text-amber-50 sm:hidden">
                Tap again to explore
              </p>
            </>
          )}

          {!selectedCounty && (
            <>
              <p className="text-xs sm:text-sm mt-1 text-blue-50 hidden sm:block">
                Click to select and view details
              </p>
              <p className="text-xs mt-0.5 text-blue-50 sm:hidden">
                Tap to select
              </p>
            </>
          )}
        </div>
      )}

      {/* Legend - Responsive */}
      <div className="absolute top-0 right-0 bg-gradient-to-bl from-gray-900/95 via-gray-900/90 to-transparent backdrop-blur-sm rounded-bl-2xl md:rounded-bl-3xl p-3 sm:p-4 md:p-6 text-white text-xs sm:text-sm z-10 pointer-events-none">
        <p className="font-bold mb-2 md:mb-3 text-sm md:text-lg">Coverage</p>
        <div className="space-y-1 sm:space-y-2">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 bg-blue-600 rounded border border-blue-400 md:border-2"></div>
            <span className="text-gray-200 text-xs sm:text-sm">
              <span className="hidden sm:inline">10 Southern California Regions</span>
              <span className="sm:hidden">10 Regions</span>
            </span>
          </div>
        </div>
      </div>

      {/* Navigation hint - Responsive */}
      <div className="absolute bottom-4 sm:bottom-8 right-4 sm:right-8 bg-gray-900/80 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-gray-200 text-xs sm:text-sm z-10 pointer-events-none border border-gray-700">
        <p className="hidden sm:block">Hover to preview • Click to explore</p>
        <p className="sm:hidden">Tap to explore</p>
      </div>
    </div>
  );
}
