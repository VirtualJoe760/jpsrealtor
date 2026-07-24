"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ListingSummary } from "@/lib/types";
import { moneyShort, money } from "@/lib/format";

// A price-label pin as an HTML divIcon — avoids the broken default-marker-image
// problem in bundlers entirely (no PNG assets to resolve). Styling + the pointer
// tail live in globals.css (`.cr-pin`); it self-centers over the exact coordinate
// via a CSS transform, so iconAnchor is [0,0] and the tail tip lands on the spot.
// It reads `--brand` (globals.css :root), so restyling the theme restyles pins.
function priceIcon(listing: ListingSummary): L.DivIcon {
  const label = moneyShort(listing.currentPrice ?? listing.listPrice);
  return L.divIcon({
    className: "cr-pin-wrap",
    html: `<div class="cr-pin"><span>${label}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// CRBR-001: this template requires react-leaflet >=5 with React 19. On
// react-leaflet 4 + React 18, Strict Mode's dev double-mount throws
// "Map container is already initialized" on every map view (v4 never tears
// the Leaflet map down on the simulated unmount, and manual map.remove()
// workarounds either fail on v4 or double-remove on v5). v5 reworked the
// lifecycle and handles Strict Mode correctly — do not downgrade these deps.

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function ListingMap({ listings }: { listings: ListingSummary[] }) {
  const pins = listings.filter(
    (l) => typeof l.latitude === "number" && typeof l.longitude === "number"
  );
  const points = pins.map((l) => [l.latitude as number, l.longitude as number] as [number, number]);
  const center: [number, number] = points[0] || [33.7175, -116.3922]; // Palm Desert fallback

  return (
    <MapContainer center={center} zoom={11} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {pins.map((l) => (
        <Marker
          key={l.listingKey}
          position={[l.latitude as number, l.longitude as number]}
          icon={priceIcon(l)}
        >
          <Popup>
            <div className="w-48">
              {l.thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.thumbUrl} alt={l.address || ""} className="mb-2 h-24 w-full rounded object-cover" />
              )}
              <p className="text-sm font-bold">{money(l.currentPrice ?? l.listPrice)}</p>
              <p className="text-xs text-gray-600">{l.address}</p>
              {(l.listOfficeName || l.listAgentName) && (
                <p className="mt-1 text-[10px] text-gray-500">
                  Listed by {[l.listOfficeName, l.listAgentName].filter(Boolean).join(" — ")}
                </p>
              )}
              <Link
                href={`/listings/${encodeURIComponent(l.listingKey)}`}
                className="mt-1 inline-block text-xs font-semibold text-brand"
              >
                View listing →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
