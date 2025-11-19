"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import SubdivisionListings from "@/app/components/subdivisions/SubdivisionListings";
import SubdivisionPhotoCarousel from "@/app/components/subdivisions/SubdivisionPhotoCarousel";
import SubdivisionReviews from "@/app/components/subdivisions/SubdivisionReviews";
import SubdivisionForum from "@/app/components/subdivisions/SubdivisionForum";
import SubdivisionStats from "@/app/components/subdivisions/SubdivisionStats";

// Dynamically import map component with no SSR
const SubdivisionMap = dynamic(
  () => import("@/app/components/subdivisions/SubdivisionMap"),
  { ssr: false }
);

interface SubdivisionPageClientProps {
  cityId: string;
  slug: string;
  subdivision: any;
}

export default function SubdivisionPageClient({
  cityId,
  slug,
  subdivision,
}: SubdivisionPageClientProps) {
  return (
    <div className="min-h-screen bg-black">
      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">{subdivision.name}</h1>
          <p className="text-xl text-gray-300">
            {subdivision.city}, {subdivision.region}
          </p>
        </div>

        {/* Photo Carousel */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Featured Listings</h2>
          <SubdivisionPhotoCarousel
            subdivisionSlug={slug}
            subdivisionName={subdivision.name}
            limit={20}
          />
        </div>

        {/* Stats with Toggle */}
        <SubdivisionStats
          subdivisionSlug={slug}
          initialStats={{
            listingCount: subdivision.listingCount,
            avgPrice: subdivision.avgPrice,
            medianPrice: subdivision.medianPrice,
            priceRange: subdivision.priceRange,
          }}
        />

        {/* Description */}
        {subdivision.description && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">About {subdivision.name}</h2>
            <p className="text-gray-300 leading-relaxed">{subdivision.description}</p>

            {/* Features */}
            {subdivision.features && subdivision.features.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Features & Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {subdivision.features.map((feature: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-indigo-900/50 text-indigo-300 border border-indigo-700 rounded-full text-sm font-medium"
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
                <h3 className="text-lg font-semibold text-white mb-2">Community Features</h3>
                <p className="text-gray-300">{subdivision.communityFeatures}</p>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        {subdivision.coordinates && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Location & Listings Map</h2>
            <SubdivisionMap
              subdivisionSlug={slug}
              subdivision={{
                name: subdivision.name,
                coordinates: subdivision.coordinates,
              }}
              height="500px"
            />
          </div>
        )}

        {/* Listings */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Available Homes</h2>
          <SubdivisionListings subdivisionSlug={slug} />
        </div>

        {/* Reviews Section */}
        <div className="mb-8">
          <SubdivisionReviews
            subdivisionName={subdivision.name}
            subdivisionSlug={slug}
          />
        </div>

        {/* Forum Section */}
        <div className="mb-8">
          <SubdivisionForum
            subdivisionName={subdivision.name}
            subdivisionSlug={slug}
          />
        </div>

        {/* Branded Buy/Sell CTA Section */}
        <div className="mt-16 mb-8">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border-2 border-gray-700 rounded-2xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
              Interested in {subdivision.name}?
            </h2>
            <p className="text-lg text-gray-300 mb-8 text-center max-w-3xl mx-auto">
              Whether you're looking to buy or sell in this exclusive community, Joey Sardella has the local expertise to guide you through every step of the process.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href={`/neighborhoods/${cityId}/${slug}/buy`}
                className="group relative px-8 py-4 bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 text-lg border border-gray-600"
              >
                <span className="relative z-10">🏡 Buy in {subdivision.name}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-200 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              </Link>
              <Link
                href={`/neighborhoods/${cityId}/${slug}/sell`}
                className="group relative px-8 py-4 bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 text-lg border border-gray-600"
              >
                <span className="relative z-10">💰 Sell Your Home Here</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-200 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              </Link>
            </div>
            <p className="text-sm text-gray-400 mt-6 text-center">
              Community specialist • Professional marketing • Expert negotiation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
