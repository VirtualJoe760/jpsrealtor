// src/app/mls-listings/[slugAddress]/page.tsx
import { notFound } from "next/navigation";
import CollageHero from "@/app/components/mls/CollageHero";
import MortgageCalculator from "@/app/components/mls/map/MortgageCalculator";
import Link from "next/link";

import type { IListing } from "@/models/listings";
import { fetchListingPhotos } from "@/app/utils/spark/photos";
import { SparkPhoto } from "@/types/photo";

async function getEnrichedListing(slugAddress: string): Promise<IListing | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mls-listings/${slugAddress}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.listing ?? null;
  } catch (err) {
    console.error("Failed to fetch enriched listing:", err);
    return null;
  }
}

function calculateDaysOnMarket(dateString?: string | Date) {
  if (!dateString) return null;
  const listedDate = new Date(dateString);
  const today = new Date();
  const diffTime = today.getTime() - listedDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export default async function ListingPage({
  params,
}: {
  params: { slugAddress: string };
}) {
  const listing = await getEnrichedListing(params.slugAddress);
  if (!listing) return notFound();

  const address =
    listing.unparsedAddress ||
    listing.unparsedFirstLineAddress ||
    listing.address ||
    "Unknown address";

  const rawPhotos = await fetchListingPhotos(listing.slug);
  const photos: SparkPhoto[] = rawPhotos ?? [];

  const media = photos.length
    ? photos.map((p) => ({
        type: "photo" as const,
        src:
          p.Uri2048 ||
          p.Uri1600 ||
          p.Uri1280 ||
          p.Uri1024 ||
          p.Uri800 ||
          p.UriThumb ||
          p.UriLarge ||
          "/images/no-photo.png",
        alt: p.Caption || "Listing photo",
      }))
    : [
        {
          type: "photo" as const,
          src: listing.primaryPhotoUrl || "/images/no-photo.png",
          alt: "Listing cover photo",
        },
      ];

  const daysOnMarket = calculateDaysOnMarket(listing.listingContractDate);

  return (
    <main className="w-full bg-black text-white">
      <CollageHero media={media} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <p className="text-3xl font-semibold leading-tight">{address}</p>
            <p className="text-sm text-zinc-400 mt-1">
              MLS#: {listing.listingId} · {listing.propertyTypeLabel} ·{" "}
              {listing.propertySubType || "Unknown Subtype"}
            </p>
          </div>
          <div className="text-right space-y-2">
            <p className="text-4xl font-bold text-emerald-400">
              ${listing.listPrice?.toLocaleString()}
              {listing.propertyType?.toLowerCase().includes("lease") ? "/mo" : ""}
            </p>
            <p className="text-sm">
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  listing.status === "Active" ? "bg-green-600" : "bg-gray-600"
                }`}
              >
                {listing.status}
              </span>{" "}
              · {daysOnMarket !== null ? `${daysOnMarket} days on market` : "Listed date unknown"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm mb-6">
          {listing.bedsTotal !== undefined && (
            <span className="bg-zinc-800 px-3 py-1 rounded-full">{listing.bedsTotal} Bed</span>
          )}
          {listing.bathroomsTotalInteger !== undefined && (
            <span className="bg-zinc-800 px-3 py-1 rounded-full">{listing.bathroomsTotalInteger} Bath</span>
          )}
          {listing.livingArea !== undefined && (
            <span className="bg-zinc-800 px-3 py-1 rounded-full">{listing.livingArea.toLocaleString()} SqFt</span>
          )}
          {listing.lotSizeArea !== undefined && (
            <span className="bg-zinc-800 px-3 py-1 rounded-full">
              {Math.round(listing.lotSizeArea).toLocaleString()} Lot
            </span>
          )}
          {listing.poolYn && <span className="bg-zinc-800 px-3 py-1 rounded-full">🏊 Pool</span>}
          {listing.spaYn && <span className="bg-zinc-800 px-3 py-1 rounded-full">🧖 Spa</span>}
        </div>

        {listing.publicRemarks && (
          <p className="text-sm text-white mb-6 whitespace-pre-line">{listing.publicRemarks}</p>
        )}

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

        {listing.listOfficeName && listing.listAgentName && (
          <p className="text-sm text-zinc-600 mb-4">
            Listing presented by {listing.listOfficeName}, {listing.listAgentName}
          </p>
        )}

        <div className="space-y-6">
          <MortgageCalculator />
          <Link
            href="/book-appointment"
            className="block w-full sm:w-fit text-center bg-emerald-500 text-black font-semibold py-3 px-6 rounded-md hover:bg-emerald-400 transition"
          >
            Schedule a Showing
          </Link>
        </div>
      </div>
    </main>
  );
}
