// src/app/components/mls/map/MapView.tsx
"use client";

import {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import Map, { Marker, ViewState } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapListing } from "@/types/types";
import { ServerCluster } from "@/app/utils/map/useListings";
import AnimatedCluster from "./AnimatedCluster";
import AnimatedMarker from "./AnimatedMarker";
import { useTheme } from "@/app/contexts/ThemeContext";

export interface MapViewHandles {
  flyToCity: (lat: number, lng: number, zoom?: number) => void;
}

interface MapViewProps {
  // Server-side clustering (optional for backwards compat)
  clusters?: ServerCluster[];
  listings: MapListing[];
  // Legacy support
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

function formatPrice(price?: number | null): string {
  if (!price) return "—";
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}m`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}k`;
  return `$${price}`;
}

// MapTiler API Key
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || "";

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
    clusters,
    listings,
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
  const [currentZoom, setCurrentZoom] = useState<number>(zoom ?? 11);
  const [internalSelected, setInternalSelected] = useState<MapListing | null>(
    selectedListing ?? null
  );

  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const lastBoundsKeyRef = useRef<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const panelOpenRef = useRef<boolean>(panelOpen);

  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);

  // Watch for mapStyle changes
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

  // Keep internal selection in sync
  useEffect(() => {
    if (selectedListing) {
      setInternalSelected((prev) =>
        prev?._id === selectedListing._id ? prev : selectedListing
      );
    } else {
      setInternalSelected(null);
    }
  }, [selectedListing]);

  const hydratedInitialViewState: ViewState = {
    latitude: centerLat ?? 33.72,
    longitude: centerLng ?? -116.37,
    zoom: zoom ?? 11,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Enable/disable gestures when panel is open
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
    if (panelOpen) handlers.forEach((h: any) => h.disable());
    else handlers.forEach((h: any) => h.enable());
  }, [panelOpen]);

  const handleBoundsChange = () => {
    if (panelOpenRef.current) return;

    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const bounds = map.getBounds();
    const zoomVal = map.getZoom();
    setCurrentZoom(zoomVal);

    const key = `${bounds.getNorth().toFixed(4)}-${bounds.getSouth().toFixed(4)}-${bounds.getEast().toFixed(4)}-${bounds.getWest().toFixed(4)}-${zoomVal.toFixed(1)}`;
    if (key === lastBoundsKeyRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (panelOpenRef.current) return;
      lastBoundsKeyRef.current = key;

      onBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
        zoom: Math.floor(zoomVal),
      });
    }, 150);
  };

  const handleMoveEnd = () => {
    if (panelOpen) return;
    handleBoundsChange();
  };

  const handleDragEnd = () => {
    if (panelOpen) return;
    handleBoundsChange();
  };

  const handleMarkerClick = (listing: MapListing) => {
    setHoveredId(null);
    setInternalSelected(listing);
    onSelectListing(listing);

    if (onSelectListingByIndex) {
      const index = listings.findIndex((l) => l._id === listing._id);
      onSelectListingByIndex(index >= 0 ? index : 0);
    }
  };

  const handleClusterClick = (cluster: ServerCluster) => {
    if (panelOpen) return;
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    map.easeTo({
      center: [cluster.longitude, cluster.latitude],
      zoom: Math.min(cluster.expansionZoom, 14),
      duration: 700,
    });
  };

  useImperativeHandle(ref, () => ({
    flyToCity(lat: number, lng: number, zoomLevel = 12) {
      const map = mapRef.current?.getMap?.();
      if (!map) return;
      map.easeTo({
        center: [lng, lat],
        zoom: zoomLevel,
        duration: 1000,
        offset: [0, -250],
      });
    },
  }));

  const isSelected = (l: MapListing) => {
    const id = l._id;
    if (!id) return false;
    const matchesSelected = selectedListing && selectedListing._id === id;
    const matchesInternal = internalSelected && internalSelected._id === id;
    return !!(matchesSelected || matchesInternal);
  };

  // Initial load - trigger bounds change
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const onLoad = () => {
      setTimeout(() => handleBoundsChange(), 100);
    };

    if (map.isStyleLoaded()) onLoad();
    else map.once("load", onLoad);

    const ro = new ResizeObserver(() => {
      map.resize();
      handleBoundsChange();
    });
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    return () => ro.disconnect();
  }, []);

  const currentMapStyleURL = MAP_STYLES[mapStyle];

  return (
    <div ref={wrapperRef} className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapStyle={currentMapStyleURL}
        key={`map-${mapStyle}`}
        initialViewState={hydratedInitialViewState}
        onMoveEnd={handleMoveEnd}
        onDragEnd={handleDragEnd}
        interactive={!panelOpen}
      >
        {/* Server-side clusters */}
        {(clusters || []).map((cluster) => {
          const size = Math.min(40 + cluster.count * 2, 70);
          return (
            <Marker
              key={`cluster-${cluster.id}`}
              longitude={cluster.longitude}
              latitude={cluster.latitude}
              anchor="center"
              onClick={() => handleClusterClick(cluster)}
            >
              <AnimatedCluster
                count={cluster.count}
                size={size}
                onClick={() => handleClusterClick(cluster)}
                isLight={isLight}
                avgPrice={cluster.avgPrice}
              />
            </Marker>
          );
        })}

        {/* Individual listings (from server at high zoom) */}
        {listings.map((listing, i) => {
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
        })}
      </Map>
    </div>
  );
});

export default MapView;
