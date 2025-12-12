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
import { MapMarker, isServerCluster, isRadialCluster } from "@/app/utils/map/useServerClusters";
import AnimatedCluster from "./AnimatedCluster";
import AnimatedMarker from "./AnimatedMarker";
import { useTheme } from "@/app/contexts/ThemeContext";
import HoverStatsOverlay from './HoverStatsOverlay';
import { formatPrice, getActivityColor } from "@/app/utils/map/colors";
import { CITY_BOUNDARIES } from "@/data/city-boundaries";
import { COUNTY_BOUNDARIES } from "@/data/county-boundaries";
import { REGION_BOUNDARIES } from "@/data/region-boundaries";

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

  // Cache city/county data for contextual boundary lookups at higher zoom levels
  // Using object cache instead of Map to avoid TypeScript issues
  const cityStatsCache = useMemo<Record<string, any>>(() => ({}), []);
  const countyStatsCache = useMemo<Record<string, any>>(() => ({}), []);

  // Detect mobile for lighter boundary colors
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [internalSelected, setInternalSelected] = useState<MapListing | null>(selectedListing ?? null);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom ?? 5.5);
  const [hoveredPolygon, setHoveredPolygon] = useState<{
    name: string;
    count: number;
    medianPrice?: number;
    avgPrice?: number;
    minPrice: number;
    maxPrice: number;
    type: 'county' | 'city' | 'region';
  } | null>(null);

  // Note: California-wide statistics are now calculated from filtered markers
  // in the californiaStats useMemo below, ensuring stats reflect active filters

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
      console.log(`🔍 [MapView] Setting currentZoom to: ${zoom} (was: ${currentZoom})`);
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
    // Track city indices for unique IDs (cities can have duplicate names)
    const cityIndexTracker: Record<string, number> = {};

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
          // Cities need index to handle duplicate names across counties
          const cityName = marker.cityName;
          const currentIndex = cityIndexTracker[cityName] || 0;
          cityIndexTracker[cityName] = currentIndex + 1;

          return {
            type: 'city' as const,
            id: `${cityName}-${currentIndex}`, // Include index in ID
            name: cityName,
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

  // Calculate California-wide stats from actual listings data
  // Note: Don't calculate from geographic boundary clusters (regions/counties/cities)
  // as they represent aggregated stats, not individual listings
  const californiaStats = useMemo(() => {
    const dataToRender = (markers && markers.length > 0) ? markers : listings;
    if (!dataToRender || dataToRender.length === 0) {
      return { count: 0, medianPrice: 0, minPrice: 0, maxPrice: 0 };
    }

    // Note: Removed geographic cluster check as RadialCluster only has type 'radial'
    // ServerCluster and MapListing are always included in California stats
    // If needed in future, add region/county/city types to RadialCluster interface

    let totalCount = 0;
    let allPrices: number[] = [];
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    dataToRender.forEach((marker: any) => {
      if (isServerCluster(marker) || isRadialCluster(marker)) {
        // For radial clusters (not geographic boundaries), use count and track price range
        const clusterCount = marker.count || 0;
        if (clusterCount > 0) {
          totalCount += clusterCount;

          // For median calculation, use the cluster's representative price
          const representativePrice = marker.avgPrice;
          if (representativePrice && representativePrice > 0) {
            allPrices.push(representativePrice);
          }

          // Track min/max from cluster ranges
          if (marker.minPrice && marker.minPrice > 0) {
            minPrice = Math.min(minPrice, marker.minPrice);
          }
          if (marker.maxPrice && marker.maxPrice > 0) {
            maxPrice = Math.max(maxPrice, marker.maxPrice);
          }
        }
      } else {
        // Individual listing
        totalCount += 1;
        if (marker.listPrice && marker.listPrice > 0) {
          allPrices.push(marker.listPrice);
          minPrice = Math.min(minPrice, marker.listPrice);
          maxPrice = Math.max(maxPrice, marker.listPrice);
        }
      }
    });

    // Handle case where no valid prices found
    if (allPrices.length === 0) {
      return { count: totalCount, medianPrice: 0, minPrice: 0, maxPrice: 0 };
    }

    // Calculate median from all representative prices
    const sortedPrices = [...allPrices].sort((a, b) => a - b);
    const mid = Math.floor(sortedPrices.length / 2);
    const medianPrice = sortedPrices.length % 2 === 0
      ? Math.round((sortedPrices[mid - 1] + sortedPrices[mid]) / 2)
      : sortedPrices[mid];

    console.log('📊 California Stats Calculation:', {
      totalCount,
      dataLength: dataToRender.length,
      pricesCollected: allPrices.length,
      medianPrice,
      minPrice: minPrice === Infinity ? 0 : minPrice,
      maxPrice: maxPrice === -Infinity ? 0 : maxPrice,
      samplePrices: allPrices.slice(0, 5)
    });

    return {
      count: totalCount,
      medianPrice: Math.round(medianPrice),
      minPrice: minPrice === Infinity ? 0 : Math.round(minPrice),
      maxPrice: maxPrice === -Infinity ? 0 : Math.round(maxPrice)
    };
  }, [markers, listings]);

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

  // Cache city and county stats for use at higher zoom levels
  useEffect(() => {
    dataToRender.forEach((item: any) => {
      if (item.clusterType === 'city' && item.cityName) {
        cityStatsCache[item.cityName] = {
          count: item.count || 0,
          medianPrice: item.medianPrice,
          avgPrice: item.avgPrice,
          minPrice: item.minPrice || 0,
          maxPrice: item.maxPrice || 0,
        };
      } else if (item.clusterType === 'county' && item.countyName) {
        countyStatsCache[item.countyName] = {
          count: item.count || 0,
          medianPrice: item.medianPrice,
          avgPrice: item.avgPrice,
          minPrice: item.minPrice || 0,
          maxPrice: item.maxPrice || 0,
        };
      }
    });
  }, [dataToRender, cityStatsCache, countyStatsCache]);

  console.log('🗺️ [MapView] dataToRender updated:', {
    markersLength: markers?.length || 0,
    listingsLength: listings.length,
    usingMarkers: markers && markers.length > 0,
    dataToRenderLength: dataToRender.length,
    regionCount: dataToRender.filter((m: any) => m.clusterType === 'region').length,
    countyCount: dataToRender.filter((m: any) => m.clusterType === 'county').length,
    currentZoom: currentZoom.toFixed(2),
    cachedCities: Object.keys(cityStatsCache).length,
    cachedCounties: Object.keys(countyStatsCache).length
  });

  // Enhanced logging for debugging zoom-based rendering
  useEffect(() => {
    const flooredZoom = Math.floor(currentZoom);
    const regionCount = dataToRender.filter((m: any) => m.clusterType === 'region' && m.polygon).length;
    const countyCount = dataToRender.filter((m: any) => m.clusterType === 'county' && m.polygon).length;
    const cityCount = dataToRender.filter((m: any) => m.clusterType === 'city' && m.polygon).length;
    const listingCount = dataToRender.filter((m: any) => !isServerCluster(m)).length;
    const clusterCount = dataToRender.filter((m: any) => isServerCluster(m) && !['region', 'county', 'city'].includes((m as any).clusterType)).length;

    console.log(`📊 MapView Render Data at Zoom ${currentZoom.toFixed(2)} (floored: ${flooredZoom}):`, {
      zoomRaw: currentZoom.toFixed(2),
      zoomFloored: flooredZoom,
      regions: regionCount,
      counties: countyCount,
      cities: cityCount,
      listings: listingCount,
      otherClusters: clusterCount,
      total: dataToRender.length
    });
  }, [dataToRender, currentZoom]);

  // Handle polygon (region/county/city) clicks
  const handleMapClick = useCallback((event: any) => {
    if (panelOpen) return;
    if (!event.features || event.features.length === 0) return;

    // Disable boundary click-to-zoom on mobile - let native gestures handle navigation
    if (isMobile) {
      console.log('🔇 Boundary click disabled on mobile - use native gestures');
      return;
    }

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

    // Determine target zoom level based on boundary type
    let targetZoom = 12; // Default for cities
    if (polygonData.clusterType === 'region') {
      targetZoom = 7; // Region → zoom to county view
    } else if (polygonData.clusterType === 'county') {
      targetZoom = 10; // County → zoom to city view
    } else if (polygonData.clusterType === 'city') {
      targetZoom = 13; // City → zoom to listing view
    }

    // Get current zoom to determine if we need to force zoom in
    const currentZoom = map.getZoom();

    // Calculate padding based on mobile vs desktop
    const padding = isMobile ? 80 : 50;

    // Fit map to polygon bounds with appropriate zoom level
    // Always ensure we zoom in at least 1 level, or to the target zoom, whichever is greater
    const minZoom = Math.max(targetZoom, currentZoom + 1);

    map.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      {
        padding: padding,
        duration: 1000,
        minZoom: minZoom, // Ensure we always zoom in
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

    // Regions
    dataToRender
      .filter((m: any) => m.clusterType === 'region' && m.polygon)
      .forEach((marker: any) => {
        layerIds.push(`region-fill-${marker.regionName}`);
      });

    // Counties
    dataToRender
      .filter((m: any) => m.clusterType === 'county' && m.polygon)
      .forEach((marker: any) => {
        layerIds.push(`county-fill-${marker.countyName}`);
      });

    // Cities - must match the indexing used in rendering (filtered then indexed)
    dataToRender
      .filter((m: any) => m.clusterType === 'city' && m.polygon)
      .forEach((marker: any, i: number) => {
        layerIds.push(`city-fill-${marker.cityName}-${i}`);
      });

    return layerIds;
  }, [dataToRender]);

  // Register hover event handlers for polygon layers (simplified and more reliable)
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    console.log('🎨 Setting up global hover handlers for all polygon layers');

    // Global mousemove handler - simpler and more reliable than per-layer handlers
    const onMouseMove = (e: any) => {
      // Query all polygon layers at mouse position
      // Don't filter by layers - just get all features and filter by our layer IDs
      const allFeatures = map.queryRenderedFeatures(e.point);

      // Filter to only our polygon layers
      const features = allFeatures.filter((f: any) => {
        const layerId = f.layer?.id;
        return layerId && (
          layerId.startsWith('region-fill-') ||
          layerId.startsWith('county-fill-') ||
          layerId.startsWith('city-fill-')
        );
      });

      if (features.length > 0) {
        const feature = features[0];
        const layerId = feature.layer.id;

        // Extract polygon type and name from layer ID
        let polygonType: string | null = null;
        let polygonName: string | null = null;

        if (layerId.startsWith('region-fill-')) {
          polygonType = 'region';
          polygonName = layerId.replace('region-fill-', '');
        } else if (layerId.startsWith('county-fill-')) {
          polygonType = 'county';
          polygonName = layerId.replace('county-fill-', '');
        } else if (layerId.startsWith('city-fill-')) {
          polygonType = 'city';
          // Extract city name (remove index suffix if present)
          const extracted = layerId.replace('city-fill-', '');
          polygonName = extracted.split('-').slice(0, -1).join('-') || extracted;
        }

        if (polygonType && polygonName) {
          // Find matching polygon data
          const polygon = dataToRender.find((m: any) => {
            if (polygonType === 'region') return m.clusterType === 'region' && m.regionName === polygonName;
            if (polygonType === 'county') return m.clusterType === 'county' && m.countyName === polygonName;
            if (polygonType === 'city') return m.clusterType === 'city' && m.cityName?.startsWith(polygonName);
            return false;
          });

          if (polygon) {
            map.getCanvas().style.cursor = 'pointer';

            // Update hover state only if it changed
            const currentName = (polygon as any).regionName || (polygon as any).countyName || (polygon as any).cityName;
            if (!hoveredPolygon || hoveredPolygon.name !== currentName) {
              setHoveredPolygon({
                name: currentName,
                count: (polygon as any).count,
                medianPrice: (polygon as any).medianPrice,
                avgPrice: (polygon as any).avgPrice,
                minPrice: (polygon as any).minPrice,
                maxPrice: (polygon as any).maxPrice,
                type: polygonType as 'city' | 'region' | 'county',
              });
            }

            // Set feature state for visual hover effect
            const sourceName = layerId.replace('-fill-', '-source-').replace('-outline-', '-source-').replace('-shadow-', '-source-');
            if (feature.id !== undefined) {
              // Clear previous hover state
              if (hoveredFeatureRef.current && hoveredFeatureRef.current.source !== sourceName) {
                try {
                  // Check if source still exists before clearing
                  if (map.getSource(hoveredFeatureRef.current.source)) {
                    map.setFeatureState(hoveredFeatureRef.current, { hover: false });
                  }
                } catch (e) {
                  // Source might not exist anymore - silently ignore
                }
              }

              // Set new hover state
              try {
                // Check if source exists before setting state
                if (map.getSource(sourceName)) {
                  const featureRef = { source: sourceName, id: feature.id };
                  map.setFeatureState(featureRef, { hover: true });
                  hoveredFeatureRef.current = featureRef;
                }
              } catch (e) {
                // Source might not exist - silently ignore
              }
            }
            return; // Found a polygon, don't clear hover state
          }
        }
      }

      // No polygon under cursor - clear hover state
      if (hoveredPolygon) {
        map.getCanvas().style.cursor = 'default';
        setHoveredPolygon(null);

        if (hoveredFeatureRef.current) {
          try {
            // Check if source still exists before clearing
            if (map.getSource(hoveredFeatureRef.current.source)) {
              map.setFeatureState(hoveredFeatureRef.current, { hover: false });
            }
          } catch (e) {
            // Source might not exist anymore - silently ignore
          }
          hoveredFeatureRef.current = null;
        }
      }
    };

    // Register global mousemove handler
    map.on('mousemove', onMouseMove);
    console.log('✅ Global hover handler registered');

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up global hover handler');
      map.off('mousemove', onMouseMove);

      // Clear any remaining hover state
      if (hoveredFeatureRef.current) {
        try {
          // Check if source still exists before clearing
          if (map.getSource(hoveredFeatureRef.current.source)) {
            map.setFeatureState(hoveredFeatureRef.current, { hover: false });
          }
        } catch (e) {
          // Silently ignore - source might not exist anymore
        }
        hoveredFeatureRef.current = null;
      }
    };
  }, [dataToRender, hoveredPolygon]); // Re-run when data changes

  // Helper function to calculate stats for a specific boundary from filtered markers
  const calculateBoundaryStats = useCallback((boundaryName: string, boundaryType: 'city' | 'county') => {
    if (!dataToRender || dataToRender.length === 0) {
      return { count: 0, medianPrice: 0, avgPrice: 0, minPrice: 0, maxPrice: 0 };
    }

    let totalCount = 0;
    let allPrices: number[] = [];
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    dataToRender.forEach((marker: any) => {
      // Check if this marker belongs to the boundary
      let belongsToBoundary = false;

      // @ts-expect-error - Geographic boundary properties (clusterType, cityName, countyName) not in current type system
      if (isServerCluster(marker) && marker.clusterType === boundaryType) {
        // @ts-expect-error - Geographic boundary properties not in current type system
        const markerName = boundaryType === 'city' ? marker.cityName : marker.countyName;
        belongsToBoundary = markerName === boundaryName;
      } else if (!isServerCluster(marker) && !isRadialCluster(marker)) {
        // Individual listing - check city property
        if (boundaryType === 'city') {
          belongsToBoundary = marker.city === boundaryName;
        }
        // For county, we'd need to check listing data (not currently stored on listings)
      }

      if (belongsToBoundary) {
        if (isServerCluster(marker)) {
          totalCount += marker.count || 0;
          if (marker.avgPrice && marker.avgPrice > 0) {
            allPrices.push(marker.avgPrice);
          }
          if (marker.minPrice && marker.minPrice > 0) {
            minPrice = Math.min(minPrice, marker.minPrice);
          }
          if (marker.maxPrice && marker.maxPrice > 0) {
            maxPrice = Math.max(maxPrice, marker.maxPrice);
          }
        } else {
          totalCount += 1;
          if (marker.listPrice && marker.listPrice > 0) {
            allPrices.push(marker.listPrice);
            minPrice = Math.min(minPrice, marker.listPrice);
            maxPrice = Math.max(maxPrice, marker.listPrice);
          }
        }
      }
    });

    if (allPrices.length === 0) {
      return { count: totalCount, medianPrice: 0, avgPrice: 0, minPrice: 0, maxPrice: 0 };
    }

    const sortedPrices = [...allPrices].sort((a, b) => a - b);
    const mid = Math.floor(sortedPrices.length / 2);
    const medianPrice = sortedPrices.length % 2 === 0
      ? Math.round((sortedPrices[mid - 1] + sortedPrices[mid]) / 2)
      : sortedPrices[mid];

    const avgPrice = Math.round(allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length);

    return {
      count: totalCount,
      medianPrice,
      avgPrice,
      minPrice: minPrice === Infinity ? 0 : minPrice,
      maxPrice: maxPrice === -Infinity ? 0 : maxPrice
    };
  }, [dataToRender]);

  // Determine contextual boundary based on current map view (when not hovering)
  const contextualBoundary = useMemo(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || !dataToRender || dataToRender.length === 0) return null;

    const center = map.getCenter();
    const flooredZoom = Math.floor(currentZoom);

    console.log('[contextualBoundary] Checking boundaries at zoom', flooredZoom, 'center:', center);

    // Helper to check if point is in polygon
    const pointInPolygon = (point: [number, number], polygon: any): boolean => {
      // Simple point-in-polygon check
      const [lng, lat] = point;
      let inside = false;

      const flattenCoords = (coords: any): [number, number][] => {
        if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
          return coords;
        }
        return coords.flat(2).reduce((acc: [number, number][], val: any, i: number, arr: any[]) => {
          if (i % 2 === 0 && typeof val === 'number' && typeof arr[i + 1] === 'number') {
            acc.push([val, arr[i + 1]]);
          }
          return acc;
        }, []);
      };

      const points = flattenCoords(polygon);
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
      return inside;
    };

    // Hierarchical boundary detection with proper fallbacks
    // Priority: Try city first, then county, then region based on zoom level

    if (flooredZoom >= 10) {
      // Zoom 10-11: City zoom with clusters
      // Zoom 12+: Individual listings (use static boundaries)

      // Try to find city boundary
      let city = dataToRender.find((m: any) =>
        m.clusterType === 'city' && m.polygon && pointInPolygon([center.lng, center.lat], m.polygon)
      );

      // At zoom 12+, city clusters aren't rendered - check static boundaries
      if (!city && flooredZoom >= 12) {
        const cityEntry = Object.entries(CITY_BOUNDARIES).find(([_, boundary]) =>
          pointInPolygon([center.lng, center.lat], boundary.coordinates)
        );
        if (cityEntry) {
          const [cityName] = cityEntry;
          const stats = calculateBoundaryStats(cityName, 'city');
          console.log('[contextualBoundary] Found city from static boundaries:', cityName, 'filtered stats:', stats);
          return {
            name: cityName,
            count: stats.count,
            medianPrice: stats.medianPrice,
            avgPrice: stats.avgPrice,
            minPrice: stats.minPrice,
            maxPrice: stats.maxPrice,
            type: 'city' as const
          };
        }
      }

      if (city) {
        return {
          name: (city as any).cityName,
          count: (city as any).count || 0,
          medianPrice: (city as any).medianPrice,
          avgPrice: (city as any).avgPrice,
          minPrice: (city as any).minPrice || 0,
          maxPrice: (city as any).maxPrice || 0,
          type: 'city' as const
        };
      }

      // No city found - fall back to county
      // At zoom 10-11, county data isn't in dataToRender, use static boundaries
      const countyEntry = Object.entries(COUNTY_BOUNDARIES).find(([_, boundary]) =>
        pointInPolygon([center.lng, center.lat], boundary.coordinates)
      );
      if (countyEntry) {
        const [countyName] = countyEntry;

        // Try to find county stats from rendered data (won't exist at zoom 10+)
        const countyData = dataToRender.find((m: any) =>
          m.clusterType === 'county' && (m as any).countyName === countyName
        );

        if (countyData) {
          return {
            name: (countyData as any).countyName,
            count: (countyData as any).count || 0,
            medianPrice: (countyData as any).medianPrice,
            avgPrice: (countyData as any).avgPrice,
            minPrice: (countyData as any).minPrice || 0,
            maxPrice: (countyData as any).maxPrice || 0,
            type: 'county' as const
          };
        } else {
          // County found but no stats in rendered data - calculate from filtered data
          const stats = calculateBoundaryStats(countyName, 'county');
          console.log('[contextualBoundary] Found county from static boundaries:', countyName, 'filtered stats:', stats);
          return {
            name: countyName,
            count: stats.count,
            medianPrice: stats.medianPrice,
            avgPrice: stats.avgPrice,
            minPrice: stats.minPrice,
            maxPrice: stats.maxPrice,
            type: 'county' as const
          };
        }
      }
    }

    if (flooredZoom >= 7 && flooredZoom <= 9) {
      // Check if center is in a county boundary
      const county = dataToRender.find((m: any) =>
        m.clusterType === 'county' && m.polygon && pointInPolygon([center.lng, center.lat], m.polygon)
      );
      if (county) {
        return {
          name: (county as any).countyName,
          count: (county as any).count || 0,
          medianPrice: (county as any).medianPrice,
          avgPrice: (county as any).avgPrice,
          minPrice: (county as any).minPrice || 0,
          maxPrice: (county as any).maxPrice || 0,
          type: 'county' as const
        };
      }

      // No county found - fall back to region
      const region = dataToRender.find((m: any) =>
        m.clusterType === 'region' && m.polygon && pointInPolygon([center.lng, center.lat], m.polygon)
      );
      if (region) {
        return {
          name: (region as any).regionName,
          count: (region as any).count || 0,
          medianPrice: (region as any).medianPrice,
          avgPrice: (region as any).avgPrice,
          minPrice: (region as any).minPrice || 0,
          maxPrice: (region as any).maxPrice || 0,
          type: 'region' as const
        };
      }
    }

    if (flooredZoom >= 4 && flooredZoom <= 6) {
      // Check if center is in a region boundary
      const region = dataToRender.find((m: any) =>
        m.clusterType === 'region' && m.polygon && pointInPolygon([center.lng, center.lat], m.polygon)
      );
      if (region) {
        console.log('[contextualBoundary] Found region:', (region as any).regionName, 'count:', (region as any).count);
        return {
          name: (region as any).regionName,
          count: (region as any).count || 0,
          medianPrice: (region as any).medianPrice,
          avgPrice: (region as any).avgPrice,
          minPrice: (region as any).minPrice || 0,
          maxPrice: (region as any).maxPrice || 0,
          type: 'region' as const
        };
      } else {
        console.log('[contextualBoundary] No region found at zoom', flooredZoom);
      }
    }

    console.log('[contextualBoundary] No boundary found for current position');
    return null;
  }, [dataToRender, currentZoom, calculateBoundaryStats]);

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
        <HoverStatsOverlay
          data={hoveredPolygon}
          californiaStats={californiaStats}
          contextualBoundary={contextualBoundary}
        />

        {/* Render region polygon overlays for zoom 4-6 */}
        {(() => {
          const hasData = dataToRender && dataToRender.length > 0;
          const flooredZoom = Math.floor(currentZoom);
          const zoomInRange = flooredZoom >= 4 && flooredZoom <= 6;
          const hasRegions = dataToRender?.some((m: any) => m.clusterType === 'region' && m.polygon);
          const shouldRender = hasData && zoomInRange && hasRegions;

          console.log(`[MapView] 🔍 REGION RENDER CHECK at zoom ${currentZoom.toFixed(2)} (floored: ${flooredZoom}):`, {
            hasData,
            dataLength: dataToRender?.length || 0,
            zoomInRange: `floor(${currentZoom}) = ${flooredZoom}, ${flooredZoom} >= 4 && ${flooredZoom} <= 6 = ${zoomInRange}`,
            hasRegions,
            regionCount: dataToRender?.filter((m: any) => m.clusterType === 'region').length || 0,
            regionsWithPolygon: dataToRender?.filter((m: any) => m.clusterType === 'region' && m.polygon).length || 0,
            shouldRender: shouldRender ? '✅ YES' : '❌ NO',
            reason: !hasData ? 'No data' : !zoomInRange ? `Floored zoom ${flooredZoom} not in range 4-6` : !hasRegions ? 'No regions with polygons' : 'OK'
          });

          return shouldRender;
        })() && (
          <>
            {(() => {
              console.log(`[MapView] ✅ Rendering ${dataToRender.filter((m: any) => m.clusterType === 'region' && m.polygon).length} region polygons`);

              // Calculate all region counts for color percentiles
              const regionCounts = dataToRender
                .filter((m: any) => m.clusterType === 'region' && m.polygon)
                .map((m: any) => m.count || 0);

              return dataToRender
                .filter((m: any) => m.clusterType === 'region' && m.polygon)
                .map((marker: any, i: number) => {
                  const regionColor = getActivityColor(marker.count || 0, regionCounts, isLight);

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
                          isMobile ? 0.30 : 0.40,  // hover - dimmer opacity
                          isMobile ? 0.15 : 0.22   // base - dimmer opacity
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
              });
            })()}
          </>
        )}

        {/* Render county polygon overlays for zoom 7-9 ONLY (can show WITH individual listings) */}
        {(() => {
          const flooredZoom = Math.floor(currentZoom);
          const hasCounties = dataToRender?.some((m: any) => m.clusterType === 'county' && m.polygon);
          // Show county boundaries if we have counties (can coexist with individual listings)
          return dataToRender && dataToRender.length > 0 && flooredZoom >= 7 && flooredZoom <= 9 && hasCounties;
        })() && (
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
                              isMobile ? 0.18 : 0.25,  // hover - dimmer opacity for zero listings
                              isMobile ? 0.08 : 0.12   // base - dimmer opacity
                            ]
                          : ['case',
                              ['boolean', ['feature-state', 'hover'], false],
                              isMobile ? 0.30 : 0.40,  // hover - dimmer opacity
                              isMobile ? 0.15 : 0.22   // base - dimmer opacity
                            ]
                      }}
                    />
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


        {/* Render city polygon overlays for zoom 10-11 ONLY */}
        {(() => {
          const flooredZoom = Math.floor(currentZoom);
          return dataToRender && dataToRender.length > 0 && flooredZoom >= 10 && flooredZoom <= 11 && dataToRender.some((m: any) => m.clusterType === 'city' && m.polygon);
        })() && (
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
                    key={`city-source-${marker.cityName}-${i}`}
                    id={`city-source-${marker.cityName}-${i}`}
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
                              isMobile ? 0.15 : 0.22,  // hover - dimmer opacity for zero listings
                              isMobile ? 0.06 : 0.10   // base - dimmer opacity
                            ]
                          : ['case',
                              ['boolean', ['feature-state', 'hover'], false],
                              isMobile ? 0.30 : 0.40,  // hover - dimmer opacity
                              isMobile ? 0.15 : 0.22   // base - dimmer opacity
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
          dataToRender
            .filter((marker, i) => {
              const isCluster = isServerCluster(marker) || isRadialCluster(marker);

              // Below zoom 12: Only show clusters (no individual listings)
              if (currentZoom < 12) {
                return isCluster;
              }

              // At zoom 12: Cap at 600 individual listings, show all clusters
              if (currentZoom >= 12 && currentZoom < 13) {
                // Always render clusters
                if (isCluster) return true;
                // For individual listings, only show first 600
                const listingIndex = dataToRender.slice(0, i + 1).filter(m => !isServerCluster(m) && !isRadialCluster(m)).length;
                return listingIndex <= 600;
              }

              // At zoom 13+: Show all listings and clusters
              return true;
            })
            .map((marker, i) => {
            if (isServerCluster(marker) || isRadialCluster(marker)) {
              const clusterTypeValue = (marker as any).clusterType;

              // Skip rendering markers for region, county, and city clusters (they have polygon overlays instead)
              if (clusterTypeValue === 'region' || clusterTypeValue === 'county' || clusterTypeValue === 'city') {
                return null;
              }

              // Below zoom 12: Don't render ANY cluster markers (only polygons should show)
              if (currentZoom < 12) {
                return null;
              }

              // Render server-side cluster or radial cluster (zoom 12+)
              const size = Math.min(40 + marker.count * 0.01, 80);
              const clusterType = isRadialCluster(marker) ? 'radial' : ((marker as any).clusterType || 'city');

              console.log(`🎨 Rendering ${clusterType} cluster #${i}:`, {
                lat: marker.latitude,
                lng: marker.longitude,
                count: marker.count,
                size,
                isCluster: marker.isCluster,
                clusterType
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
                    clusterType={clusterType}
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
                  key={listing.listingKey || listing._id || `marker-${i}`}
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
