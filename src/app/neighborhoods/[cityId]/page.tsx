// src\app\neighborhoods\[cityId]\page.tsx

import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { findCountyBySlug, soCalCounties, CountyCity } from "@/app/constants/counties";
import CountyCityGrid from "@/app/components/neighborhoods/CountyCityGrid";
import CityPageClient from "./CityPageClient";
import dbConnect from "@/lib/mongoose";
import { City } from "@/models/cities";

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

  // Convert MongoDB document to a plain serializable object
  const serializedCityDoc = cityDoc
    ? {
        ...cityDoc,
        _id: cityDoc._id.toString(),
        createdAt: cityDoc.createdAt?.toISOString() || null,
        updatedAt: cityDoc.updatedAt?.toISOString() || null,
        lastUpdated: cityDoc.lastUpdated?.toISOString() || null,
      }
    : null;

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
    <CityPageClient
      city={city}
      countyName={countyName}
      cityId={cityId}
      cityDoc={serializedCityDoc}
      initialStats={initialStats}
    />
  );
}
