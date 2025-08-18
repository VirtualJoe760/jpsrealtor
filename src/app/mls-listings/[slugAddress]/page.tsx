// src/app/mls-listings/[slugAddress]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import CollageHero from "@/app/components/mls/CollageHero";
import { fetchListingPhotos } from "@/app/utils/spark/photos";
import type { IListing } from "@/models/listings";
import { SparkPhoto } from "@/types/photo";
import ListingClient from "@/app/components/mls/ListingClient";
import Footer from "@/app/components/Footer";

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

function formatPhotos(photos: SparkPhoto[], fallbackUrl: string) {
  return photos.length
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
          fallbackUrl,
        alt: p.Caption || "Listing photo",
      }))
    : [
        {
          type: "photo" as const,
          src: fallbackUrl,
          alt: "Listing cover photo",
        },
      ];
}

// ✅ Dynamic SEO metadata
export async function generateMetadata({
  params,
}: {
  params: { slugAddress: string };
}): Promise<Metadata> {
  const listing = await getEnrichedListing(params.slugAddress);

  if (!listing) return { title: "Listing Not Found" };

  const address =
    listing.unparsedAddress ||
    listing.unparsedFirstLineAddress ||
    listing.address ||
    "Unknown address";

  const title = `${address} - $${listing.listPrice?.toLocaleString() || "Price Unavailable"}`;
  const description =
    listing.publicRemarks?.substring(0, 150) || "View property details, photos, and more.";

  const image = listing.primaryPhotoUrl || "/images/no-photo.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: address,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
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

  let rawPhotos: SparkPhoto[] = [];
  try {
    rawPhotos = await fetchListingPhotos(listing.slug);
  } catch (err) {
    console.warn(`📛 Could not load photos for listing ${listing.slug}:`, err);
    rawPhotos = [];
  }

  const media = formatPhotos(rawPhotos, listing.primaryPhotoUrl || "/images/no-photo.png");

  return (
    <main className="w-full bg-black text-white">
      <ListingClient listing={listing} media={media} address={address} />
      <Footer />
    </main>
  );
}
