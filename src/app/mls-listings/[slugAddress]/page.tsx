// src/app/mls-listings/[slugAddress]/page.tsx

import { notFound } from "next/navigation";
import CollageHero from "@/app/components/mls/CollageHero";
import FactsGrid from "@/app/components/mls/FactsGrid";
import ListingDescription from "@/app/components/mls/ListingDescription";
import dbConnect from "@/lib/mongoose";

import { Listing, IListing } from "@/models/listings";
import { getPublicRemarks } from "@/app/utils/spark/getPublicRemarks";
import { fetchListingPhotos } from "@/app/utils/spark/photos";
import type { SparkPhoto } from "@/types/photo";

interface ListingPageProps {
  params: { slugAddress: string };
}

function formatListedDate(input?: string | Date): string {
  if (!input) return "Listed date unknown";
  const date = typeof input === "string" ? new Date(input) : input;
  if (isNaN(date.getTime())) return "Listed date unknown";
  return `Listed on ${date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;
}

export default async function ListingPage({ params }: ListingPageProps) {
  await dbConnect();

  const listing: IListing | null = await Listing.findOne({
    slugAddress: params.slugAddress,
  })
    .lean()
    .exec();

  if (!listing) return notFound();

  const rawPhotos = await fetchListingPhotos(listing.slug);
  const photos: {
    uri2048?: string;
    uri1600?: string;
    uri1280?: string;
    uri1024?: string;
    uri800?: string;
    uri640?: string;
    uri300?: string;
    uriThumb?: string;
    uriLarge?: string;
    caption: string;
  }[] = (rawPhotos || []).map((p: SparkPhoto) => ({
    uri2048: p.Uri2048,
    uri1600: p.Uri1600,
    uri1280: p.Uri1280,
    uri1024: p.Uri1024,
    uri800: p.Uri800,
    uri640: p.Uri640,
    uri300: p.Uri300,
    uriThumb: p.UriThumb,
    uriLarge: p.UriLarge,
    caption: p.Caption || "",
  }));

  const publicRemarks = await getPublicRemarks(listing.slug);

  const mediaForCollage = photos.map((p) => ({
    type: "photo" as const,
    src:
      p.uri2048 ??
      p.uri1600 ??
      p.uri1280 ??
      p.uri1024 ??
      p.uri800 ??
      p.uriThumb ??
      p.uriLarge ??
      "/images/no-photo.png",
    alt: p.caption || "Listing photo",
  }));

  return (
    <main className="w-full text-white">
      <CollageHero media={mediaForCollage} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="my-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <p className="text-2xl sm:text-3xl font-semibold">
              {listing.unparsedAddress}
            </p>
            <p className="text-sm text-white mt-1">
              MLS#: {listing.listingId} · {listing.propertyTypeLabel} ·{" "}
              {listing.propertySubType || "Unknown Subtype"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-4xl font-bold text-white">
              ${listing.listPrice?.toLocaleString()}
              {listing.propertyType?.toLowerCase().includes("lease")
                ? "/mo"
                : ""}
            </p>
            <p className="text-sm mt-2 text-white">
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  listing.status === "Active" ? "bg-green-600" : "bg-gray-600"
                }`}
              >
                {listing.status}
              </span>{" "}
              · {formatListedDate(listing.onMarketDate)}
            </p>
          </div>
        </div>

        <FactsGrid
          beds={listing.bedroomsTotal}
          baths={listing.bathroomsFull}
          halfBaths={listing.bathroomsHalf ?? 0}
          sqft={listing.livingArea}
          yearBuilt={listing.yearBuilt}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm text-white">
          {listing.yearBuilt && (
            <div>
              <strong>Year Built:</strong> {listing.yearBuilt}
            </div>
          )}
          {listing.subdivisionName && (
            <div>
              <strong>Subdivision:</strong> {listing.subdivisionName}
            </div>
          )}
          {listing.heating && (
            <div>
              <strong>Heating:</strong> {listing.heating}
            </div>
          )}
          {listing.cooling && (
            <div>
              <strong>Cooling:</strong> {listing.cooling}
            </div>
          )}
          {listing.view && (
            <div>
              <strong>View:</strong> {listing.view}
            </div>
          )}
          {listing.parkingTotal !== undefined && (
            <div>
              <strong>Parking:</strong> {listing.parkingTotal}
            </div>
          )}
        </div>

        <ListingDescription
          remarks={publicRemarks ?? "No description available."}
        />

        <div className="mt-12">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Schedule a Showing
          </button>
        </div>
      </div>
    </main>
  );
}
