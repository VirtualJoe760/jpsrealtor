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
  const mapRef = useRef<any>(null);
  const lastSelectedIdRef = useRef<string | null>(null);
  const clusterRef = useRef<Supercluster | null>(null);
  const lastBoundsRef = useRef<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const hydratedInitialViewState: ViewState = {
    latitude: centerLat ?? 33.72,
    longitude: centerLng ?? -116.37,
    zoom: zoom ?? 11,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  // Initialize supercluster
  useEffect(() => {
    clusterRef.current = new Supercluster({
      radius: 60,
      maxZoom: 13,
      minPoints: 2,
    });

    // Load listings into supercluster, limit to 200 to reduce processing
    const points: Supercluster.PointFeature<{
      cluster: boolean;
      listing: MapListing;
    }>[] = listings
      .filter((listing) => listing.longitude != null && listing.latitude != null)
      .slice(0, 200)
      .map((listing) => ({
        type: "Feature" as const,
        properties: {
          cluster: false,
          listing,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [listing.longitude!, listing.latitude!],
        },
      }));

    clusterRef.current.load(points);
    updateClusters();
  }, [listings]);

  // Update clusters on map move with debouncing
  const updateClusters = () => {
    const map = mapRef.current?.getMap();
    if (!map || !clusterRef.current) {
      console.log("Skipping updateClusters: map or clusterRef not ready");
      return;
    }

    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    // Check if bounds have significantly changed
    const boundsKey = `${bounds.getNorth().toFixed(6)}-${bounds.getSouth().toFixed(6)}-${bounds.getEast().toFixed(6)}-${bounds.getWest().toFixed(6)}-${zoom.toFixed(2)}`;
    if (boundsKey === lastBoundsRef.current) {
      console.log("Skipping bounds change: no significant change");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastBoundsRef.current = boundsKey;
      // Non-null assertion: clusterRef.current is guaranteed initialized
      const clusters = clusterRef.current!.getClusters(bbox, Math.floor(zoom));
      const limitedClusters = clusters.slice(0, 100); // Limit to 100 clusters/markers
      setClusters(limitedClusters);
      console.log(`Set ${limitedClusters.length} clusters`);

      if (onBoundsChange) {
        console.log("Triggering bounds change:", {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
          zoom: Math.floor(zoom),
        });
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
          zoom: Math.floor(zoom),
        });
      }
    }, 600);
  };

  // Handle map move and drag events
  const handleMoveEnd = () => {
    updateClusters();
  };

  const handleDragEnd = () => {
    updateClusters();
  };

  const handleMarkerClick = (listing: MapListing) => {
    if (lastSelectedIdRef.current === listing._id) return;
    lastSelectedIdRef.current = listing._id;
    onSelectListing(listing);

    if (onSelectListingByIndex) {
      const index = listings.findIndex((l) => l._id === listing._id);
      onSelectListingByIndex(index >= 0 ? index : 0);
    }
  };

  const handleClusterClick = (cluster: Supercluster.PointFeature<Supercluster.AnyProps>) => {
    const map = mapRef.current?.getMap();
    if (!map || !clusterRef.current) {
      console.log("Skipping cluster click: map or clusterRef not ready");
      return;
    }

    const expansionZoom = clusterRef.current!.getClusterExpansionZoom(
      cluster.properties.cluster_id
    );
    map.easeTo({
      center: cluster.geometry.coordinates,
      zoom: Math.min(expansionZoom, 14),
      duration: 1000,
    });
  };

  useImperativeHandle(ref, () => ({
    flyToCity(lat: number, lng: number, zoomLevel = 12) {
      const map = mapRef.current?.getMap();
      if (!map) return;
      map.easeTo({
        center: [lng, lat],
        zoom: zoomLevel,
        duration: 1000,
        offset: [0, -250],
      });
    },
  }));

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        initialViewState={hydratedInitialViewState}
        onMoveEnd={handleMoveEnd}
        onDragEnd={handleDragEnd}
      >
        {clusters.map((feature, i) => {
          const [longitude, latitude] = feature.geometry.coordinates;
          const { cluster, point_count, listing } = feature.properties;

          // Skip rendering if coordinates are invalid
          if (longitude == null || latitude == null) return null;

          if (!cluster) {
            // Individual marker
            if (!listing || listing.longitude == null || listing.latitude == null) return null;
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

          // Cluster marker
          const size = Math.min(40 + point_count * 2, 60);
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