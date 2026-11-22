"use client";

// Subject and nearby comparison pins. Same library as the other public
// maps (@vis.gl/react-maplibre — see docs on the two-track map setup).

import { Component, useRef, useState, type ReactNode } from "react";
import Map, { Marker, NavigationControl, Popup, type MapRef } from "@vis.gl/react-maplibre";
import { X } from "lucide-react";
import type { ListingPostMapData, ListingPostMapPin } from "@/lib/listings/listing-post";
import "maplibre-gl/dist/maplibre-gl.css";

const pinColors = { Subject: "bg-rose-600", Active: "bg-blue-600", Closed: "bg-emerald-600" };
const dollars = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
});
const soldDate = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
});

class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p className="p-5 text-sm">This browser could not open the map.</p> : this.props.children;
  }
}

export default function ListingPostMap({
  latitude,
  longitude,
  address,
  data,
  isLight,
}: {
  latitude: number;
  longitude: number;
  address: string;
  data: ListingPostMapData;
  isLight: boolean;
}) {
  const [selected, setSelected] = useState<ListingPostMapPin | null>(null);
  const mapRef = useRef<MapRef>(null);
  const { pins, unavailable } = data;
  const longitudeScale = Math.cos(latitude * Math.PI / 180);
  const distance = (pin: ListingPostMapPin) =>
    (pin.latitude - latitude) ** 2 + ((pin.longitude - longitude) * longitudeScale) ** 2;
  const groups = [
    { title: "Nearby active listings", empty: unavailable.includes("Active")
        ? "Active listings are temporarily unavailable." : "No matching active listings within one mile.",
      pins: pins.filter((pin) => pin.status === "Active").sort((a, b) => distance(a) - distance(b)).slice(0, 4) },
    { title: "Recently sold nearby", empty: unavailable.includes("Closed")
        ? "Recent sales are temporarily unavailable." : "No matching recent sales available.",
      pins: pins.filter((pin) => pin.status === "Closed").slice(0, 4) },
  ];

  function showOnMap(pin: ListingPostMapPin) {
    setSelected(pin);
    mapRef.current?.jumpTo({ center: [pin.longitude, pin.latitude] });
    mapRef.current?.getContainer().scrollIntoView({ block: "nearest" });
  }
  const style = isLight
    ? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
  return (
    <div aria-label={`Map of ${address}`}>
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Map legend">
        {(["Subject", "Active", "Closed"] as const).map((status) => (
          <li key={status} className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-3 w-3 rounded-full ${pinColors[status]}`} />
            {status === "Subject" ? "Subject property" : status === "Closed" ? "Closed in the past year" : "Active listings"}
          </li>
        ))}
      </ul>
      <div className="h-72 w-full overflow-hidden rounded-2xl sm:h-96">
        <MapBoundary>
          <Map
            ref={mapRef}
            initialViewState={{ latitude, longitude, zoom: 14 }}
            cooperativeGestures
            mapStyle={style}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />
            {pins.map((pin) => (
              <Marker key={`${pin.status}:${pin.key}`} latitude={pin.latitude} longitude={pin.longitude}>
                <button
                  type="button"
                  aria-label={`${pin.status}: ${pin.address}`}
                  title={`${pin.status}: ${pin.address}`}
                  onClick={() => setSelected(pin)}
                  className={`block h-5 w-5 rounded-full border-2 border-white shadow-md ${pinColors[pin.status]}`}
                />
              </Marker>
            ))}
            <Marker latitude={latitude} longitude={longitude} style={{ zIndex: 1 }}>
              <span
                title={address}
                role="img"
                aria-label={`Subject property: ${address}`}
                className={`block h-7 w-7 rounded-full border-4 border-white shadow-lg ${pinColors.Subject}`}
              />
            </Marker>
            {selected && (
              <Popup latitude={selected.latitude} longitude={selected.longitude} closeButton={false} closeOnClick={false}
                onClose={() => setSelected(null)} offset={14} maxWidth="260px">
                <div className={`relative space-y-1 rounded-xl border py-3 pl-3 pr-10 text-sm shadow-lg ${
                  isLight ? "border-gray-200 bg-white text-gray-900" : "border-neutral-700 bg-neutral-900 text-white"
                }`}>
                  <button type="button" aria-label="Close listing details" onClick={() => setSelected(null)}
                    className={`absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md ${isLight ? "hover:bg-gray-100" : "hover:bg-neutral-800"}`}>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <p className="font-semibold">{selected.address}</p>
                  <p>{selected.status}{selected.price != null && ` · ${dollars.format(selected.price)}`}</p>
                  {(selected.office || selected.agent) && (
                    <p className={`text-xs ${isLight ? "text-gray-600" : "text-neutral-300"}`}>Listed by {[selected.office, selected.agent].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              </Popup>
            )}
          </Map>
        </MapBoundary>
      </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {groups.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 font-semibold">{group.title}</h3>
              {group.pins.length > 0 ? (
              <ul className={`divide-y rounded-xl border ${isLight ? "divide-gray-200 border-gray-200" : "divide-neutral-700 border-neutral-700"}`}>
                {group.pins.map((pin) => (
                  <li key={pin.key}>
                    <button type="button" onClick={() => showOnMap(pin)} aria-pressed={selected?.key === pin.key && selected?.status === pin.status}
                      className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm ${isLight ? "hover:bg-blue-50" : "hover:bg-white/10"}`}>
                      <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${pinColors[pin.status]}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{pin.address}</span>
                        {pin.closeDate && <span className="block text-xs opacity-75">Sold {soldDate.format(new Date(pin.closeDate))}</span>}
                      </span>
                      {pin.price != null && <span className="shrink-0 font-semibold">{dollars.format(pin.price)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
              ) : <p className="text-sm opacity-75">{group.empty}</p>}
            </section>
          ))}
        </div>
    </div>
  );
}
