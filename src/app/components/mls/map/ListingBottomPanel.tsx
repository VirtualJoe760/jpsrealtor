"use client";

import { useState, useEffect } from "react";
import { X, Share2, Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { MapListing } from "@/types/types";
import type { IListing } from "@/models/listings";
import MortgageCalculator from "./MortgageCalculator";

type Props = {
  listing: MapListing;
  onClose: () => void;
  isSidebarOpen: boolean;
  isFiltersOpen: boolean;
};

export default function ListingBottomPanel({
  listing,
  onClose,
  isSidebarOpen,
  isFiltersOpen,
}: Props) {
  const [fullListing, setFullListing] = useState<IListing | null>(null);
  const [loading, setLoading] = useState(true);

  const photoUrl =
    listing.primaryPhotoUrl?.startsWith("http") ||
    listing.primaryPhotoUrl?.startsWith("/")
      ? listing.primaryPhotoUrl
      : "/images/no-photo.png";

  const address =
    fullListing?.unparsedAddress ||
    fullListing?.unparsedFirstLineAddress ||
    fullListing?.address ||
    listing.unparsedAddress ||
    listing.unparsedFirstLineAddress ||
    listing.address ||
    "Unknown address";

  useEffect(() => {
    const fetchListingDetails = async () => {
      const slug = listing.slugAddress ?? listing.slug;
      console.log("📦 Fetching full listing for slug:", slug);
      try {
        const res = await fetch(`/api/mls-listings/${slug}`);
        if (!res.ok) throw new Error("Failed to fetch full listing");
        const json = await res.json();
        console.log("✅ Fetched full listing:", json?.listing);
        setFullListing(json?.listing ?? null);
      } catch (err) {
        console.error("❌ Error fetching full listing:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchListingDetails();
  }, [listing]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, []);

  const calculateDaysOnMarket = (dateString?: string | Date) => {
    if (!dateString) return null;
    const listedDate = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - listedDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysOnMarket = calculateDaysOnMarket(fullListing?.listingContractDate);

  let lgLayoutClasses = "lg:left-[15%] lg:right-[15%]";
  if (isFiltersOpen) {
    lgLayoutClasses = "lg:left-[25%] lg:right-[15%]";
  } else if (isSidebarOpen) {
    lgLayoutClasses = "lg:left-[15%] lg:right-[25%]";
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 ${lgLayoutClasses} 2xl:right-[15%] z-50 bg-transparent text-white rounded-t-2xl shadow-lg overflow-hidden max-h-[85vh] animate-slide-up`}
    >
      <div className="w-full 2xl:max-w-5xl 2xl:mx-auto 2xl:rounded-t-2xl bg-zinc-950 border-t border-zinc-800">
        <div className="relative w-full h-44 sm:h-60 lg:h-72 2xl:h-80 rounded-t-2xl overflow-hidden">
          <Image
            src={photoUrl}
            alt={address}
            fill
            className="object-cover"
            priority
          />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 text-white">
            <div className="flex items-start justify-between pt-4">
              <div>
                <p className="text-base sm:text-xl md:text-2xl font-semibold mb-1 leading-tight">
                  {address}
                </p>
                <p className="text-2xl font-bold text-emerald-400 leading-tight">
                  ${(
                    fullListing?.listPrice ?? listing.listPrice
                  ).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                  aria-label="Share this listing"
                  onClick={() =>
                    navigator.share?.({
                      title: address,
                      url: window.location.href,
                    })
                  }
                >
                  <Share2 className="w-4 h-4 text-white" />
                </button>
                <Link
                  href="/book-appointment"
                  className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                  aria-label="Book an appointment"
                >
                  <Calendar className="w-4 h-4 text-white" />
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              {fullListing?.bedsTotal !== undefined && (
                <span className="bg-zinc-800 px-3 py-1 rounded-full">
                  {fullListing.bedsTotal} Bed
                </span>
              )}
              {fullListing?.bathroomsTotalInteger !== undefined && (
                <span className="bg-zinc-800 px-3 py-1 rounded-full">
                  {fullListing.bathroomsTotalInteger} Bath
                </span>
              )}
              {fullListing?.livingArea !== undefined && (
                <span className="bg-zinc-800 px-3 py-1 rounded-full">
                  {fullListing.livingArea.toLocaleString()} SqFt
                </span>
              )}
              {fullListing?.lotSizeArea !== undefined && (
                <span className="bg-zinc-800 px-3 py-1 rounded-full">
                  {Math.round(fullListing.lotSizeArea).toLocaleString()} Lot
                </span>
              )}
              {fullListing?.poolYn && (
                <span className="bg-zinc-800 px-3 py-1 rounded-full">🏊 Pool</span>
              )}
              {fullListing?.spaYn && (
                <span className="bg-zinc-800 px-3 py-1 rounded-full">🧖 Spa</span>
              )}
            </div>

            {fullListing?.publicRemarks && (
              <p className="text-sm text-white mt-2 line-clamp-5">
                {fullListing.publicRemarks}
              </p>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {fullListing?.subdivisionName && (
                <p>
                  <strong>Subdivision:</strong> {fullListing.subdivisionName}
                </p>
              )}
              {fullListing?.yearBuilt && (
                <p>
                  <strong>Year Built:</strong> {fullListing.yearBuilt}
                </p>
              )}
              {daysOnMarket !== null && (
                <p>
                  <strong>Days on Market:</strong> {daysOnMarket}
                </p>
              )}
              {fullListing?.parkingTotal !== undefined && (
                <p>
                  <strong>Parking:</strong> {fullListing.parkingTotal}
                </p>
              )}
              {fullListing?.heating && (
                <p>
                  <strong>Heating:</strong> {fullListing.heating}
                </p>
              )}
              {fullListing?.cooling && (
                <p>
                  <strong>Cooling:</strong> {fullListing.cooling}
                </p>
              )}
              {fullListing?.view && (
                <p>
                  <strong>View:</strong> {fullListing.view}
                </p>
              )}
              {fullListing?.flooring && (
                <p>
                  <strong>Flooring:</strong> {fullListing.flooring}
                </p>
              )}
            </div>

            {fullListing?.listOfficeName && fullListing?.listAgentName && (
              <p className="text-sm text-zinc-600 mt-4">
                Listing presented by {fullListing.listOfficeName},{" "}
                {fullListing.listAgentName}
              </p>
            )}

            <Link
              href={`/mls-listings/${listing.slugAddress ?? listing.slug}`}
              className="block text-center mt-2 bg-emerald-500 text-black font-semibold py-2 rounded-md hover:bg-emerald-400 transition"
            >
              View Full Listing
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
