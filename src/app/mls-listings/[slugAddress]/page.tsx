// src/app/mls-listings/[slugAddress]/page.tsx

import { notFound } from "next/navigation";
import CollageHero from "@/app/components/mls/CollageHero";
import FactsGrid from "@/app/components/mls/FactsGrid";
import FeatureList from "@/app/components/mls/FeatureList";
import ListingDescription from "@/app/components/mls/ListingDescription";
import PropertyDetailsGrid from "@/app/components/mls/PropertyDetailsGrid";
import SchoolInfo from "@/app/components/mls/SchoolInfo";
import FinancialSummary from "@/app/components/mls/FinancialSummary";
import { getPublicRemarks } from "@/app/utils/spark/getPublicRemarks";
import type { Photo } from "@/types/listing";
import type { IListing } from "@/models/listings";

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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";


  const [
    listingRes,
    photosRes,
    documentsRes,
    virtualToursRes,
    openHousesRes,
    videoRes,
  ] = await Promise.all([
    fetch(`${baseUrl}/api/mls-listings/${params.slugAddress}`, { cache: "no-store" }),
    fetch(`${baseUrl}/api/mls-listings/${params.slugAddress}/photos`, { cache: "no-store" }),
    fetch(`${baseUrl}/api/mls-listings/${params.slugAddress}/documents`, { cache: "no-store" }),
    fetch(`${baseUrl}/api/mls-listings/${params.slugAddress}/virtualtours`, { cache: "no-store" }),
    fetch(`${baseUrl}/api/mls-listings/${params.slugAddress}/openhouses`, { cache: "no-store" }),
    fetch(`${baseUrl}/api/mls-listings/${params.slugAddress}/videos`, { cache: "no-store" }),
  ]);

  if (!listingRes.ok) return notFound();

  const { listing }: { listing: IListing } = await listingRes.json();
  const { photos }: { photos: Photo[] } = photosRes.ok ? await photosRes.json() : { photos: [] };
  const { videos }: { videos: any[] } = videoRes.ok ? await videoRes.json() : { videos: [] };
  const documentsData = documentsRes.ok ? await documentsRes.json() : { documents: [] };
  const virtualToursData = virtualToursRes.ok ? await virtualToursRes.json() : { virtualTours: [] };
  const openHousesData = openHousesRes.ok ? await openHousesRes.json() : { openHouses: [] };

  if (!listing) return notFound();

  // ✅ Use ListingKey (aka slug) to get public remarks from Spark
  const publicRemarks = await getPublicRemarks(listing.slug);

  const mediaForCollage = [
    ...(videos.length > 0
      ? [{
          type: "video" as const,
          src: videos[0].ObjectHtml || videos[0].Uri || "",
          alt: videos[0].Name || "Property Video",
        }]
      : []),
    ...photos.map((p) => ({
      type: "photo" as const,
      src: p.uri2048 ?? p.uri800,
      alt: p.caption || "Listing photo",
    })),
  ];

  return (
    <main className="w-full text-white">
      <CollageHero media={mediaForCollage} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="my-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <p className="text-2xl sm:text-3xl font-semibold">{listing.address}</p>
            <p className="text-sm text-white mt-1">
              MLS#: {listing.listingId} · {listing.propertyType || "Unknown Type"} · {listing.propertySubType || "Unknown Subtype"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-4xl font-bold text-white">
              ${listing.listPrice?.toLocaleString()}
              {listing.propertyType?.toLowerCase().includes("lease") ? "/mo" : ""}
            </p>
            <p className="text-sm mt-2 text-white">
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  listing.status === "Active" ? "bg-green-600 text-white" : "bg-gray-600 text-white"
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

        <FeatureList
          architecture={listing.subdivisionName || ""}
          fireplaces={0}
          heating={listing.heating || ""}
          cooling={listing.cooling || ""}
          pool={listing.pool}
          spa={listing.spa ? "Yes" : "No"}
          view={listing.view || ""}
          furnished={listing.furnished || ""}
          hoaFee={listing.hoaFee}
          hoaFreq={listing.hoaFeeFrequency || ""}
        />

        <ListingDescription remarks={publicRemarks ?? "No description available."} />

        <PropertyDetailsGrid listing={listing} />
        <FinancialSummary listing={listing} />
        <SchoolInfo listing={listing} />

        {virtualToursData.virtualTours.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-2">Virtual Tours</h2>
            <ul className="list-disc list-inside">
              {virtualToursData.virtualTours.map((tour: any) => (
                <li key={tour.Id}>
                  <a
                    href={tour.ResourceUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                  >
                    {tour.Name || "View Virtual Tour"}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {documentsData.documents.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-2">Attached Documents</h2>
            <ul className="list-disc list-inside">
              {documentsData.documents.map((doc: any) => (
                <li key={doc.Id}>
                  <a
                    href={doc.Uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                  >
                    {doc.Name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {openHousesData.openHouses.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-2">Upcoming Open Houses</h2>
            <ul className="list-disc list-inside">
              {openHousesData.openHouses.map((oh: any) => (
                <li key={oh.Id}>
                  {oh.Date} from {oh.StartTime} to {oh.EndTime}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-12">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Schedule a Showing
          </button>
        </div>
      </div>
    </main>
  );
}
