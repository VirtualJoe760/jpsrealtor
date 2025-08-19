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
import Supercluster from "supercluster";
import { MapListing } from "@/types/types";

export interface MapViewHandles {
  flyToCity: (lat: number, lng: number, zoom?: number) => void;
}

interface MapViewProps {
  listings: MapListing[];
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
}

function formatPrice(price?: number): string {
  if (!price) return "—";
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}m`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}k`;
  return `$${price}`;
}

// --- helpers for tile math (Web Mercator) ---
const nAtZ = (z: number) => Math.pow(2, z);
function lon2tileX(lon: number, z: number) {
  return Math.floor(((lon + 180) / 360) * nAtZ(z));
}
function lat2tileY(lat: number, z: number) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * nAtZ(z)
  );
}

const RAW_MARKER_ZOOM = 13; // ⬅️ show ALL listings (no clustering) at zoom >= 13

const MapView = forwardRef<MapViewHandles, MapViewProps>(function MapView(
  {
    listings,
    centerLat,
    centerLng,
    zoom,
    onSelectListing,
    selectedListing,
    onBoundsChange,
    onSelectListingByIndex,
  },
  ref
) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clusters, setClusters] = useState<
    Supercluster.PointFeature<Supercluster.AnyProps>[]
  >([]);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom ?? 11);
  const [viewBounds, setViewBounds] = useState<{
    west: number;
    south: number;
    east: number;
    north: number;
  } | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const lastSelectedIdRef = useRef<string | null>(null);
  const clusterRef = useRef<Supercluster | null>(null);
  const lastBoundsKeyRef = useRef<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  // Initialize supercluster
  useEffect(() => {
    clusterRef.current = new Supercluster({
      radius: 60,
      maxZoom: RAW_MARKER_ZOOM, // cluster up to 13 (exclusive)
      minPoints: 2,
    });

    const points: Supercluster.PointFeature<{
      cluster: boolean;
      listing: MapListing;
    }>[] = listings
      .filter((l) => l.longitude != null && l.latitude != null)
      .map((listing) => ({
        type: "Feature" as const,
        properties: { cluster: false, listing },
        geometry: {
          type: "Point" as const,
          coordinates: [listing.longitude!, listing.latitude!],
        },
      }));

    clusterRef.current.load(points);
    forceRefresh(); // compute for actual viewport
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  // Debounced cluster refresh
  const updateClusters = () => {
    const map = mapRef.current?.getMap?.();
    if (!map || !clusterRef.current) return;

    const bounds = map.getBounds();
    const zoomVal = map.getZoom();
    setCurrentZoom(zoomVal);

    // Keep track of bounds for marker filtering at high zoom
    setViewBounds({
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    });

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    const key = `${bounds.getNorth().toFixed(6)}-${bounds.getSouth().toFixed(6)}-${bounds
      .getEast()
      .toFixed(6)}-${bounds.getWest().toFixed(6)}-${zoomVal.toFixed(2)}`;
    if (key === lastBoundsKeyRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastBoundsKeyRef.current = key;

      // Only meaningful below RAW_MARKER_ZOOM; harmless above though
      const newClusters = clusterRef.current!.getClusters(bbox, Math.floor(zoomVal));
      setClusters(newClusters);

      onBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
        zoom: Math.floor(zoomVal),
      });
    }, 250);
  };

  const forceRefresh = () => {
    lastBoundsKeyRef.current = null;
    const map = mapRef.current?.getMap?.();
    try { map?.resize(); } catch {}
    updateClusters();
  };

  // Map event hooks
  const handleMoveEnd = () => updateClusters();
  const handleDragEnd = () => updateClusters();

  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const onLoad = () => forceRefresh();
    if (map.isStyleLoaded()) onLoad();
    else map.once("load", onLoad);

    const onResize = () => forceRefresh();
    const onZoomEnd = () => updateClusters();
    map.on("resize", onResize);
    map.on("zoomend", onZoomEnd);

    // extra safety if parent resizes
    const ro = new ResizeObserver(() => forceRefresh());
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    return () => {
      try {
        map.off("resize", onResize);
        map.off("zoomend", onZoomEnd);
      } catch {}
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click handlers
  const handleMarkerClick = (listing: MapListing) => {
    if (lastSelectedIdRef.current === listing._id) return;
    lastSelectedIdRef.current = listing._id;
    onSelectListing(listing);

    if (onSelectListingByIndex) {
      const index = listings.findIndex((l) => l._id === listing._id);
      onSelectListingByIndex(index >= 0 ? index : 0);
    }
  };

  const handleClusterClick = (
    cluster: Supercluster.PointFeature<Supercluster.AnyProps>
  ) => {
    const map = mapRef.current?.getMap?.();
    if (!map || !clusterRef.current) return;

    const expansionZoom = clusterRef.current!.getClusterExpansionZoom(
      cluster.properties.cluster_id
    );
    map.easeTo({
      center: cluster.geometry.coordinates,
      zoom: Math.min(expansionZoom, 14),
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

  // In-bounds filter for raw markers at high zoom (to keep DOM light)
  const inView = (l: MapListing) => {
    if (!viewBounds) return true;
    const { west, south, east, north } = viewBounds;
    const { longitude: x, latitude: y } = l;
    if (x == null || y == null) return false;
    return x >= west && x <= east && y >= south && y <= north;
  };

  return (
    <div ref={wrapperRef} className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        initialViewState={hydratedInitialViewState}
        onMoveEnd={handleMoveEnd}
        onDragEnd={handleDragEnd}
      >
        {/* At street zooms (>= 13): render ALL listings in the current viewport */}
        {currentZoom >= RAW_MARKER_ZOOM
          ? listings
              .filter((l) => l.longitude != null && l.latitude != null)
              .filter(inView)
              .map((listing, i) => (
                <Marker
                  key={listing._id || i}
                  longitude={listing.longitude!}
                  latitude={listing.latitude!}
                  anchor="bottom"
                  onClick={() => handleMarkerClick(listing)}
                >
                  <div
                    onMouseEnter={() => setHoveredId(listing._id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`rounded-md px-2 py-1 text-xs font-[Raleway] font-semibold transition-all duration-200 min-w-[40px] min-h-[20px]
                      ${
                        selectedListing?._id === listing._id
                          ? "bg-cyan-400 text-black border-2 border-white scale-125 z-[100] ring-2 ring-black"
                          : hoveredId === listing._id
                          ? "bg-emerald-400 text-black scale-105 z-40 border border-white"
                          : "bg-emerald-600 text-white scale-100 z-30 border border-gray-700"
                      }`}
                  >
                    {formatPrice(listing.listPrice)}
                  </div>
                </Marker>
              ))
          : // Below 13: show clustered view (as before)
            clusters.map((feature, i) => {
              const [longitude, latitude] = feature.geometry.coordinates;
              const { cluster, point_count, listing } = feature.properties;

              if (longitude == null || latitude == null) return null;

              if (!cluster) {
                if (!listing) return null;
                return (
                  <Marker
                    key={listing._id || i}
                    longitude={longitude}
                    latitude={latitude}
                    anchor="bottom"
                    onClick={() => handleMarkerClick(listing)}
                  >
                    <div
                      onMouseEnter={() => setHoveredId(listing._id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`rounded-md px-2 py-1 text-xs font-[Raleway] font-semibold transition-all duration-200 min-w-[40px] min-h-[20px]
                        ${
                          selectedListing?._id === listing._id
                            ? "bg-cyan-400 text-black border-2 border-white scale-125 z-[100] ring-2 ring-black"
                            : hoveredId === listing._id
                            ? "bg-emerald-400 text-black scale-105 z-40 border border-white"
                            : "bg-emerald-600 text-white scale-100 z-30 border border-gray-700"
                        }`}
                    >
                      {formatPrice(listing.listPrice)}
                    </div>
                  </Marker>
                );
              }

              const size = Math.min(40 + (point_count ?? 0) * 2, 60);
              return (
                <Marker
                  key={`cluster-${feature.properties.cluster_id}`}
                  longitude={longitude}
                  latitude={latitude}
                  anchor="center"
                  onClick={() => handleClusterClick(feature)}
                >
                  <div
                    className="rounded-full flex items-center justify-center text-white font-[Raleway] font-semibold transition-all duration-200"
                    style={{
                      backgroundColor: "#4B4B4B",
                      width: `${size}px`,
                      height: `${size}px`,
                      border: "2px solid #000000",
                      boxShadow: "0 0 8px rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    {point_count}
                  </div>
                </Marker>
              );
            })}
      </Map>
    </div>
  );
});

export default MapView;
