// src\app\neighborhoods\[cityId]\page.tsx

import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { findCountyBySlug, soCalCounties, CountyCity } from "@/app/constants/counties";
import CountyCityGrid from "@/app/components/neighborhoods/CountyCityGrid";
import CityMap from "@/app/components/cities/CityMap";
import CityStats from "@/app/components/cities/CityStats";
import SubdivisionsSection from "@/app/components/cities/SubdivisionsSection";
import HOASection from "@/app/components/cities/HOASection";
import dbConnect from "@/lib/mongoose";
import { City } from "@/models/cities";
import Link from "next/link";

// Helper function to find a city across all counties
function findCityById(cityId: string): { city: CountyCity; countyName: string } | null {
  for (const county of soCalCounties) {
    const city = county.cities.find((c) => c.id === cityId);
    if (city) {
      return { city, countyName: county.name };
    }
  }
  return null;
}

// Generate metadata for the city or county page
export async function generateMetadata({ params }: { params: Promise<{ cityId: string }> }): Promise<Metadata> {
  const { cityId } = await params;

  // Check if this is a county
  const county = findCountyBySlug(cityId);
  if (county) {
    return {
      title: `${county.name} Real Estate | Cities & Neighborhoods`,
      description: `Explore homes and properties across ${county.name}. ${county.description}`,
    };
  }

  // Otherwise check if it's a city
  const cityData = findCityById(cityId);
  if (!cityData) return {};

  return {
    title: `${cityData.city.name} Real Estate | ${cityData.countyName}`,
    description: `Explore homes and properties in ${cityData.city.name}, a beautiful community in ${cityData.countyName}.`,
  };
}

export default async function CityPage({ params }: { params: Promise<{ cityId: string }> }) {
  const resolvedParams = await params;
  const { cityId } = resolvedParams;

  // Check if this is a county first
  const county = findCountyBySlug(cityId);
  if (county) {
    return <CountyCityGrid county={county} />;
  }

  // Find the city data based on cityId across all counties
  const cityData = findCityById(cityId);

  // Handle city not found
  if (!cityData) {
    notFound(); // Returns a 404 page
  }

  const { city, countyName } = cityData;

  // Get city data from the Cities model
  await dbConnect();

  const cityDoc = await City.findOne({ slug: cityId }).lean().exec();

  // Fallback if city not found in database
  const initialStats = cityDoc
    ? {
        listingCount: cityDoc.listingCount,
        avgPrice: cityDoc.avgPrice,
        medianPrice: cityDoc.medianPrice || 0,
        priceRange: cityDoc.priceRange,
      }
    : {
        listingCount: 0,
        avgPrice: 0,
        medianPrice: 0,
        priceRange: { min: 0, max: 0 },
      };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-black via-gray-900/90 to-black border-b border-gray-800 text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">{countyName}</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 drop-shadow-2xl">{city.name}</h1>
            {city.description && (
              <p className="text-xl text-gray-300 leading-relaxed max-w-3xl">{city.description}</p>
            )}
            {city.population && (
              <p className="text-lg text-gray-400 mt-3">
                Population: <span className="font-semibold text-white">{city.population.toLocaleString()}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Map View */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Listings in {city.name}</h2>
          <CityMap
            cityId={cityId}
            cityName={city.name}
            coordinates={cityDoc?.coordinates}
            height="600px"
          />
        </div>

        {/* Stats with Auto-Cycling */}
        <CityStats
          cityId={cityId}
          initialStats={initialStats}
        />

        {/* Dynamic Community Data Sections */}
        <SubdivisionsSection cityId={cityId} />
        <HOASection cityId={cityId} />

        {/* Branded Buy/Sell CTA Section */}
        <div className="mt-16 mb-8">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border-2 border-gray-700 rounded-2xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
              Ready to Make Your Move in {city.name}?
            </h2>
            <p className="text-lg text-gray-300 mb-8 text-center max-w-3xl mx-auto">
              Whether you're buying your dream home or selling your property, Joey Sardella is your trusted local expert in {city.name}.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href={`/neighborhoods/${cityId}/buy`}
                className="group relative px-8 py-4 bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 text-lg border border-gray-600"
              >
                <span className="relative z-10">🏡 Buy a Home in {city.name}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-200 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              </Link>
              <Link
                href={`/neighborhoods/${cityId}/sell`}
                className="group relative px-8 py-4 bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 text-lg border border-gray-600"
              >
                <span className="relative z-10">💰 Sell Your {city.name} Home</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-200 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              </Link>
            </div>
            <p className="text-sm text-gray-400 mt-6 text-center">
              Expert service • Local market knowledge • Proven results
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
