"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";

// Southern California counties with their center coordinates and slugs
const soCalCounties = [
  { name: "Riverside County", slug: "riverside", center: [-116.0, 33.8] },
  { name: "San Bernardino County", slug: "san-bernardino", center: [-116.5, 34.5] },
  { name: "Imperial County", slug: "imperial", center: [-115.5, 33.0] },
  { name: "San Diego County", slug: "san-diego", center: [-117.0, 33.0] },
  { name: "Orange County", slug: "orange", center: [-117.8, 33.7] },
  { name: "Los Angeles County", slug: "los-angeles", center: [-118.3, 34.0] },
  { name: "Ventura County", slug: "ventura", center: [-119.0, 34.4] },
  { name: "Santa Barbara County", slug: "santa-barbara", center: [-120.0, 34.6] },
];

export default function SoCalCountyMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [hoveredCounty, setHoveredCounty] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map centered on Southern California
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      center: [-117.5, 34.0], // Center of SoCal
      zoom: 6,
      maxZoom: 10,
      minZoom: 5,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      if (!map.current) return;

      // Add county boundaries source
      // Using OpenStreetMap data for California counties
      map.current.addSource("counties", {
        type: "vector",
        url: "https://tiles.stadiamaps.com/data/openmaptiles.json",
      });

      // Add county fill layer
      map.current.addLayer({
        id: "county-fills",
        type: "fill",
        source: "counties",
        "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 6], // County level
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.3,
            0.1,
          ],
        },
      });

      // Add county border layer
      map.current.addLayer({
        id: "county-borders",
        type: "line",
        source: "counties",
        "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 6],
        paint: {
          "line-color": "#2563eb",
          "line-width": 2,
        },
      });

      // Add markers for each county
      soCalCounties.forEach((county) => {
        const el = document.createElement("div");
        el.className = "county-marker";
        el.style.width = "12px";
        el.style.height = "12px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = "#2563eb";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
        el.style.cursor = "pointer";
        el.style.transition = "transform 0.2s";

        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.5)";
          setHoveredCounty(county.name);
        });

        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
          setHoveredCounty(null);
        });

        el.addEventListener("click", () => {
          router.push(`/neighborhoods/${county.slug}`);
        });

        const popup = new maplibregl.Popup({
          offset: 15,
          closeButton: false,
        }).setHTML(`
          <div class="px-3 py-2">
            <p class="font-semibold text-blue-600">${county.name}</p>
            <p class="text-xs text-gray-600">Click to explore</p>
          </div>
        `);

        new maplibregl.Marker({ element: el })
          .setLngLat(county.center as [number, number])
          .setPopup(popup)
          .addTo(map.current!);
      });

      // Change cursor on hover
      map.current.on("mouseenter", "county-fills", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });

      map.current.on("mouseleave", "county-fills", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [router]);

  return (
    <div className="relative">
      <div
        ref={mapContainer}
        style={{ width: "100%", height: "600px" }}
        className="rounded-lg overflow-hidden shadow-lg"
      />
      {hoveredCounty && (
        <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-lg shadow-lg">
          <p className="font-semibold text-blue-600">{hoveredCounty}</p>
          <p className="text-sm text-gray-600">Click to explore cities and listings</p>
        </div>
      )}
    </div>
  );
}
