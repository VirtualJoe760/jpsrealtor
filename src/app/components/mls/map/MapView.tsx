"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Map, { Marker, ViewState } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapListing } from "@/types/types";
import Supercluster, { ClusterFeature, PointFeature } from "supercluster";
import ListingBottomPanel from "@/app/components/mls/map/ListingBottomPanel";
import { CustomProperties } from "@/types/cluster";
import { useRouter, useSearchParams } from "next/navigation";

type CustomClusterFeature = ClusterFeature<CustomProperties>;
type MixedClusterFeature = CustomClusterFeature | PointFeature<CustomProperties>;

interface MapViewProps {
  listings: MapListing[];
  setVisibleListings: (listings: MapListing[]) => void;
}

function formatPrice(price?: number): string {
  if (!price) return "—";
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}m`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}k`;
  return `$${price}`;
}

export default function MapView({ listings, setVisibleListings }: MapViewProps) {
  const [selectedListing, setSelectedListing] = useState<MapListing | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clusters, setClusters] = useState<MixedClusterFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<any>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ Hydrate map view from URL before initial render
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const zoom = parseFloat(searchParams.get("zoom") || "");

  const hydratedInitialViewState: ViewState = {
    latitude: !isNaN(lat) ? lat : 33.72,
    longitude: !isNaN(lng) ? lng : -116.37,
    zoom: !isNaN(zoom) ? zoom : 11,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  const geoJsonPoints: PointFeature<CustomProperties>[] = useMemo(() => {
    const valid: MapListing[] = [];
    const invalid: MapListing[] = [];

    for (const l of listings) {
      const lat = Number(l.latitude);
      const lng = Number(l.longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        valid.push(l);
      } else {
        invalid.push(l);
      }
    }

    const miraleste = listings.find((l) =>
      l.address?.toLowerCase().includes("miraleste")
    );
    console.log("🧵 Miraleste in valid?", valid.some((l) => l._id === miraleste?._id));
    console.log("🧵 Miraleste in invalid?", invalid.some((l) => l._id === miraleste?._id));

    return valid.map((listing) => ({
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
      maxZoom: 16,
    });
    cluster.load(geoJsonPoints);
    return cluster;
  }, [geoJsonPoints]);

  const updateClusters = () => {
    const map = mapRef.current?.getMap();
    const bounds = map?.getBounds();
    const zoom = map?.getZoom();

    if (!bounds || zoom === undefined) {
      console.warn("❌ Map bounds or zoom not available");
      return;
    }

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

    console.log(
      `🗺️ Zoom: ${zoom.toFixed(2)} | Visible listings in bounds: ${visible.length} | Total clusters: ${newClusters.length}`
    );

    setVisibleListings(visible);
    setLoading(false);
  };

  useEffect(() => {
    if (mapRef.current) {
      updateClusters();
    }
  }, [supercluster]);

  const handleMoveEnd = () => {
    updateClusters();
  };

  // ✅ Restore selected listing from URL (map position is now already hydrated)
  useEffect(() => {
    const selected = searchParams.get("selected");
    if (selected) {
      const listing = listings.find((l) => l.slug === selected);
      if (listing) setSelectedListing(listing);
    }
  }, [searchParams, listings]);

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
                    supercluster.getClusterExpansionZoom(cluster.properties.cluster_id!),
                    20
                  );
                  mapRef.current?.flyTo({ center: [lng, lat], zoom: expansionZoom });
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

          return (
            <Marker
              key={listing._id}
              longitude={lng}
              latitude={lat}
              anchor="bottom"
              onClick={() => {
                setSelectedListing(listing as MapListing);

                const map = mapRef.current?.getMap();
                const center = map?.getCenter();
                const zoom = map?.getZoom();

                if (center && zoom !== undefined) {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("lat", center.lat.toFixed(6));
                  params.set("lng", center.lng.toFixed(6));
                  params.set("zoom", zoom.toFixed(2));
                  params.set("selected", listing.slug);

                  router.push(`?${params.toString()}`, { scroll: false });
                }
              }}
            >
              <div
                onMouseEnter={() => setHoveredId(listing._id!)}
                onMouseLeave={() => setHoveredId(null)}
                className={`rounded-md shadow-md px-2 py-1 text-xs whitespace-nowrap transition-colors duration-200 font-[Raleway] font-semibold ${
                  isHovered ? "bg-emerald-400 text-black" : "bg-emerald-600 text-white"
                }`}
              >
                {formatPrice(listing.listPrice)}
                {isHovered && (
                  <span className="ml-1">
                    {listing.bedroomsTotal ? `🛏 ${listing.bedroomsTotal}` : ""}
                    {listing.bathroomsFull ? ` • 🛁 ${listing.bathroomsFull}` : ""}
                  </span>
                )}
              </div>
            </Marker>
          );
        })}
      </Map>

      {selectedListing && (
        <ListingBottomPanel
          listing={selectedListing}
          onClose={() => {
            setSelectedListing(null);

            const params = new URLSearchParams(searchParams.toString());
            params.delete("selected");
            router.push(`?${params.toString()}`, { scroll: false });
          }}
        />
      )}
    </div>
  );
}
