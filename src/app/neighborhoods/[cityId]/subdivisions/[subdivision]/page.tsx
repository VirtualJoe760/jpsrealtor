 // src\app\neighborhoods\[cityId]\subdivisions\[subdivision]\page.tsx
import React from "react";
import VariableHero from "@/components/VariableHero";
import { coachellaValleyCities } from "@/constants/cities";
import subdivisions from "@/constants/subdivisions";
import { fetchCityAreaData } from "@/utils/fetchCityAreaData";
import { QuarterlyAnalysis } from "@/app/components/charts/QuarterlyAnalysis";
import { Metadata } from "next";
import { notFound } from "next/navigation";

// Generate Metadata
export async function generateMetadata({
  params,
}: {
  params: { cityId: string; subdivision: string };
}): Promise<Metadata> {
  const { cityId, subdivision } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);
  if (!city) {
    notFound();
  }

  // Get subdivisions for the city
  const citySubdivisions =
    subdivisions[`${cityId}-neighborhoods` as keyof typeof subdivisions] || [];

  // Find the specific subdivision by slug
  const selectedSubdivision = citySubdivisions.find((s) => s.slug === subdivision);
  if (!selectedSubdivision) {
    notFound();
  }

  // Extract keywords and description
  const keywords = selectedSubdivision.keywords.join(", ");
  const description = selectedSubdivision.description.slice(0, 160);

  return {
    title: `${selectedSubdivision.name} - Neighborhood in ${city.name} | JPS Realtor`,
    description,
    keywords: `${keywords}, ${city.name} real estate, subdivisions in ${city.name}, homes in ${selectedSubdivision.name}, buying in ${selectedSubdivision.name}, selling my house in ${selectedSubdivision.name}, selling my property in ${selectedSubdivision.name}, buying a property in ${selectedSubdivision.name}, ${selectedSubdivision.name} hoa, where is ${selectedSubdivision.name}`, 
    metadataBase: new URL("https://jpsrealtor.com"),
    openGraph: {
      title: `${selectedSubdivision.name} - Real Estate in ${city.name}`,
      description: selectedSubdivision.description,
      url: `https://jpsrealtor.com/neighborhoods/${cityId}/subdivisions/${subdivision}`,
      images: [
        {
          url: selectedSubdivision.photo,
          alt: `${selectedSubdivision.name} - ${city.name}`,
        },
      ],
    },
  };
}

// SubdivisionPage Component
export default async function SubdivisionPage({
  params,
}: {
  params: { cityId: string; subdivision: string };
}) {
  const { cityId, subdivision } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);
  if (!city) {
    notFound();
  }

  // Get subdivisions for the city
  const citySubdivisions =
    subdivisions[`${cityId}-neighborhoods` as keyof typeof subdivisions] || [];

  // Find the specific subdivision by slug
  const selectedSubdivision = citySubdivisions.find((s) => s.slug === subdivision);
  if (!selectedSubdivision) {
    notFound();
  }

  // Fetch Q4 data for the city
  const areaData = await fetchCityAreaData(city);
  const q4Data = Object.fromEntries(
    Object.entries(areaData).map(([area, data]) => [area, data?.q4 || {}])
  );

  const hasQ4Data = Object.values(q4Data).some((data) => Object.keys(data).length > 0);

  return (
    <>
      <VariableHero
        backgroundImage={selectedSubdivision.photo}
        heroContext={selectedSubdivision.name}
      />

      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        <h1 className="text-4xl font-bold mb-8 text-white">{selectedSubdivision.name}</h1>
        <p className="text-lg text-white leading-9 mb-12">
          {selectedSubdivision.description}
        </p>

        <h2 className="text-3xl font-bold mb-6 text-white">{city.name} Real Estate</h2>
        <p className="text-lg text-white leading-8">{city.about}</p>
      </section>

      {hasQ4Data && (
        <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
          <h2 className="text-5xl font-bold mb-8 text-white">
            Q4 2024 Quarterly Analysis for {city.name}
          </h2>
          <QuarterlyAnalysis areaData={q4Data} quarter="Q4 2024" />
        </section>
      )}

      <div className="text-center py-10 px-5">
        <h3 className="text-2xl font-semibold text-white mb-4">
          Need a CMA or new listings in {selectedSubdivision.name}?
        </h3>
        <p className="text-gray-300 mb-6">
          I can have a CMA or new listings for {selectedSubdivision.name} in no time. <br />
          Click the button below to get started.
        </p>
        <a
          href="/#contact"
          className="ml-2 px-4 py-2 bg-black text-white border border-white font-bold rounded-md hover:bg-gray-800 disabled:bg-gray-500"
        >
          Contact Me
        </a>
      </div>
    </>
  );
}
