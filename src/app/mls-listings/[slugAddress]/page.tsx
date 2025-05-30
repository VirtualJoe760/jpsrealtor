import { notFound } from "next/navigation";
import CollageHero from "@/app/components/mls/CollageHero";
import FactsGrid from "@/app/components/mls/FactsGrid";
import FeatureList from "@/app/components/mls/FeatureList";
import ListingDescription from "@/app/components/mls/ListingDescription";
import type { Photo } from "@/types/listing";
import type { IListing } from "@/models/listings";

interface ListingPageProps {
  params: { slugAddress: string };
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
        <div className="my-6">
          <p className="text-2xl sm:text-3xl font-semibold">{listing.address}</p>
          <p className="text-sm text-gray-300 mt-1">MLS#: {listing.listingId}</p>
        </div>

        <FactsGrid
          beds={listing.bedroomsTotal}
          baths={listing.bathroomsFull}
          halfBaths={0}
          sqft={listing.livingArea}
          yearBuilt={undefined}
        />

        <FeatureList
          architecture=""
          fireplaces={0}
          heating=""
          cooling=""
          pool={false}
          spa=""
          view=""
          furnished=""
          hoaFee={undefined}
          hoaFreq=""
        />

          <ListingDescription remarks={listing.publicRemarks ?? "No description available."} />


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
