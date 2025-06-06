"use client";

import { useState, useEffect, useRef } from "react";
import { X, Share2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { MapListing } from "@/types/types";
import type { IListing } from "@/models/listings";
import { fetchPrimaryPhotoUrl } from "@/app/utils/spark/fetchPrimaryPhoto";
import { fetchListingPhotos } from "@/app/utils/spark/photos";
import MortgageCalculator from "./MortgageCalculator";

type Props = {
  listing: MapListing;
  onClose: () => void;
};

export default function ListingBottomPanel({ listing, onClose }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string>(listing.primaryPhotoUrl || "/images/no-photo.png");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [fullListing, setFullListing] = useState<IListing | null>(null);

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
      try {
        const res = await fetch(`/api/mls-listings/${listing.slugAddress ?? listing.slug}`);
        if (!res.ok) throw new Error("Failed to fetch full listing");
        const json = await res.json();
        setFullListing(json?.listing ?? null);
      } catch (err) {
        console.error("❌ Error fetching full listing:", err);
      }
    };

    fetchListingDetails();
  }, [listing]);

  useEffect(() => {
    setPhotoUrl(listing.primaryPhotoUrl || "/images/no-photo.png");
  }, [listing]);

  useEffect(() => {
    const needsFetching = !listing.primaryPhotoUrl || listing.primaryPhotoUrl === "/images/no-photo.png";
    if (!needsFetching) return;

    let cancelled = false;
    const loadPhoto = async () => {
      try {
        const url = await fetchPrimaryPhotoUrl(String(listing.slug));
        if (!cancelled) setPhotoUrl(url);
      } catch (err) {
        console.warn("Photo fetch failed:", err);
      }
    };
    loadPhoto();
    return () => {
      cancelled = true;
    };
  }, [listing.slug, listing.primaryPhotoUrl]);

  useEffect(() => {
    const loadAllPhotos = async () => {
      try {
        const photos = await fetchListingPhotos(String(listing.slug));
        const urls = photos.map((p: any) => p.Uri800 || p.UriLarge || p.UriThumb).filter(Boolean);
        setPhotoUrls(urls);
        setCurrentPhotoIndex(0);
      } catch (err) {
        console.warn("Could not load full photo set:", err);
      }
    };
    loadAllPhotos();
  }, [listing.slug]);

  const calculateDaysOnMarket = (dateString?: string | Date) => {
    if (!dateString) return null;
    const listedDate = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - listedDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysOnMarket = calculateDaysOnMarket(fullListing?.listingContractDate);
  const displayPhoto = photoUrls[currentPhotoIndex] || photoUrl;

  const goPrev = () => setCurrentPhotoIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length);
  const goNext = () => setCurrentPhotoIndex((prev) => (prev + 1) % photoUrls.length);

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:right-[25%] 2xl:right-[15%] z-50 bg-transparent text-white rounded-t-2xl shadow-lg overflow-hidden max-h-[85vh] animate-slide-up">
      <div className="w-full 2xl:max-w-5xl 2xl:mx-auto 2xl:rounded-t-2xl bg-zinc-950 border-t border-zinc-800">

        {/* Photo Carousel */}
        <div className="relative">
          <img src={displayPhoto} alt={address} className="h-52 w-full sm:h-60 lg:h-72 2xl:h-80 object-cover" />
          <button onClick={onClose} aria-label="Close" className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
            <X className="w-5 h-5 text-white" />
          </button>

          {photoUrls.length > 1 && (
            <>
              <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-1 rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-1 rounded-full">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Header: Address + Action Icons */}
        <div className="flex items-start justify-between p-5 pt-4">
          <div>
            <p className="text-lg sm:text-xl md:text-2xl font-semibold mb-1 leading-tight">{address}</p>
            <p className="text-2xl font-bold text-emerald-400 leading-tight">
              ${(fullListing?.listPrice ?? listing.listPrice).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
              aria-label="Share this listing"
              onClick={() => navigator.share?.({ title: address, url: window.location.href })}
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

        {/* Details Section */}
        <div className="px-5 pb-5 space-y-3 text-white">
          <div className="flex flex-wrap gap-2 text-sm">
            {fullListing?.bedsTotal !== undefined && <span className="bg-zinc-800 px-3 py-1 rounded-full">{fullListing.bedsTotal} Bed</span>}
            {fullListing?.bathroomsTotalInteger !== undefined && <span className="bg-zinc-800 px-3 py-1 rounded-full">{fullListing.bathroomsTotalInteger} Bath</span>}
            {fullListing?.livingArea !== undefined && <span className="bg-zinc-800 px-3 py-1 rounded-full">{fullListing.livingArea.toLocaleString()} SqFt</span>}
            {fullListing?.lotSizeArea !== undefined && <span className="bg-zinc-800 px-3 py-1 rounded-full">{Math.round(fullListing.lotSizeArea).toLocaleString()} Lot</span>}
            {fullListing?.poolYn && <span className="bg-zinc-800 px-3 py-1 rounded-full">🏊 Pool</span>}
            {fullListing?.spaYn && <span className="bg-zinc-800 px-3 py-1 rounded-full">🧖 Spa</span>}
          </div>

          {fullListing?.publicRemarks && (
            <p className="text-sm text-white mt-2 line-clamp-5">{fullListing.publicRemarks}</p>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {fullListing?.subdivisionName && <p><strong>Subdivision:</strong> {fullListing.subdivisionName}</p>}
            {fullListing?.yearBuilt && <p><strong>Year Built:</strong> {fullListing.yearBuilt}</p>}
            {daysOnMarket !== null && <p><strong>Days on Market:</strong> {daysOnMarket}</p>}
            {fullListing?.parkingTotal !== undefined && <p><strong>Parking:</strong> {fullListing.parkingTotal}</p>}
            {fullListing?.heating && <p><strong>Heating:</strong> {fullListing.heating}</p>}
            {fullListing?.cooling && <p><strong>Cooling:</strong> {fullListing.cooling}</p>}
            {fullListing?.view && <p><strong>View:</strong> {fullListing.view}</p>}
            {fullListing?.flooring && <p><strong>Flooring:</strong> {fullListing.flooring}</p>}
          </div>

          {fullListing?.listOfficeName && fullListing?.listAgentName && (
            <p className="text-sm text-zinc-600 mt-4">
              Listing presented by {fullListing.listOfficeName}, {fullListing.listAgentName}
            </p>
          )}

          <MortgageCalculator />

          <Link
            href={`/mls-listings/${listing.slugAddress ?? listing.slug}`}
            className="block text-center mt-2 bg-emerald-500 text-black font-semibold py-2 rounded-md hover:bg-emerald-400 transition"
          >
            View Full Listing
          </Link>
        </div>
      </div>
    </div>
  );
}
