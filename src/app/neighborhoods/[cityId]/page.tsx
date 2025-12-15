// src\app\neighborhoods\[cityId]\page.tsx

import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import CityPageClient from "./CityPageClient";
import dbConnect from "@/lib/mongoose";
import { City } from "@/models/cities";

interface CityData {
  name: string;
  slug: string;
  listings: number;
}

interface CountyData {
  name: string;
  slug: string;
  listings: number;
  cities: CityData[];
}

interface RegionData {
  name: string;
  slug: string;
  listings: number;
  counties: CountyData[];
}

// Types for different page types
type PageType = 'city' | 'county' | 'region';

interface PageData {
  type: PageType;
  city?: CityData;
  countyName?: string;
  county?: CountyData;
  region?: RegionData;
}

// Fetch data from neighborhoods API (handles cities, counties, and regions)
async function getPageDataFromAPI(slug: string): Promise<PageData | null> {
  try {
    const response = await fetch(`http://localhost:3000/api/neighborhoods/directory`, {
      cache: 'no-store'
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.success || !data.data) return null;

    const regions = data.data as RegionData[];

    // Check if it's a region slug
    const region = regions.find(r => r.slug === slug);
    if (region) {
      return { type: 'region', region };
    }

    // Check if it's a county slug (ends with -county)
    for (const region of regions) {
      const county = region.counties.find((c: CountyData) => c.slug === slug);
      if (county) {
        return { type: 'county', county, region };
      }
    }

    // Check if it's a city slug
    for (const region of regions) {
      for (const county of region.counties) {
        const city = county.cities.find((c: CityData) => c.slug === slug);
        if (city) {
          return { type: 'city', city, countyName: county.name };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching data from API:', error);
    return null;
  }
}

// Generate metadata for the page (city, county, or region)
export async function generateMetadata({ params }: { params: Promise<{ cityId: string }> }): Promise<Metadata> {
  const { cityId } = await params;

  // Fetch page data from API
  const pageData = await getPageDataFromAPI(cityId);

  if (!pageData) {
    return {
      title: 'Not Found',
      description: 'The requested page could not be found.',
    };
  }

  if (pageData.type === 'city' && pageData.city) {
    return {
      title: `${pageData.city.name} Real Estate | ${pageData.countyName}`,
      description: `Explore homes and properties in ${pageData.city.name}, ${pageData.countyName}. Browse ${pageData.city.listings.toLocaleString()} active listings.`,
    };
  }

  if (pageData.type === 'county' && pageData.county) {
    const citiesCount = pageData.county.cities.length;
    return {
      title: `${pageData.county.name} Real Estate | California Homes`,
      description: `Explore ${pageData.county.listings.toLocaleString()} active listings across ${citiesCount} cities in ${pageData.county.name}. Find your perfect home in California.`,
    };
  }

  if (pageData.type === 'region' && pageData.region) {
    const countiesCount = pageData.region.counties.length;
    return {
      title: `${pageData.region.name} Real Estate | California Properties`,
      description: `Discover ${pageData.region.listings.toLocaleString()} homes for sale across ${countiesCount} counties in ${pageData.region.name}. Browse listings and find your dream home.`,
    };
  }

  return {
    title: 'California Real Estate',
    description: 'Find your perfect home in California',
  };
}

export default async function CityPage({ params }: { params: Promise<{ cityId: string }> }) {
  const resolvedParams = await params;
  const { cityId } = resolvedParams;

  // Fetch page data from API
  const pageData = await getPageDataFromAPI(cityId);

  // Handle not found
  if (!pageData) {
    notFound(); // Returns a 404 page
  }

  // Handle region pages - regions are shown in the directory, not as individual pages
  if (pageData.type === 'region' && pageData.region) {
    // Redirect to neighborhoods directory
    notFound();
  }

  // Handle county pages - use CountyCityGrid component
  if (pageData.type === 'county' && pageData.county) {
    const CountyCityGrid = require('@/app/components/neighborhoods/CountyCityGrid').default;
    return <CountyCityGrid county={pageData.county} />;
  }

  // Handle city pages - existing functionality
  if (pageData.type === 'city' && pageData.city) {
    const { city, countyName } = pageData;

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
        countyName={countyName!}
        cityId={cityId}
        cityDoc={serializedCityDoc}
        initialStats={initialStats}
      />
    );
  }

  // Fallback - should never reach here
  notFound();
}
