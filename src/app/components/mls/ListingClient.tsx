// src/app/components/mls/ListingClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Phone, MapPinned, Share2 } from "lucide-react";

import CollageHero from "@/app/components/mls/CollageHero";
import MortgageCalculator from "@/app/components/mls/map/MortgageCalculator";
import ListingAttribution from "@/app/components/mls/ListingAttribution";
import type { IListing } from "@/models/listings";

function calculateDaysOnMarket(dateString?: string | Date) {
  if (!dateString) return null;
  const listedDate = new Date(dateString);
  const today = new Date();
  const diffTime = today.getTime() - listedDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export default function ListingClient({
  listing,
  media,
  address,
}: {
  listing: IListing;
  media: {
    type: "photo";
    src: string;
    alt: string;
  }[];
  address: string;
}) {
  const [copied, setCopied] = useState(false);
  const daysOnMarket = calculateDaysOnMarket(listing.listingContractDate);

  return (
    <div>
      <CollageHero media={media} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <p className="text-4xl font-semibold leading-tight">{address}</p>
            <p className="text-sm text-zinc-400 mt-1">
              MLS#: {listing.listingId} · {listing.propertyTypeLabel} ·{" "}
              {listing.propertySubType || "Unknown Subtype"}
            </p>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          <p className="text-5xl pb-3 font-extrabold text-emerald-400 tracking-tight">
            ${listing.listPrice?.toLocaleString()}
            {listing.propertyType?.toLowerCase().includes("lease") ? "/mo" : ""}
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                listing.standardStatus === "Active" ? "bg-green-600" : "bg-gray-600"
              }`}
            >
              {listing.standardStatus}
            </span>{" "}
            ·{" "}
            {daysOnMarket !== null ? `${daysOnMarket} days on market` : "Listed date unknown"}
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2 text-sm mb-6">
          {listing.bedsTotal !== undefined && (
            <span className="bg-zinc-800 px-3 py-1 rounded-full">{listing.bedsTotal} Bed</span>
          )}
          {listing.bathroomsTotalInteger !== undefined && (
            <span className="bg-zinc-800 px-3 py-1 rounded-full">
              {listing.bathroomsTotalInteger} Bath
            </span>
          )}
          {listing.livingArea !== undefined && (
            <span className="bg-zinc-800 px-3 py-1 rounded-full">
              {listing.livingArea.toLocaleString()} SqFt
            </span>
          )}
          {listing.lotSizeArea !== undefined && (
            <span className="bg-zinc-800 px-3 py-1 rounded-full">
              {Math.round(listing.lotSizeArea).toLocaleString()} Lot
            </span>
          )}
          {listing.poolYn && <span className="bg-zinc-800 px-3 py-1 rounded-full">🏊 Pool</span>}
          {listing.spaYn && <span className="bg-zinc-800 px-3 py-1 rounded-full">🧖 Spa</span>}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Link
            href="/book-appointment"
            className="flex items-center justify-center h-12 rounded-full border border-white bg-black text-white hover:bg-white hover:text-black transition"
            aria-label="Schedule Showing"
          >
            <Calendar className="w-5 h-5" />
          </Link>

          <a
            href="tel:7603333676"
            className="flex items-center justify-center h-12 rounded-full border border-white bg-black text-white hover:bg-white hover:text-black transition"
            aria-label="Call Agent"
          >
            <Phone className="w-5 h-5" />
          </a>

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-12 rounded-full border border-white bg-black text-white hover:bg-white hover:text-black transition"
            aria-label="Get Directions"
          >
            <MapPinned className="w-5 h-5" />
          </a>

          <button
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center justify-center h-12 rounded-full border border-white bg-black text-white hover:bg-white hover:text-black transition relative"
            aria-label="Share Listing"
          >
            <Share2 className="w-5 h-5" />
            {copied && (
              <span className="absolute -bottom-6 text-xs bg-zinc-800 px-2 py-0.5 rounded text-white">
                Copied!
              </span>
            )}
          </button>
        </div>

        {/* Remarks */}
        {listing.publicRemarks && (
          <p className="text-lg text-white mb-6 whitespace-pre-line">{listing.publicRemarks}</p>
        )}

        {/* ✅ IDX Listing Attribution (compliant but subtle) */}
        <ListingAttribution
          listing={listing}
          className="mb-6  text-xs bg-black"
        />
        

        {/* Grid Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm mb-8">
          {listing.subdivisionName && (
            <p>
              <strong>Subdivision:</strong> {listing.subdivisionName}
            </p>
          )}
          {listing.yearBuilt && (
            <p>
              <strong>Year Built:</strong> {listing.yearBuilt}
            </p>
          )}
          {listing.parkingTotal !== undefined && (
            <p>
              <strong>Parking:</strong> {listing.parkingTotal}
            </p>
          )}
          {listing.heating && (
            <p>
              <strong>Heating:</strong> {listing.heating}
            </p>
          )}
          {listing.cooling && (
            <p>
              <strong>Cooling:</strong> {listing.cooling}
            </p>
          )}
          {listing.view && (
            <p>
              <strong>View:</strong> {listing.view}
            </p>
          )}
          {listing.flooring && (
            <p>
              <strong>Flooring:</strong> {listing.flooring}
            </p>
          )}
        </div>

        {/* (Old agent block removed; replaced by <ListingAttribution />) */}

        {/* Mortgage Calculator */}
        <div className="space-y-6">
          <MortgageCalculator />
        </div>
      </div>
    </div>
  );
}
