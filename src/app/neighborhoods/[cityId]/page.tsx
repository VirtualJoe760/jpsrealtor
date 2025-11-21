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
    <div className="min-h-screen py-12 px-4" data-page="neighborhoods-city">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-8">
          <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
            <span>{countyName}</span>
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-2xl">{city.name}</h1>
          {city.description && (
            <p className="text-xl text-gray-300 leading-relaxed max-w-3xl">{city.description}</p>
          )}
          {city.population && (
            <p className="text-lg text-gray-400 mt-3">
              Population: <span className="font-semibold text-white">{city.population.toLocaleString()}</span>
            </p>
          )}
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Map View */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Listings in {city.name}</h2>
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
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
              Ready to Make Your Move in {city.name}?
            </h2>
            <p className="text-lg text-gray-300 mb-8 text-center max-w-3xl mx-auto">
              Whether you're buying your dream home or selling your property, Joey Sardella is your trusted local expert in {city.name}.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href={`/neighborhoods/${cityId}/buy`}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl text-lg"
              >
                Buy a Home in {city.name}
              </Link>
              <Link
                href={`/neighborhoods/${cityId}/sell`}
                className="px-8 py-4 bg-gray-800/70 backdrop-blur-sm border border-gray-700 hover:bg-gray-700/70 text-white font-bold rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl text-lg"
              >
                Sell Your {city.name} Home
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
