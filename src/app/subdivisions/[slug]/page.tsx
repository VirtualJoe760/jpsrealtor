// src/app/subdivisions/[slug]/page.tsx
// Subdivision detail page

import { Metadata } from "next";
import dynamic from "next/dynamic";
import SubdivisionListings from "@/app/components/subdivisions/SubdivisionListings";
import SubdivisionPhotoCarousel from "@/app/components/subdivisions/SubdivisionPhotoCarousel";
import SubdivisionReviews from "@/app/components/subdivisions/SubdivisionReviews";
import SubdivisionForum from "@/app/components/subdivisions/SubdivisionForum";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";

// Dynamically import map component with no SSR
const SubdivisionMap = dynamic(
  () => import("@/app/components/subdivisions/SubdivisionMap"),
  { ssr: false }
);

interface SubdivisionPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: SubdivisionPageProps): Promise<Metadata> {
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug: params.slug }).lean();

  if (!subdivision) {
    return {
      title: "Subdivision Not Found",
    };
  }

  return {
    title: `${subdivision.name} Homes for Sale | ${subdivision.city}, ${subdivision.region}`,
    description:
      subdivision.description ||
      `Browse ${subdivision.listingCount} homes for sale in ${subdivision.name}, ${subdivision.city}. Average price: $${subdivision.avgPrice.toLocaleString()}`,
    keywords: subdivision.keywords?.join(", ") || undefined,
  };
}

export default async function SubdivisionPage({ params }: SubdivisionPageProps) {
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug: params.slug }).lean();

  if (!subdivision) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Subdivision Not Found</h1>
        <p className="text-gray-600">The subdivision you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{subdivision.name}</h1>
          <p className="text-xl text-gray-600">
            {subdivision.city}, {subdivision.region}
          </p>
        </div>

        {/* Photo Carousel */}
        <div className="mb-8">
          <SubdivisionPhotoCarousel
            subdivisionSlug={params.slug}
            subdivisionName={subdivision.name}
            limit={20}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Active Listings</div>
            <div className="text-3xl font-bold text-blue-600">
              {subdivision.listingCount}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Average Price</div>
            <div className="text-3xl font-bold text-green-600">
              ${(subdivision.avgPrice / 1000).toFixed(0)}k
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Price Range</div>
            <div className="text-xl font-bold text-gray-900">
              ${(subdivision.priceRange.min / 1000).toFixed(0)}k -{" "}
              ${(subdivision.priceRange.max / 1000000).toFixed(1)}M
            </div>
          </div>
          {subdivision.medianPrice && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Median Price</div>
              <div className="text-3xl font-bold text-gray-900">
                ${(subdivision.medianPrice / 1000).toFixed(0)}k
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {subdivision.description && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About {subdivision.name}</h2>
            <p className="text-gray-700 leading-relaxed">{subdivision.description}</p>

            {/* Features */}
            {subdivision.features && subdivision.features.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Features & Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {subdivision.features.map((feature, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Community Features */}
            {subdivision.communityFeatures && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Community Features</h3>
                <p className="text-gray-600">{subdivision.communityFeatures}</p>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        {subdivision.coordinates && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Location</h2>
            <SubdivisionMap
              subdivision={{
                name: subdivision.name,
                coordinates: subdivision.coordinates,
              }}
              listings={[]}
              height="500px"
            />
          </div>
        )}

        {/* Listings */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Homes</h2>
          <SubdivisionListings subdivisionSlug={params.slug} />
        </div>

        {/* Reviews Section */}
        <div className="mb-8">
          <SubdivisionReviews
            subdivisionName={subdivision.name}
            subdivisionSlug={params.slug}
          />
        </div>

        {/* Forum Section */}
        <div className="mb-8">
          <SubdivisionForum
            subdivisionName={subdivision.name}
            subdivisionSlug={params.slug}
          />
        </div>
      </div>
    </div>
  );
}
