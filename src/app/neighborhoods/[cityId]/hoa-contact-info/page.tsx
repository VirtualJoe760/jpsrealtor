import React from "react";
import VariableHero from "@/components/VariableHero";
import HoaSearch from "@/components/HoaSearch";
import masterHoaData from "@/constants/hoa/master_hoa_data_verified.json";
import { transformHoaData } from "@/utils/transformHoaData";
import { coachellaValleyCities } from "@/constants/cities";
import { Metadata } from "next";

// Generate Metadata
export async function generateMetadata({ params }: { params: { cityId: string } }): Promise<Metadata> {
  const { cityId } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);
  if (!city) {
    return {
      title: "City Not Found | JPS Realtor",
      description: "City data not found for HOA contact information.",
    };
  }

  // Transform HOA data to extract keywords
  const hoaData = transformHoaData(masterHoaData);
  const cityHoaKeywords = hoaData
    .filter((hoa) => hoa.City.toLowerCase() === city.name.toLowerCase())
    .map((hoa) => hoa["Subdivision/Countryclub"])
    .join(", ");

  return {
    title: `${city.name} HOA Contact Information | JPS Realtor`,
    description: `Find HOA contact information for subdivisions in and around ${city.name}. Get details for management companies, addresses, and more.`,
    keywords: `${cityHoaKeywords}, HOA in ${city.name}, ${city.name} real estate, HOA contacts`,
    metadataBase: new URL("https://jpsrealtor.com"),
    openGraph: {
      title: `${city.name} HOA Contact Information | JPS Realtor`,
      description: `Search for HOA contact information for subdivisions in and around ${city.name}. Discover management company details, addresses, and more.`,
      url: `https://jpsrealtor.com/neighborhoods/${cityId}/hoa-contact-info`,
      images: [
        {
          url: `/city-images/${city.id}.jpg`,
          alt: `${city.name} HOA Contact Information`,
        },
      ],
    },
  };
}

// HOA Contact Info Page
export default async function HoaContactInfoPage({ params }: { params: { cityId: string } }) {
  const { cityId } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);
  if (!city) {
    return <p>City not found</p>;
  }

  // Transform HOA data
  const hoaData = transformHoaData(masterHoaData);

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={`/city-images/${city.id}.jpg`}
        heroContext={city.name}
        description={`Explore HOA contact information for subdivisions in and around ${city.name}.`}
      />

      {/* HOA Search */}
      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        <h1 className="text-4xl font-bold mb-6 text-white">
          HOA Contact Information for {city.name} and Nearby Areas
        </h1>
        <HoaSearch hoaData={hoaData} cityName={city.name} />
      </section>
    </>
  );
}
