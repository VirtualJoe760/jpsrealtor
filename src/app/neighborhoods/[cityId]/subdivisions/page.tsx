import React from "react";
import VariableHero from "@/components/VariableHero";
import SubdivisionList from "@/components/SubdivisionList";
import { coachellaValleyCities } from "@/constants/cities";
import subdivisions from "@/constants/subdivisions";
import { Metadata } from "next";
import { notFound } from "next/navigation";

// Generate Metadata
export async function generateMetadata({
  params,
}: {
  params: { cityId: string };
}): Promise<Metadata> {
  const { cityId } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);
  if (!city) {
    notFound();
  }

  // Get subdivisions for the city
  const citySubdivisions =
    subdivisions[`${cityId}-neighborhoods` as keyof typeof subdivisions] || [];

  // Collect keywords from subdivisions
  const keywords = citySubdivisions
    .flatMap((subdivision) => subdivision.keywords)
    .join(", ");

  return {
    title: `${city.name} Subdivisions | Explore Neighborhoods`,
    description: `Explore subdivisions in ${city.name}. Find detailed information about neighborhoods, amenities, and real estate opportunities.`,
    keywords: `${keywords}, ${city.name} real estate, subdivisions in ${city.name}`,
    metadataBase: new URL("https://jpsrealtor.com"),
    openGraph: {
      title: `${city.name} Subdivisions`,
      description: `Explore neighborhoods and real estate opportunities in ${city.name}.`,
      url: `https://jpsrealtor.com/neighborhoods/${cityId}`,
      images: [
        {
          url: `/city-images/${city.id}.jpg`,
          alt: `${city.name} subdivisions overview`,
        },
      ],
    },
  };
}

export default function SubdivisionsPage({
  params,
}: {
  params: { cityId: string };
}) {
  const { cityId } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);
  if (!city) {
    notFound();
  }

  // Get subdivisions for the city
  const citySubdivisions =
    subdivisions[`${cityId}-neighborhoods` as keyof typeof subdivisions] || [];

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={`/city-images/${city.id}.jpg`}
        heroContext={city.name}
        description={`Explore subdivisions in ${city.name}. Find the perfect neighborhood for your lifestyle.`}
      />

      {/* Subdivision List Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-4xl font-bold mb-10 text-white">
          Subdivisions in {city.name}
        </h1>

        {/* Subdivision List */}
        <SubdivisionList subdivisions={citySubdivisions} cityId={cityId} />
      </section>
    </>
  );
}
