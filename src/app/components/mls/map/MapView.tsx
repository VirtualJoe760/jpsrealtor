// src/app/components/mls/map/MapView.tsx
"use client";

import {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
} from "react";
import Map, { Marker, Source, Layer, ViewState, Popup } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapListing } from "@/types/types";
import { MapMarker, isServerCluster } from "@/app/utils/map/useMapClusters";
import AnimatedCluster from "./AnimatedCluster";
import AnimatedMarker from "./AnimatedMarker";
import { useTheme } from "@/app/contexts/ThemeContext";
import HoverStatsOverlay from './HoverStatsOverlay';

export interface MapViewHandles {
  flyToCity: (lat: number, lng: number, zoom?: number) => void;
}

interface MapViewProps {
  listings: MapListing[]; // Deprecated - kept for backward compatibility
  markers?: MapMarker[]; // Server-side clusters or listings
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  onSelectListing: (listing: MapListing) => void;
  selectedListing?: MapListing | null;
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
  }) => void;
  onSelectListingByIndex?: (index: number) => void;
  panelOpen?: boolean;
  mapStyle?: 'toner' | 'dark' | 'satellite' | 'bright';
}

// MapTiler API Key
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || "";

// Map style URLs - 4 different map styles
const MAP_STYLES = {
  toner: MAPTILER_KEY && MAPTILER_KEY !== "get_your_maptiler_key_here"
    ? `https://api.maptiler.com/maps/toner-v2/style.json?key=${MAPTILER_KEY}`
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  satellite: MAPTILER_KEY && MAPTILER_KEY !== "get_your_maptiler_key_here"
    ? `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`
    : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  bright: MAPTILER_KEY && MAPTILER_KEY !== "get_your_maptiler_key_here"
    ? `https://api.maptiler.com/maps/bright/style.json?key=${MAPTILER_KEY}`
    : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
};

function formatPrice(price?: number): string {
  if (!price) return "—";
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}m`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}k`;
  return `$${price}`;
}

// Calculate color based on listing activity
// Light mode: High = Red, Medium = Yellow, Low = Blue, Zero = Gray
// Dark mode: High = Red, Medium = Yellow, Low = Green, Zero = Gray
function getActivityColor(
  count: number,
  allCounts: number[],
  isLight: boolean
): string {
  // Zero listings = gray
  if (count === 0) {
    return isLight ? '#9ca3af' : '#6b7280';
  }

  // Filter out zeros for percentile calculation
  const nonZeroCounts = allCounts.filter(c => c > 0);
  if (nonZeroCounts.length === 0) {
    return isLight ? '#9ca3af' : '#6b7280';
  }

  // Sort to find percentiles
  const sorted = [...nonZeroCounts].sort((a, b) => a - b);
  const percentile33 = sorted[Math.floor(sorted.length * 0.33)];
  const percentile66 = sorted[Math.floor(sorted.length * 0.66)];

  // Assign colors based on percentile
  if (count >= percentile66) {
    // High activity - RED
    return isLight ? '#ef4444' : '#f87171';
  } else if (count >= percentile33) {
    // Medium activity - YELLOW
    return isLight ? '#eab308' : '#fbbf24';
  } else {
    // Low activity - BLUE (light) or GREEN (dark)
    return isLight ? '#3b82f6' : '#22c55e';
  }
}

const MapView = forwardRef<MapViewHandles, MapViewProps>(function MapView(
  {
    listings,
    markers,
    centerLat,
    centerLng,
    zoom,
    onSelectListing,
    selectedListing,
    onBoundsChange,
    onSelectListingByIndex,
    panelOpen = false,
    mapStyle = 'toner',
  },
  ref
) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [internalSelected, setInternalSelected] = useState<MapListing | null>(selectedListing ?? null);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom ?? 5.5);
  const [hoveredPolygon, setHoveredPolygon] = useState<{
    name: string;
    count: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    type: 'county' | 'city' | 'region';
  } | null>(null);

  // Track the currently hovered feature for proper state cleanup
  const hoveredFeatureRef = useRef<{ source: string; id: number } | null>(null);

  const mapRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const panelOpenRef = useRef<boolean>(panelOpen);
  const lastBoundsKeyRef = useRef<string | null>(null);

  // Update panel ref when it changes
  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);

  // Sync internal selection with prop
  useEffect(() => {
    if (selectedListing) {
      setInternalSelected((prev) =>
        prev?._id === selectedListing._id ? prev : selectedListing
      );
    } else {
      setInternalSelected(null);
    }
  }, [selectedListing]);

  // Initial view state - Show entire California with all regions visible
  const hydratedInitialViewState: ViewState = {
    latitude: centerLat ?? 37.0, // Center of California (adjusted to show full state)
    longitude: centerLng ?? -119.5, // Center of California
    zoom: zoom ?? 5.5, // Zoomed out to show entire state from Oregon to Mexico
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  // Update map style dynamically
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || !map.isStyleLoaded()) return;

    const newStyleURL = MAP_STYLES[mapStyle];
    const currentStyleSpec = map.getStyle();
    if (!currentStyleSpec) return;

    const needsUpdate = !currentStyleSpec.name ||
                       (mapStyle === 'dark' && !currentStyleSpec.name.includes('dark')) ||
                       (mapStyle === 'bright' && !currentStyleSpec.name.includes('voyager') && !currentStyleSpec.name.includes('bright')) ||
                       (mapStyle === 'satellite' && !currentStyleSpec.name.includes('satellite')) ||
                       (mapStyle === 'toner' && !currentStyleSpec.name.includes('positron') && !currentStyleSpec.name.includes('toner'));

    if (needsUpdate) {
      map.setStyle(newStyleURL);
    }
  }, [mapStyle]);

  // Enable/disable map gestures when panel is open
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const handlers = [
      map.dragPan,
      map.dragRotate,
      map.scrollZoom,
      map.boxZoom,
      map.keyboard,
      map.doubleClickZoom,
      map.touchZoomRotate,
    ].filter(Boolean);

    if (panelOpen) {
      handlers.forEach((h: any) => h.disable());
    } else {
      handlers.forEach((h: any) => h.enable());
    }
  }, [panelOpen]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Update clusters when map moves/zooms
  const updateClusters = () => {
    if (panelOpenRef.current) {
      console.log('⏸️ updateClusters: Panel open, skipping');
      return;
    }

    const map = mapRef.current?.getMap?.();
    if (!map) {
      console.log('⏸️ updateClusters: Map not ready');
      return;
    }

    const bounds = map.getBounds();
    const zoomVal = map.getZoom();

    console.log('🔄 updateClusters called - Zoom:', Math.floor(zoomVal));

    const key = `${bounds.getNorth().toFixed(6)}-${bounds.getSouth().toFixed(6)}-${bounds.getEast().toFixed(6)}-${bounds.getWest().toFixed(6)}-${zoomVal.toFixed(2)}`;

    if (key === lastBoundsKeyRef.current) {
      console.log('⏭️ updateClusters: Same bounds, skipping');
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (panelOpenRef.current) return;

      lastBoundsKeyRef.current = key;

      console.log('✅ updateClusters: Notifying parent of bounds change');
      console.log('📍 Bounds:', {
        north: bounds.getNorth().toFixed(4),
        south: bounds.getSouth().toFixed(4),
        east: bounds.getEast().toFixed(4),
        west: bounds.getWest().toFixed(4),
        zoom: Math.floor(zoomVal)
      });

      onBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
        zoom: Math.floor(zoomVal),
      });
    }, 250);
  };

  // Handle map events
  const handleMoveEnd = () => {
    console.log('🚀 handleMoveEnd called');

    // Update current zoom level
    const map = mapRef.current?.getMap?.();
    if (map) {
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
    }

    if (panelOpen) {
      console.log('⏸️ handleMoveEnd: Panel open, ignoring');
      return;
    }
    updateClusters();
  };

  const handleDragEnd = () => {
    console.log('🚀 handleDragEnd called');
    if (panelOpen) {
      console.log('⏸️ handleDragEnd: Panel open, ignoring');
      return;
    }
    updateClusters();
  };

  // Setup map event listeners
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    console.log('🎯 Setting up map event listeners');

    const onLoad = () => {
      console.log('🗺️ Map loaded');
      updateClusters();

      // Set default cursor to default arrow
      map.getCanvas().style.cursor = 'default';

      // FIXED (Bug #1): Removed duplicate polygon event handler registrations
      // These handlers are registered in the useEffect with [polygonKey] dependency (~line 622)
      // Removing them here eliminates duplicate registrations, memory leaks, and events firing multiple times
    };

    if (map.isStyleLoaded()) {
      onLoad();
    } else {
      map.once("load", onLoad);
    }

    const onZoomEnd = () => {
      console.log('🔍 Zoom ended');
      updateClusters();
    };

    map.on("zoomend", onZoomEnd);

    return () => {
      try {
        map.off("zoomend", onZoomEnd);

        // Clean up region click handlers
        const regionNames = ['Northern California', 'Central California', 'Southern California'];
        regionNames.forEach(regionName => {
          const layerId = `region-fill-${regionName}`;
          map.off('click', layerId);
          map.off('mouseenter', layerId);
          map.off('mouseleave', layerId);
        });

        // Clean up county click handlers
        const countyData = dataToRender.filter((m: any) => m.clusterType === 'county' && m.polygon);
        countyData.forEach((marker: any) => {
          const layerId = `county-fill-${marker.countyName}`;
          map.off('click', layerId);
          map.off('mouseenter', layerId);
          map.off('mouseleave', layerId);
        });

        // Clean up city click handlers
        const cityData = dataToRender.filter((m: any) => m.clusterType === 'city' && m.polygon);
        cityData.forEach((marker: any) => {
          const layerId = `city-fill-${marker.cityName}`;
          map.off('click', layerId);
          map.off('mouseenter', layerId);
          map.off('mouseleave', layerId);
        });
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoize polygon data to prevent unnecessary re-registrations
  const polygonData = useMemo(() => {
    const dataToRender = (markers && markers.length > 0) ? markers : listings;
    if (!dataToRender) return [];

    // Extract only polygon markers (regions, counties, cities)
    return dataToRender
      .filter((marker: any) =>
        (marker.clusterType === 'region' || marker.clusterType === 'county' || marker.clusterType === 'city')
        && marker.polygon
      )
      .map((marker: any) => {
        if (marker.clusterType === 'region') {
          return {
            type: 'region' as const,
            id: marker.regionName,
            name: marker.regionName,
            count: marker.count,
            avgPrice: marker.avgPrice,
            minPrice: marker.minPrice,
            maxPrice: marker.maxPrice,
            polygon: marker.polygon, // Include polygon coordinates for click handler
          };
        } else if (marker.clusterType === 'county') {
          return {
            type: 'county' as const,
            id: marker.countyName,
            name: marker.countyName,
            count: marker.count,
            avgPrice: marker.avgPrice,
            minPrice: marker.minPrice,
            maxPrice: marker.maxPrice,
            polygon: marker.polygon, // Include polygon coordinates for click handler
          };
        } else {
          return {
            type: 'city' as const,
            id: marker.cityName,
            name: marker.cityName,
            count: marker.count,
            avgPrice: marker.avgPrice,
            minPrice: marker.minPrice,
            maxPrice: marker.maxPrice,
            polygon: marker.polygon, // Include polygon coordinates for click handler
          };
        }
      });
  }, [markers, listings]);

  // Create stable polygon key for dependency checking
  const polygonKey = useMemo(() => {
    return polygonData.map(p => `${p.type}-${p.id}`).sort().join('|');
  }, [polygonData]);

  // Register hover event handlers for polygon layers (only when polygon set changes)
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || polygonData.length === 0) return;

    console.log('🎨 Registering polygon hover handlers for', polygonData.length, 'polygons');

    // Wait for map to be fully loaded
    if (!map.isStyleLoaded()) {
      const onStyleLoad = () => {
        console.log('⏳ Style loaded, waiting to register handlers...');
      };
      map.once('styledata', onStyleLoad);
      return;
    }

    // Small delay to ensure layers are fully rendered before registering handlers
    const timeoutId = setTimeout(() => {
      registerHandlers();
    }, 100);

    const handlers: Array<{ layerId: string; type: string; handler: any }> = [];

    const registerHandlers = () => {
      // Register handlers for each polygon
      polygonData.forEach((polygon) => {
        const layerId = `${polygon.type}-fill-${polygon.id}`;
        const sourceName = `${polygon.type}-source-${polygon.id}`;

        // Check if layer exists before registering
        if (!map.getLayer(layerId)) {
          console.warn(`⚠️ Layer ${layerId} not found, skipping`);
          return;
        }
        // Mouseenter handler
        const onMouseEnter = (e: any) => {
          map.getCanvas().style.cursor = 'pointer';

          // Clear previous hover state before setting new one
          if (hoveredFeatureRef.current && map.getSource(hoveredFeatureRef.current.source)) {
            map.setFeatureState(
              hoveredFeatureRef.current,
              { hover: false }
            );
          }

          if (e.features && e.features[0]) {
            const featureRef = { source: sourceName, id: e.features[0].id };
            map.setFeatureState(featureRef, { hover: true });
            hoveredFeatureRef.current = featureRef;
          }

          setHoveredPolygon({
            name: polygon.name,
            count: polygon.count,
            avgPrice: polygon.avgPrice,
            minPrice: polygon.minPrice,
            maxPrice: polygon.maxPrice,
            type: polygon.type,
          });
        };

        // Mouseleave handler
        const onMouseLeave = () => {
          map.getCanvas().style.cursor = 'default';

          // Clear hover state for the specific feature
          if (hoveredFeatureRef.current && map.getSource(hoveredFeatureRef.current.source)) {
            map.setFeatureState(
              hoveredFeatureRef.current,
              { hover: false }
            );
            hoveredFeatureRef.current = null;
          }

          setHoveredPolygon(null);
        };

        // Register hover handlers (click is handled via Map onClick)
        map.on('mouseenter', layerId, onMouseEnter);
        map.on('mouseleave', layerId, onMouseLeave);

        // Track for cleanup
        handlers.push(
          { layerId, type: 'mouseenter', handler: onMouseEnter },
          { layerId, type: 'mouseleave', handler: onMouseLeave }
        );
      });

      console.log(`✅ Registered ${handlers.length} event handlers`);
    }; // End of registerHandlers function

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up polygon hover handlers');
      clearTimeout(timeoutId);
      handlers.forEach(({ layerId, type, handler }) => {
        try {
          map.off(type, layerId, handler);
        } catch (e) {
          // Layer might not exist anymore
        }
      });
    };
  }, [polygonKey]); // Only re-run when the set of polygons changes

  // Handle marker clicks
  const handleMarkerClick = (listing: MapListing) => {
    setHoveredId(null);
    setInternalSelected(listing);
    onSelectListing(listing);

    if (onSelectListingByIndex) {
      const index = listings.findIndex((l) => l._id === listing._id);
      onSelectListingByIndex(index >= 0 ? index : 0);
    }
  };

  // Handle cluster clicks
  const handleClusterClick = (clusterLat: number, clusterLng: number) => {
    if (panelOpen) return;

    const map = mapRef.current?.getMap?.();
    if (!map) return;

    console.log('🎯 Cluster clicked - zooming in');
    map.flyTo({
      center: [clusterLng, clusterLat],
      zoom: Math.min(map.getZoom() + 2, 18),
      duration: 1000
    });
  };

  // Expose flyToCity method
  useImperativeHandle(ref, () => ({
    flyToCity(lat: number, lng: number, zoomLevel = 12) {
      console.log('🚁 flyToCity called - lat:', lat, 'lng:', lng, 'zoom:', zoomLevel);
      const map = mapRef.current?.getMap?.();
      if (!map) {
        console.error('❌ flyToCity: map ref not available');
        return;
      }
      map.easeTo({
        center: [lng, lat],
        zoom: zoomLevel,
        duration: 1000,
        offset: [0, -250],
      });
    },
  }));

  // Check if listing is selected
  const isSelected = (l: MapListing) => {
    const id = l._id;
    if (!id) return false;
    const matchesSelected = selectedListing && selectedListing._id === id;
    const matchesInternal = internalSelected && internalSelected._id === id;
    return !!(matchesSelected || matchesInternal);
  };

  const currentMapStyleURL = MAP_STYLES[mapStyle];

  // Use markers if provided, otherwise fall back to listings
  const dataToRender = (markers && markers.length > 0) ? markers : listings;

  // Handle polygon (region/county/city) clicks
  const handleMapClick = useCallback((event: any) => {
    if (panelOpen) return;
    if (!event.features || event.features.length === 0) return;

    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const feature = event.features[0];
    const layerId = feature.layer?.id;

    if (!layerId) return;

    console.log('🎯 Map clicked - Layer:', layerId);

    // Find the corresponding marker data
    let polygonData: any = null;

    if (layerId.startsWith('region-fill-')) {
      const regionName = layerId.replace('region-fill-', '');
      polygonData = dataToRender.find((m: any) =>
        m.clusterType === 'region' && m.regionName === regionName
      );
    } else if (layerId.startsWith('county-fill-')) {
      const countyName = layerId.replace('county-fill-', '');
      polygonData = dataToRender.find((m: any) =>
        m.clusterType === 'county' && m.countyName === countyName
      );
    } else if (layerId.startsWith('city-fill-')) {
      const cityName = layerId.replace('city-fill-', '');
      polygonData = dataToRender.find((m: any) =>
        m.clusterType === 'city' && m.cityName === cityName
      );
    }

    if (!polygonData || !polygonData.polygon) {
      console.log('⚠️ No polygon data found for layer:', layerId);
      return;
    }

    // Prevent clicks on polygons with zero listings
    if (polygonData.count === 0) {
      console.log("⚠️ Polygon has no listings, ignoring click:", polygonData.regionName || polygonData.countyName || polygonData.cityName);
      return;
    }

    
    // Prevent clicks on polygons with zero listings
    if (polygonData.count === 0) {
      console.log("⚠️ Polygon has no listings, ignoring click:", polygonData.regionName || polygonData.countyName || polygonData.cityName);
      return;
    }
    console.log('🎯 Polygon clicked:', polygonData.regionName || polygonData.countyName || polygonData.cityName);

    // Calculate bounds from polygon coordinates
    const coords = polygonData.polygon;
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    // Handle both Polygon and MultiPolygon formats
    const flattenCoords = (coordArray: any[]): void => {
      coordArray.forEach((item: any) => {
        if (Array.isArray(item) && typeof item[0] === 'number') {
          // This is a coordinate pair [lng, lat]
          const [lng, lat] = item;
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        } else if (Array.isArray(item)) {
          // Recurse into nested arrays
          flattenCoords(item);
        }
      });
    };

    flattenCoords(coords);

    // Fit map to polygon bounds with zoom 12
    map.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      {
        padding: 50,
        duration: 1000,
        maxZoom: 12
      }
    );

    // After the animation completes, trigger bounds change to update URL
    setTimeout(() => {
      if (onBoundsChange) {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
          zoom: zoom
        });
      }
    }, 1100); // Wait for fitBounds animation to complete (1000ms + buffer)
  }, [panelOpen, dataToRender, onBoundsChange]);

  console.log('🗺️ MapView render:', {
    markersCount: markers?.length ?? 0,
    listingsCount: listings.length,
    dataToRenderCount: dataToRender.length,
    mapStyle,
    panelOpen
  });


  // Build list of interactive polygon layer IDs for hover events
  const interactiveLayerIds = useMemo(() => {
    if (!dataToRender) return [];

    const layerIds: string[] = [];

    dataToRender.forEach((marker: any) => {
      if (marker.clusterType === 'region' && marker.polygon) {
        layerIds.push(`region-fill-${marker.regionName}`);
      } else if (marker.clusterType === 'county' && marker.polygon) {
        layerIds.push(`county-fill-${marker.countyName}`);
      } else if (marker.clusterType === 'city' && marker.polygon) {
        layerIds.push(`city-fill-${marker.cityName}`);
      }
    });

    return layerIds;
  }, [dataToRender]);

  return (
    <div ref={wrapperRef} className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapStyle={currentMapStyleURL}
        key={`map-${mapStyle}`}
        initialViewState={hydratedInitialViewState}
        onMoveEnd={handleMoveEnd}
        onDragEnd={handleDragEnd}
        onClick={handleMapClick}
        interactive={!panelOpen}
        cursor="default"
        interactiveLayerIds={interactiveLayerIds}
      >
        {/* Hover Stats Overlay */}
        <HoverStatsOverlay data={hoveredPolygon} />

        {/* Render region polygon overlays for zoom <= 6 AND zoom < 12 */}
        {dataToRender && dataToRender.length > 0 && currentZoom < 12 && dataToRender.some((m: any) => m.clusterType === 'region' && m.polygon) && (
          <>
            {dataToRender
              .filter((m: any) => m.clusterType === 'region' && m.polygon)
              .map((marker: any, i: number) => {
                const regionColor =
                  marker.regionName === 'Northern California' ? '#3b82f6' : // Blue
                  marker.regionName === 'Central California' ? '#10b981' : // Emerald
                  '#f59e0b'; // Amber for Southern California

                // Determine geometry type from polygon structure
                // If polygon is array of arrays (MultiPolygon format), use MultiPolygon
                // If polygon is single array (Polygon format), use Polygon
                const isMultiPolygon = Array.isArray(marker.polygon[0]) &&
                                      Array.isArray(marker.polygon[0][0]) &&
                                      Array.isArray(marker.polygon[0][0][0]);

                const geometryType = isMultiPolygon ? 'MultiPolygon' : 'Polygon';

                return (
                  <Source
                    key={`region-source-${marker.regionName}`}
                    id={`region-source-${marker.regionName}`}
                    type="geojson"
                    data={{
                      type: 'Feature',
                      id: 0, // Required for feature-state to work
                      geometry: {
                        type: geometryType,
                        coordinates: marker.polygon
                      },
                      properties: {
                        name: marker.regionName,
                        count: marker.count
                      }
                    }}
                  >
                    {/* SHADOW/GLOW LAYER - Creates dramatic glow effect on hover */}
                    <Layer
                      id={`region-shadow-${marker.regionName}`}
                      type="line"
                      paint={{
                        'line-color': isLight ? '#8b5cf6' : '#a78bfa',
                        'line-width': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          12,
                          0
                        ],
                        'line-blur': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          8,
                          0
                        ],
                        'line-opacity': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          0.6,
                          0
                        ]
                      }}
                    />
                    <Layer
                      id={`region-fill-${marker.regionName}`}
                      type="fill"
                      paint={{
                        'fill-color': regionColor,
                        'fill-opacity': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          0.55,  // hover - more dramatic
                          0.35   // base - more visible
                        ]
                      }}
                    />
                    <Layer
                      id={`region-outline-${marker.regionName}`}
                      type="line"
                      paint={{
                        'line-color': regionColor,
                        'line-width': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          4,
                          2
                        ],
                        'line-opacity': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          1.0,
                          0.7
                        ]
                      }}
                    />
                    {/* Region labels temporarily disabled */}
                    {/*                     <Layer
                      id={`region-label-${marker.regionName}`}
                      type="symbol"
                      layout={{
                        'text-field': marker.regionName,
                        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                        'text-size': 24,
                        'text-transform': 'uppercase',
                        'text-letter-spacing': 0.1,
                        'text-max-width': 8,
                        'symbol-placement': 'point',
                        'text-allow-overlap': false,
                        'text-ignore-placement': false
                      }}
                      paint={{
                        'text-color': isLight ? '#1f2937' : '#ffffff',
                        'text-halo-color': isLight ? '#ffffff' : '#000000',
                        'text-halo-width': 3,
                        'text-halo-blur': 2
                      }}
                    />
                    */}
                  </Source>
                );
              })}
          </>
        )}

        {/* Render county polygon overlays for zoom 7-8 AND zoom < 12 */}
        {dataToRender && dataToRender.length > 0 && currentZoom < 12 && dataToRender.some((m: any) => m.clusterType === 'county' && m.polygon) && (
          <>
            {(() => {
              // Calculate all county counts for color percentiles
              const countyCounts = dataToRender
                .filter((m: any) => m.clusterType === 'county' && m.polygon)
                .map((m: any) => m.count || 0);

              return dataToRender
                .filter((m: any) => m.clusterType === 'county' && m.polygon)
                .map((marker: any, i: number) => {
                  const countyColor = getActivityColor(marker.count || 0, countyCounts, isLight);
                const isMultiPolygon = Array.isArray(marker.polygon[0]) &&
                                      Array.isArray(marker.polygon[0][0]) &&
                                      Array.isArray(marker.polygon[0][0][0]);
                const geometryType = isMultiPolygon ? 'MultiPolygon' : 'Polygon';

                return (
                  <Source
                    key={`county-source-${marker.countyName}`}
                    id={`county-source-${marker.countyName}`}
                    type="geojson"
                    data={{
                      type: 'Feature',
                      id: 0, // Required for feature-state to work
                      geometry: {
                        type: geometryType,
                        coordinates: marker.polygon
                      },
                      properties: {
                        name: marker.countyName,
                        count: marker.count
                      }
                    }}
                  >
                    {/* SHADOW/GLOW LAYER - Creates dramatic glow effect on hover */}
                    <Layer
                      id={`county-shadow-${marker.countyName}`}
                      type="line"
                      paint={{
                        'line-color': isLight ? '#4f46e5' : '#818cf8',
                        'line-width': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          12,
                          0
                        ],
                        'line-blur': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          8,
                          0
                        ],
                        'line-opacity': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          0.6,
                          0
                        ]
                      }}
                    />
                    <Layer
                      id={`county-fill-${marker.countyName}`}
                      type="fill"
                      paint={{
                        'fill-color': countyColor,
                        'fill-opacity': marker.count === 0
                          ? ['case',
                              ['boolean', ['feature-state', 'hover'], false],
                              0.15,  // hover - very subtle for zero listings
                              0.08   // base - barely visible
                            ]
                          : ['case',
                              ['boolean', ['feature-state', 'hover'], false],
                              0.55,  // hover - more dramatic
                              0.35   // base - more visible
                            ]
                      }}
                    />
                    {/* Diagonal stripe overlay for zero-listing counties */}
                    {marker.count === 0 && (
                      <Layer
                        id={`county-stripes-${marker.countyName}`}
                        type="line"
                        paint={{
                          'line-color': isLight ? '#9ca3af' : '#6b7280',
                          'line-width': 1,
                          'line-opacity': 0.3,
                          'line-dasharray': [2, 4]
                        }}
                      />
                    )}
                    <Layer
                      id={`county-outline-${marker.countyName}`}
                      type="line"
                      paint={{
                        'line-color': isLight ? '#4338ca' : '#a5b4fc',
                        'line-width': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          4,
                          2
                        ],
                        'line-opacity': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          1.0,
                          0.7
                        ]
                      }}
                    />
                    {/* County labels temporarily disabled */}
                    {/* <Layer
                      id={`county-label-${marker.countyName}`}
                      type="symbol"
                      layout={{
                        'text-field': marker.countyName,
                        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
                        'text-size': 16,
                        'text-transform': 'uppercase',
                        'text-letter-spacing': 0.05,
                        'text-max-width': 10,
                        'symbol-placement': 'point',
                        'symbol-spacing': 1000,
                        'text-allow-overlap': false,
                        'text-ignore-placement': false,
                        'text-optional': true
                      }}
                      paint={{
                        'text-color': isLight ? '#4338ca' : '#a78bfa',
                        'text-halo-color': isLight ? '#ffffff' : '#000000',
                        'text-halo-width': 2,
                        'text-halo-blur': 1
                      }}
                    /> */}
                  </Source>
                );
              });
            })()}
          </>
        )}


        {/* Render city polygon overlays for zoom 9-10 AND zoom < 12 */}
        {dataToRender && dataToRender.length > 0 && currentZoom < 12 && dataToRender.some((m: any) => m.clusterType === 'city' && m.polygon) && (
          <>
            {(() => {
              // Calculate all city counts for color percentiles
              const cityCounts = dataToRender
                .filter((m: any) => m.clusterType === 'city' && m.polygon)
                .map((m: any) => m.count || 0);

              return dataToRender
                .filter((m: any) => m.clusterType === 'city' && m.polygon)
                .map((marker: any, i: number) => {
                  const cityColor = getActivityColor(marker.count || 0, cityCounts, isLight);
                const isMultiPolygon = Array.isArray(marker.polygon[0]) &&
                                      Array.isArray(marker.polygon[0][0]) &&
                                      Array.isArray(marker.polygon[0][0][0]);
                const geometryType = isMultiPolygon ? 'MultiPolygon' : 'Polygon';

                return (
                  <Source
                    key={`city-source-${marker.cityName}`}
                    id={`city-source-${marker.cityName}`}
                    type="geojson"
                    data={{
                      type: 'Feature',
                      id: 0, // Required for feature-state to work
                      geometry: {
                        type: geometryType,
                        coordinates: marker.polygon
                      },
                      properties: {
                        name: marker.cityName,
                        count: marker.count
                      }
                    }}
                  >
                    {/* SHADOW/GLOW LAYER - Creates dramatic glow effect on hover */}
                    <Layer
                      id={`city-shadow-${marker.cityName}-${i}`}
                      type="line"
                      paint={{
                        'line-color': isLight ? '#10b981' : '#6ee7b7',
                        'line-width': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          12,
                          0
                        ],
                        'line-blur': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          8,
                          0
                        ],
                        'line-opacity': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          0.6,
                          0
                        ]
                      }}
                    />
                    <Layer
                      id={`city-fill-${marker.cityName}-${i}`}
                      type="fill"
                      paint={{
                        'fill-color': cityColor,
                        'fill-opacity': marker.count === 0
                          ? ['case',
                              ['boolean', ['feature-state', 'hover'], false],
                              0.15,  // hover - very subtle for zero listings
                              0.08   // base - barely visible
                            ]
                          : ['case',
                              ['boolean', ['feature-state', 'hover'], false],
                              0.55,  // hover - more dramatic
                              0.35   // base - more visible
                            ]
                      }}
                    />
                    {/* Diagonal stripe overlay for zero-listing cities */}
                    {marker.count === 0 && (
                      <Layer
                        id={`city-stripes-${marker.cityName}-${i}`}
                        type="line"
                        paint={{
                          'line-color': isLight ? '#9ca3af' : '#6b7280',
                          'line-width': 1,
                          'line-opacity': 0.3,
                          'line-dasharray': [2, 4]
                        }}
                      />
                    )}
                    <Layer
                      id={`city-outline-${marker.cityName}-${i}`}
                      type="line"
                      paint={{
                        'line-color': isLight ? '#059669' : '#6ee7b7',
                        'line-width': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          4,
                          2
                        ],
                        'line-opacity': ['case',
                          ['boolean', ['feature-state', 'hover'], false],
                          1.0,
                          0.7
                        ]
                      }}
                    />
                  </Source>
                );
              });
            })()}
          </>
        )}
        {/* Render all markers */}
        {dataToRender && dataToRender.length > 0 ? (
          dataToRender.map((marker, i) => {
            if (isServerCluster(marker)) {
              // Skip rendering markers for region, county, and city clusters (they have polygon overlays instead)
              if ((marker as any).clusterType === 'region' || (marker as any).clusterType === 'county' || (marker as any).clusterType === 'city') {
                return null;
              }

              // Render server-side cluster
              const size = Math.min(40 + marker.count * 0.01, 80);
              console.log(`🎨 Rendering cluster #${i}:`, {
                lat: marker.latitude,
                lng: marker.longitude,
                count: marker.count,
                size,
                isCluster: marker.isCluster
              });
              return (
                <Marker
                  key={`cluster-${marker.latitude}-${marker.longitude}-${i}`}
                  longitude={marker.longitude}
                  latitude={marker.latitude}
                  anchor="center"
                  onClick={() => handleClusterClick(marker.latitude, marker.longitude)}
                >
                  <AnimatedCluster
                    count={marker.count}
                    size={size}
                    onClick={() => {}}
                    isLight={isLight}
                    regionName={(marker as any).regionName}
                    cityName={(marker as any).cityName}
                    subdivisionName={(marker as any).subdivisionName}
                    countyName={(marker as any).countyName}
                    photoUrl={(marker as any).photoUrl}
                    clusterType={(marker as any).clusterType || 'city'}
                  />
                </Marker>
              );
            } else {
              // Render individual listing
              const listing = marker as MapListing;
              if (!listing.longitude || !listing.latitude || !listing._id) return null;

              const selected = isSelected(listing);
              const hovered = hoveredId === listing._id;
              const showSelected = selected && !panelOpen;

              return (
                <Marker
                  key={listing._id || `marker-${i}`}
                  longitude={listing.longitude}
                  latitude={listing.latitude}
                  anchor="bottom"
                  onClick={() => handleMarkerClick(listing)}
                >
                  <AnimatedMarker
                    price={formatPrice(listing.listPrice)}
                    propertyType={listing.propertyType}
                    mlsSource={listing.mlsSource}
                    isSelected={showSelected}
                    isHovered={hovered}
                    onMouseEnter={() => setHoveredId(listing._id)}
                    onMouseLeave={() => setHoveredId(null)}
                    isLight={isLight}
                  />
                </Marker>
              );
            }
          })
        ) : null}

        {/* Hover stats overlay is rendered at the top-center of the map (see HoverStatsOverlay component above) */}
      </Map>
    </div>
  );
});

export default MapView;
