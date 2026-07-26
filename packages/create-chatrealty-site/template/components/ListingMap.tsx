"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
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
    html: `<div class="cr-pin"><span>${escapeHtml(label)}</span></div>`,
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
//
// CLUSTERING is driven by the vanilla `leaflet.markercluster` plugin through
// an imperative `useMap()` child rather than a React wrapper component: the
// wrappers track react-leaflet v4 and would reintroduce exactly the v4/v5
// lifecycle problem above. Popups are therefore HTML strings (escaped), not
// JSX — a popup link is a full navigation anyway, so next/link buys nothing.
//
// DO NOT render one <Marker> per listing without clustering: a real feed is
// hundreds to thousands of homes and an unclustered Leaflet map stutters or
// dies on mobile.

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function popupHtml(l: ListingSummary): string {
  const href = `/listings/${encodeURIComponent(l.listingKey)}`;
  const attribution = [l.listOfficeName, l.listAgentName].filter(Boolean).map(escapeHtml).join(" — ");
  return [
    '<div style="width:12rem">',
    l.thumbUrl
      ? `<img src="${escapeHtml(l.thumbUrl)}" alt="${escapeHtml(l.address || "")}" style="margin-bottom:.5rem;height:6rem;width:100%;border-radius:.25rem;object-fit:cover" />`
      : "",
    `<p style="font-size:.875rem;font-weight:700;margin:0">${escapeHtml(money(l.currentPrice ?? l.listPrice))}</p>`,
    `<p style="font-size:.75rem;color:#4b5563;margin:.125rem 0 0">${escapeHtml(l.address || "")}</p>`,
    // IDX display rule — the attribution line is required on every popup.
    attribution
      ? `<p style="margin:.25rem 0 0;font-size:.625rem;color:#6b7280">Listed by ${attribution}</p>`
      : "",
    `<a href="${href}" style="margin-top:.25rem;display:inline-block;font-size:.75rem;font-weight:600;color:var(--brand)">View listing →</a>`,
    "</div>",
  ].join("");
}

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

function ClusteredPins({ listings }: { listings: ListingSummary[] }) {
  const map = useMap();

  useEffect(() => {
    const group = (L as any).markerClusterGroup({
      // Adds markers in batches so a few thousand pins never block the main
      // thread on a phone.
      chunkedLoading: true,
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 34 : count < 100 ? 40 : 48;
        return L.divIcon({
          className: "cr-cluster-wrap",
          html: `<div class="cr-cluster" style="width:${size}px;height:${size}px">${count}</div>`,
          iconSize: [size, size],
        });
      },
    });

    for (const l of listings) {
      const marker = L.marker([l.latitude as number, l.longitude as number], {
        icon: priceIcon(l),
      });
      marker.bindPopup(popupHtml(l), { minWidth: 192 });
      group.addLayer(marker);
    }

    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, listings]);

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
      <ClusteredPins listings={pins} />
    </MapContainer>
  );
}
