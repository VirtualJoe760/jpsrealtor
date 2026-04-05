"use client";

import React, { useState, useEffect } from "react";
import ListingsMap, { MapListing } from "@/app/components/map/ListingsMap";
import { useTheme } from "@/app/contexts/ThemeContext";

interface NearbyListingsMapProps {
  city: string;
  subdivisionName?: string;
  excludeListingKey?: string;
  /** Coordinates to center the map on */
  coordinates?: { latitude: number; longitude: number };
  height?: string;
}

const NON_APPLICABLE = ["not applicable", "n/a", "none", "other", "na", "no hoa"];

function isValidSubdivision(name?: string): boolean {
  if (!name || name.trim().length === 0) return false;
  return !NON_APPLICABLE.some((v) => name.toLowerCase().includes(v));
}

export default function NearbyListingsMap({
  city,
  subdivisionName,
  excludeListingKey,
  coordinates,
  height = "400px",
}: NearbyListingsMapProps) {
  const [listings, setListings] = useState<MapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const useSubdivision = isValidSubdivision(subdivisionName);
  const label = useSubdivision ? subdivisionName! : city;
  const citySlug = city.toLowerCase().replace(/\s+/g, "-");
  const subdivSlug = subdivisionName
    ? subdivisionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    : "";

  useEffect(() => {
    setLoading(true);
    async function fetchListings() {
      try {
        let url: string;
        if (useSubdivision) {
          url = `/api/subdivisions/${subdivSlug}/listings?limit=100&propertyType=A`;
        } else {
          url = `/api/cities/${citySlug}/listings?limit=100&propertyType=sale`;
        }

        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();

        const mapped: MapListing[] = (data.listings || [])
          .filter((l: any) => {
            // Exclude the current listing
            if (excludeListingKey && (l.listingKey === excludeListingKey || l.listingId === excludeListingKey)) {
              return false;
            }
            return true;
          })
          .map((l: any) => ({
            listingKey: l.listingKey || l.listingId,
            slugAddress: l.slugAddress || l.slug,
            latitude: l.latitude || l.coordinates?.latitude,
            longitude: l.longitude || l.coordinates?.longitude,
            listPrice: l.listPrice,
            propertyType: l.propertyType,
            mlsSource: l.mlsSource,
            bedsTotal: l.bedsTotal || l.beds,
            bathsTotal: l.bathsTotal || l.baths || l.bathroomsTotalDecimal,
            bathroomsTotalInteger: l.bathroomsTotalInteger,
            livingArea: l.livingArea,
            lotSize: l.lotSize,
            associationFee: l.associationFee,
            subdivisionName: l.subdivisionName,
            address: l.address || l.unparsedAddress,
            photoUrl: l.photoUrl || l.primaryPhotoUrl,
          }));

        setListings(mapped);
      } catch (err) {
        console.error("Error fetching nearby listings for map:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, [citySlug, subdivSlug, useSubdivision, excludeListingKey]);

  return (
    <section className="py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
          {useSubdivision ? `Explore ${label}` : `More Homes in ${label}`}
        </h2>
        <ListingsMap
          listings={listings}
          loading={loading}
          height={height}
          center={coordinates}
          zoom={useSubdivision ? 14 : 12}
          showFilters={false}
        />
      </div>
    </section>
  );
}
