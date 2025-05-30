"use client";

import { useState } from "react";
import Link from "next/link";
import type { MapListing } from "@/types/types";
import MapView from "@/app/components/mls/map/MapView";

type Props = {
  listings: MapListing[];
};

export default function MapPageClient({ listings }: Props) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [visibleListings, setVisibleListings] =
    useState<MapListing[]>(listings);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <div className="flex h-[calc(100vh-64px)] relative font-[Raleway]">
      {/* Hamburger Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 bg-black text-white p-2 rounded-md shadow lg:hidden"
      >
        ☰
      </button>

      {/* Map Section */}
      <div className="w-full lg:w-[75%]">
        <MapView listings={listings} setVisibleListings={setVisibleListings} />
      </div>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-[90%] sm:w-[70%] md:w-[60%] bg-zinc-950 text-white transform transition-transform duration-300 z-50
  ${isSidebarOpen ? "translate-x-0" : "translate-x-full"} 
  lg:static lg:translate-x-0 lg:w-[25%] lg:block lg:border-l border-zinc-800 overflow-y-auto px-4 py-6`}
      >
        <h2 className="text-lg font-semibold mb-6 text-emerald-400 tracking-wide">
          Properties in View
        </h2>
        <ul className="space-y-5">
          {visibleListings.map((listing) => (
            <li key={listing._id}>
              <Link
                href={`/mls-listings/${listing.slugAddress}`}
                className="group flex flex-col bg-zinc-900 rounded-xl overflow-hidden shadow-sm border border-zinc-800 hover:border-emerald-500 transition-all duration-200"
              >
                <img
                  src={listing.primaryPhotoUrl}
                  alt={listing.address}
                  className="w-full max-h-40 object-cover group-hover:opacity-90 transition duration-200"
                />
                <div className="p-4 space-y-2">
                  <p className="text-lg font-semibold text-white group-hover:text-emerald-400 transition">
                    ${listing.listPrice.toLocaleString()}
                  </p>
                  <p className="text-sm text-zinc-300">{listing.address}</p>
                  <div className="text-xs text-zinc-400 flex flex-wrap gap-2">
                    {listing.bedroomsTotal !== undefined && (
                      <span>{listing.bedroomsTotal} Bed</span>
                    )}
                    {listing.bathroomsFull !== undefined && (
                      <span>{listing.bathroomsFull} Bath</span>
                    )}
                    {listing.livingArea !== undefined && (
                      <span>{listing.livingArea.toLocaleString()} SqFt</span>
                    )}
                    {listing.lotSizeSqft !== undefined && (
                      <span>
                        {Math.round(listing.lotSizeSqft).toLocaleString()} Lot
                      </span>
                    )}
                    {listing.pool && <span>🏊 Pool</span>}
                    {listing.spa && <span>🧖 Spa</span>}
                  </div>
                  {listing.publicRemarks && (
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-3">
                      {listing.publicRemarks}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
