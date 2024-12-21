// src/app/neighborhoods/[cityId]/subdivisions/[subdivision]/page.tsx

import React from "react";
import VariableHero from "@/components/VariableHero";
import { coachellaValleyCities } from "@/constants/cities";
import subdivisions from "@/constants/subdivisions";
import { notFound } from "next/navigation";

export default function SubdivisionPage({ params }: { params: { cityId: string; subdivision: string } }) {
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

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={selectedSubdivision.photo}
        heroContext={selectedSubdivision.name}
      />

      {/* Subdivision Details Section */}
      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        <h1 className="text-6xl font-bold mb-8 text-white">
          {selectedSubdivision.name}
        </h1>
        <p className="text-2xl text-white leading-8">
          {selectedSubdivision.description}
        </p>
      </section>
    </>
  );
}
