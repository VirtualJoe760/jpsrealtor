// src/app/mls-listings/[slugAddress]/map/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { IListing } from "@/models/listings";

// Dynamic import for map component (client-side only)
const MapView = dynamic(
  () => import("@/app/components/mls/map/MapView"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-neutral-400">Loading map...</p>
        </div>
      </div>
    ),
  }
);

async function getEnrichedListing(slugAddress: string): Promise<IListing | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mls-listings/${slugAddress}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.listing ?? null;
  } catch (err) {
    console.error("❌ Failed to fetch enriched listing:", err);
    return null;
  }
}

export default function ListingMapPage({
  params,
}: {
  params: Promise<{ slugAddress: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [listing, setListing] = useState<IListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    async function loadListing() {
      const data = await getEnrichedListing(resolvedParams.slugAddress);
      setListing(data);
      setLoading(false);
    }

    loadListing();
  }, [resolvedParams.slugAddress]);

  if (!mounted || loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-neutral-400">Loading map view...</p>
        </div>
      </div>
    );
  }

  if (!listing || !listing.latitude || !listing.longitude) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-xl text-neutral-300">Map location not available</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const mapListing = {
    _id: listing._id?.toString() || listing.listingKey,
    listingKey: listing.listingKey,
    slug: listing.slug,
    slugAddress: listing.slugAddress || listing.slug,
    latitude: listing.latitude,
    longitude: listing.longitude,
    city: listing.city,
    subdivisionName: listing.subdivisionName,
    propertyType: listing.propertyType,
    propertySubType: listing.propertySubType,
    address: listing.unparsedAddress || listing.unparsedFirstLineAddress || listing.address || "Unknown",
    listPrice: listing.listPrice,
    bedroomsTotal: listing.bedroomsTotal,
    bathroomsTotalInteger: listing.bathroomsTotalInteger,
    livingArea: listing.livingArea,
    primaryPhotoUrl: listing.primaryPhotoUrl,
  };

  return (
    <div className="h-screen w-screen relative bg-black">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-50 bg-black/80 backdrop-blur-lg px-4 py-3 rounded-lg border border-neutral-700 hover:border-emerald-500 transition-all flex items-center gap-2 group"
      >
        <ArrowLeft className="w-5 h-5 text-neutral-300 group-hover:text-emerald-400 transition-colors" />
        <span className="text-sm text-white font-medium">Back to Listing</span>
      </motion.button>

      {/* Property Info Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-lg px-6 py-3 rounded-lg border border-neutral-700 max-w-md"
      >
        <p className="text-white font-medium truncate">{mapListing.address}</p>
        <p className="text-emerald-400 text-sm">
          ${listing.listPrice?.toLocaleString()} • {listing.bedroomsTotal} bed • {listing.bathroomsTotalInteger} bath
        </p>
      </motion.div>

      {/* Map */}
      <MapView
        listings={[mapListing]}
        centerLat={listing.latitude}
        centerLng={listing.longitude}
        zoom={16}
        onSelectListing={() => {}}
        selectedListing={null}
        onBoundsChange={() => {}}
        panelOpen={false}
        mapStyle="toner"
      />
    </div>
  );
}
