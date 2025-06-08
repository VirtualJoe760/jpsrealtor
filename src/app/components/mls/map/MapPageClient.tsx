"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { MapListing } from "@/types/types";
import MapView from "@/app/components/mls/map/MapView";
import MapToolbar from "./MapToolBar";

export default function MapPageClient() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [allListings, setAllListings] = useState<MapListing[]>([]);
  const [visibleListings, setVisibleListings] = useState<MapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyHeight = document.body.style.height;
    const originalHtmlHeight = document.documentElement.style.height;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "100vh";
    document.documentElement.style.height = "100vh";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.height = originalBodyHeight;
      document.documentElement.style.height = originalHtmlHeight;
    };
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches?.[0];
    if (touch) touchStartX.current = touch.clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches?.[0];
    if (touchStartX.current !== null && touch) {
      const deltaX = touch.clientX - touchStartX.current;
      if (deltaX > 75) setSidebarOpen(false);
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    let isMounted = true;

    async function loadListings() {
      try {
        let batch = 0;
        while (true) {
          const res = await fetch(`/api/mls-listings?batch=${batch}`, {
            cache: "no-store",
          });

          if (!res.ok) {
            console.warn(`⚠️ Batch ${batch} failed with status ${res.status}`);
            break;
          }

          const data = await res.json();
          const batchData = (data.listings || []) as any[];

          const mapped = batchData
            .filter((l) => l.latitude && l.longitude && l.listPrice && l.slug)
            .map((l) => ({
              _id: String(l._id),
              latitude: l.latitude,
              longitude: l.longitude,
              listPrice: l.listPrice,
              address:
                l.address ?? l.unparsedAddress ?? l.unparsedFirstLineAddress ?? "Unknown address",
              unparsedFirstLineAddress: l.unparsedFirstLineAddress ?? l.address ?? "Unknown address",
              primaryPhotoUrl: l.primaryPhotoUrl || "/images/no-photo.png",
              bedroomsTotal: l.bedroomsTotal ?? l.bedsTotal ?? undefined,
              bathroomsFull: l.bathroomsFull ?? undefined,
              livingArea: l.livingArea ?? l.buildingAreaTotal ?? undefined,
              lotSizeSqft: l.lotSizeSqft ?? l.lotSizeArea ?? undefined,
              pool: l.poolYn ?? false,
              spa: l.spaYn ?? false,
              listingId: l.listingId,
              slugAddress: l.slugAddress ?? undefined,
              slug: l.slug,
              publicRemarks: l.publicRemarks ?? undefined,
            }));

          if (isMounted && mapped.length > 0) {
            setAllListings((prev) => {
              const existingIds = new Set(prev.map((l) => l.listingId));
              const newListings = mapped.filter((l) => !existingIds.has(l.listingId));
              return [...prev, ...newListings];
            });

            if (loading) {
              setLoading(false);
            }
          }

          if (batchData.length < 500) break;
          batch++;
        }
      } catch (err) {
        console.error("❌ Error loading listings:", err);
        setLoading(false);
      }
    }

    loadListings();
    return () => {
      isMounted = false;
    };
  }, [loading]);

  return (
    <>
      <MapToolbar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

      <div className="flex h-[calc(100vh-64px)] relative font-[Raleway] pt-[48px] lg:pt-0 overflow-hidden overscroll-none">
        <div className="w-full lg:w-[75%] 2xl:w-[85%] relative">
          {/* 🧮 Total Listings Badge */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/70 backdrop-blur-sm text-white text-sm font-semibold px-4 py-1.5 rounded-full shadow-md border border-zinc-700">
            Total Listings in Coachella Valley: {allListings.length.toLocaleString()}
          </div>

          <MapView listings={allListings} setVisibleListings={setVisibleListings} />
        </div>

        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={toggleSidebar} />
        )}

        <aside
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`fixed top-0 right-0 h-full w-[90%] sm:w-[70%] md:w-[60%] bg-zinc-950 text-white transform transition-transform duration-300 z-40
            ${isSidebarOpen ? "translate-x-0" : "translate-x-full"} 
            lg:static lg:translate-x-0 lg:w-[25%] 2xl:w-[15%] lg:block lg:border-l border-zinc-800 overflow-y-auto px-4 py-6 pt-16 lg:pt-6 overscroll-contain`}
        >
          <div className="flex justify-end mb-2 lg:hidden">
            <button onClick={toggleSidebar} aria-label="Close Sidebar">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <h2 className="text-lg font-semibold mb-6 text-emerald-400 tracking-wide">
            Properties in View
          </h2>

          <ul className="space-y-5">
            {visibleListings.map((listing) => (
              <li key={listing._id}>
                <Link
                  href={`/mls-listings/${listing.slugAddress || listing.slug}`}
                  className="group flex flex-col bg-zinc-900 rounded-xl overflow-hidden shadow-sm border border-zinc-800 hover:border-emerald-500 transition-all duration-200"
                >
                  <img
                    src={listing.primaryPhotoUrl}
                    alt={listing.address}
                    className="w-full h-40 object-cover group-hover:opacity-90 transition duration-200"
                  />
                  <div className="p-4 space-y-2">
                    <p className="text-lg font-semibold text-white group-hover:text-emerald-400 transition">
                      ${listing.listPrice.toLocaleString()}
                    </p>
                    <p className="text-sm text-zinc-300">{listing.address}</p>
                    <div className="text-xs text-zinc-400 flex flex-wrap gap-2">
                      {listing.bedroomsTotal !== undefined && <span>{listing.bedroomsTotal} Bed</span>}
                      {listing.bathroomsFull !== undefined && <span>{listing.bathroomsFull} Bath</span>}
                      {listing.livingArea !== undefined && <span>{listing.livingArea.toLocaleString()} SqFt</span>}
                      {listing.lotSizeSqft !== undefined && (
                        <span>{Math.round(listing.lotSizeSqft).toLocaleString()} Lot</span>
                      )}
                      {listing.pool && <span>🏊 Pool</span>}
                      {listing.spa && <span>🧖 Spa</span>}
                    </div>
                    {listing.publicRemarks && (
                      <p className="text-xs text-zinc-400 mt-2 line-clamp-3">{listing.publicRemarks}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
