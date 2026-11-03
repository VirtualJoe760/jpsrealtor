"use client";

// Single-pin map for a listing blog post. Same library as the other public
// maps (@vis.gl/react-maplibre — see docs on the two-track map setup).

import { Component, type ReactNode } from "react";
import Map, { Marker, NavigationControl } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

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
  isLight,
}: {
  latitude: number;
  longitude: number;
  address: string;
  isLight: boolean;
}) {
  const style = isLight
    ? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
  return (
    <div className="h-72 sm:h-96 w-full overflow-hidden rounded-2xl" aria-label={`Map of ${address}`}>
      <MapBoundary>
        <Map
          initialViewState={{ latitude, longitude, zoom: 14 }}
          cooperativeGestures
          mapStyle={style}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" />
          <Marker latitude={latitude} longitude={longitude} anchor="bottom">
            <span
              title={address}
              className="block h-6 w-6 -translate-y-1 rounded-full border-4 border-white bg-rose-600 shadow-lg"
            />
          </Marker>
        </Map>
      </MapBoundary>
    </div>
  );
}
