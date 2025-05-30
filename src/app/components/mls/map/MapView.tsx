"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import Map, { Marker, Popup, ViewState } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapListing } from '@/types/types';
import Supercluster, { ClusterFeature, PointFeature } from 'supercluster';

interface CustomProperties {
  cluster: boolean;
  cluster_id?: number;
  point_count?: number;
  point_count_abbreviated?: string | number;
  _id?: string;
  latitude?: number;
  longitude?: number;
  listPrice?: number;
  address?: string;
  unparsedFirstLineAddress?: string;
  primaryPhotoUrl?: string;
  bedroomsTotal?: number;
  bathroomsFull?: number;
  livingArea?: number;
  lotSizeSqft?: number;
  pool?: boolean;
  spa?: boolean;
  slugAddress?: string;
  publicRemarks?: string;
  [key: string]: any;
}

type CustomClusterFeature = ClusterFeature<CustomProperties>;
type MixedClusterFeature = CustomClusterFeature | PointFeature<CustomProperties>;

interface MapViewProps {
  listings: MapListing[];
  setVisibleListings: (listings: MapListing[]) => void;
}

function formatPrice(price?: number): string {
  if (!price) return '—';
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}m`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}k`;
  return `$${price}`;
}

export default function MapView({ listings, setVisibleListings }: MapViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clusters, setClusters] = useState<MixedClusterFeature[]>([]);
  const mapRef = useRef<any>(null);

  const geoJsonPoints: PointFeature<CustomProperties>[] = useMemo(() => {
    return listings.map((listing) => ({
      type: 'Feature',
      properties: {
        ...listing,
        cluster: false,
      },
      geometry: {
        type: 'Point',
        coordinates: [listing.longitude, listing.latitude],
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

  const initialViewState: ViewState = {
    latitude: 33.72,
    longitude: -116.37,
    zoom: 11,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  };

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
      .map((c) => c.properties as unknown as MapListing)
      .slice(0, 10);

    setVisibleListings(visible);
  };

  useEffect(() => {
    if (mapRef.current) {
      updateClusters();
    }
  }, [supercluster]);

  const handleMoveEnd = () => {
    updateClusters();
  };

  return (
    <Map
      ref={mapRef}
      mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      initialViewState={initialViewState}
      onMoveEnd={handleMoveEnd}
      
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

        if (!cluster.properties.cluster) {
          const listing = cluster.properties;
          const isHovered = hoveredId === listing._id;

          return (
            <Marker
              key={listing._id}
              longitude={lng}
              latitude={lat}
              anchor="bottom"
              onClick={() => setSelectedId(listing._id!)}
            >
              <div
                onMouseEnter={() => setHoveredId(listing._id!)}
                onMouseLeave={() => setHoveredId(null)}
                className={`rounded-md shadow-md px-2 py-1 text-xs whitespace-nowrap transition-colors duration-200 font-[Raleway] font-semibold ${
                  isHovered ? 'bg-emerald-400 text-black' : 'bg-emerald-600 text-white'
                }`}
              >
                {formatPrice(listing.listPrice)}
                {isHovered && (
                  <span className="ml-1">
                    {listing.bedroomsTotal ? `🛏 ${listing.bedroomsTotal}` : ''}
                    {listing.bathroomsFull ? ` • 🛁 ${listing.bathroomsFull}` : ''}
                  </span>
                )}
              </div>
            </Marker>
          );
        }

        return null;
      })}

      {selectedId && (() => {
        const selected = listings.find((l) => l._id === selectedId);
        if (!selected) return null;

        return (
          <Popup
            longitude={selected.longitude}
            latitude={selected.latitude}
            onClose={() => setSelectedId(null)}
            closeOnClick={false}
            className="!bg-black !text-black !border !border-zinc-700 rounded-md shadow-lg p-2 text-sm max-w-[240px]"
          >
            <div className="space-y-2">
              <img
                src={selected.primaryPhotoUrl || "/placeholder.jpg"}
                alt="Listing"
                className="rounded-md w-full h-32 object-cover"
              />
              <div className="space-y-1">
                <div className="text-lg font-semibold">
                  ${selected.listPrice.toLocaleString()}
                </div>
                <div className="text-xs text-black">
                  {selected.bedroomsTotal ? `🛏 ${selected.bedroomsTotal}` : ''}
                  {selected.bathroomsFull ? ` • 🛁 ${selected.bathroomsFull}` : ''}
                  {selected.livingArea ? ` • 📐 ${selected.livingArea.toLocaleString()} SqFt` : ''}
                </div>
                {selected.lotSizeSqft && (
                  <div className="text-xs text-black">
                    🌴 Lot: {(selected.lotSizeSqft / 43560).toFixed(2)} acres
                  </div>
                )}
                {(selected.pool || selected.spa) && (
                  <div className="text-xs text-emerald-400">
                    {selected.pool && '🏊 Pool'}{selected.pool && selected.spa && ' + '}{selected.spa && '🛁 Spa'}
                  </div>
                )}
              </div>
            </div>
          </Popup>
        );
      })()}
    </Map>
  );
}
