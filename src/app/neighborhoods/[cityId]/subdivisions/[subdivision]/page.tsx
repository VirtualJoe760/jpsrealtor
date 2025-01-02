import React from "react";
import VariableHero from "@/components/VariableHero";
import { coachellaValleyCities } from "@/constants/cities";
import subdivisions from "@/constants/subdivisions";
import { fetchCityAreaData } from "@/utils/fetchCityAreaData";
import { QuarterlyAnalysis } from "@/app/components/charts/QuarterlyAnalysis";
import { notFound } from "next/navigation";

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
  const citySubdivisions = subdivisions[`${cityId}-neighborhoods` as keyof typeof subdivisions] || [];

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
      {/* Hero Section */}
      <VariableHero
        backgroundImage={selectedSubdivision.photo}
        heroContext={selectedSubdivision.name}
      />

      {/* Subdivision Details Section */}
      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        {/* Subdivision Name and Description */}
        <h1 className="text-6xl font-bold mb-8 text-white">
          {selectedSubdivision.name}
        </h1>
        <p className="text-2xl text-white leading-8 mb-12">
          {selectedSubdivision.description}
        </p>

        {/* City Name and Real Estate Context */}
        <h2 className="text-5xl font-bold mb-6 text-white">
          {city.name} Real Estate
        </h2>
        <p className="text-2xl text-white leading-8">
          {city.about}
        </p>
      </section>

      {/* Q4 Quarterly Analysis Section */}
      {hasQ4Data && (
        <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
          <h2 className="text-5xl font-bold mb-8 text-white">
            Q4 2024 Quarterly Analysis for {city.name}
          </h2>

          <QuarterlyAnalysis areaData={q4Data} quarter="Q4 2024" />
        </section>
      )}
      {/* Call-to-Action */}
      <div className="text-center py-10 px-5">
          <h3 className="text-2xl font-semibold text-white mb-4">Ready to Make Your Next Real Estate Move?</h3>
          <p className="text-gray-300 mb-6">
            Whether you&apos;re buying, selling, or investing, I&apos;m here to guide you every step of the way.
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
