"use client";

import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import Map, { Marker, ViewState } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapListing } from "@/types/types";
import Supercluster, { ClusterFeature, PointFeature } from "supercluster";
import { CustomProperties } from "@/types/cluster";

type CustomClusterFeature = ClusterFeature<CustomProperties>;
type MixedClusterFeature =
  | CustomClusterFeature
  | PointFeature<CustomProperties>;

export interface MapViewHandles {
  flyToCity: (lat: number, lng: number, zoom?: number) => void;
}

interface MapViewProps {
  listings: MapListing[];
  setVisibleListings: (listings: MapListing[]) => void;
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
  }) => void;
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
    setVisibleListings,
    centerLat,
    centerLng,
    zoom,
    onSelectListing,
    selectedListing,
    onBoundsChange,
  },
  ref
) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clusters, setClusters] = useState<MixedClusterFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<any>(null);
  const manualFlyRef = useRef(false);

  const hydratedInitialViewState: ViewState = {
    latitude: centerLat ?? 33.72,
    longitude: centerLng ?? -116.37,
    zoom: zoom ?? 11,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  const geoJsonPoints: PointFeature<CustomProperties>[] = useMemo(() => {
    return listings
      .filter((l) => !isNaN(Number(l.latitude)) && !isNaN(Number(l.longitude)))
      .map((listing) => ({
        type: "Feature",
        properties: {
          ...listing,
          cluster: false,
        },
        geometry: {
          type: "Point",
          coordinates: [Number(listing.longitude), Number(listing.latitude)],
        },
      }));
  }, [listings]);

  const supercluster = useMemo(() => {
    const cluster = new Supercluster<CustomProperties, CustomProperties>({
      radius: 60,
      maxZoom: 13,
    });
    cluster.load(geoJsonPoints);
    return cluster;
  }, [geoJsonPoints]);

  const updateClusters = () => {
    const map = mapRef.current?.getMap();
    const bounds = map?.getBounds();
    const zoom = map?.getZoom();

    if (!bounds || zoom === undefined) return;

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    const newClusters = supercluster.getClusters(bbox, Math.round(zoom));
    setClusters(newClusters);

    const visible: MapListing[] = newClusters
      .filter((c) => !c.properties.cluster)
      .map((c) => c.properties as MapListing);

    setVisibleListings(visible);
    setLoading(false);

    // 🔁 Trigger server-side filtered listing load
    if (onBoundsChange) {
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    }
  };

  useEffect(() => {
    if (mapRef.current && geoJsonPoints.length > 0) {
      updateClusters();
    }
  }, [geoJsonPoints.length]);

  const handleMoveEnd = () => {
    updateClusters();
  };

  const handleMarkerClick = (listing: MapListing) => {
    onSelectListing(listing);
    const map = mapRef.current?.getMap();
    if (!map) return;

    manualFlyRef.current = false;

    map.easeTo({
      center: [listing.longitude, listing.latitude],
      zoom: 15,
      duration: 600,
      offset: [0, -250],
    });
  };

  useImperativeHandle(ref, () => ({
    flyToCity(lat: number, lng: number, zoomLevel = 12) {
      const map = mapRef.current?.getMap();
      if (!map) return;

      manualFlyRef.current = true;
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
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
        </div>
      )}

      <Map
        ref={mapRef}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        initialViewState={hydratedInitialViewState}
        onMoveEnd={handleMoveEnd}
        onLoad={updateClusters}
      >
        {clusters.map((cluster) => {
          const [lng, lat] = cluster.geometry.coordinates as [number, number];

          if (cluster.properties.cluster) {
            return (
              <Marker
                key={`cluster-${cluster.properties.cluster_id}`}
                longitude={lng}
                latitude={lat}
                onClick={() => {
                  const expansionZoom = Math.min(
                    supercluster.getClusterExpansionZoom(
                      cluster.properties.cluster_id!
                    ),
                    20
                  );
                  mapRef.current?.flyTo({
                    center: [lng, lat],
                    zoom: expansionZoom,
                  });
                }}
              >
                <div className="bg-yellow-500 text-black text-xs font-bold rounded-full px-2 py-1">
                  {cluster.properties.point_count}
                </div>
              </Marker>
            );
          }

          const listing = cluster.properties;
          const isHovered = hoveredId === listing._id;
          const isSelected = selectedListing?._id === listing._id;

          return (
            <Marker
              key={listing._id}
              longitude={lng}
              latitude={lat}
              anchor="bottom"
              onClick={() => handleMarkerClick(listing as MapListing)}
            >
              <div
                onMouseEnter={() => setHoveredId(listing._id!)}
                onMouseLeave={() => setHoveredId(null)}
                className={`rounded-md px-2 py-1 text-xs whitespace-nowrap font-[Raleway] font-semibold transition-all duration-200
                ${
                  isSelected
                    ? "bg-cyan-400 text-black border-2 border-white scale-125 z-[60] ring-2 ring-white"
                    : isHovered
                    ? "bg-emerald-400 text-black scale-105 z-40"
                    : "bg-emerald-600 text-white scale-100 z-30"
                }`}
              >
                {formatPrice(listing.listPrice)}
                {isHovered && (
                  <span className="ml-1">
                    {listing.bedroomsTotal ? `🛏 ${listing.bedroomsTotal}` : ""}
                    {listing.bathroomsFull
                      ? ` • 🛁 ${listing.bathroomsFull}`
                      : ""}
                  </span>
                )}
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
});

export default MapView;
