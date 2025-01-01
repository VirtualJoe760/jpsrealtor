"use client";

import React from "react";
import VariableHero from "@/components/VariableHero";
import { coachellaValleyCities } from "@/constants/cities";

export default function PropertyStatsPage({ params }: { params: { cityId: string } }) {
  const { cityId } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  if (!city) {
    return <p>City not found</p>;
  }

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={`/city-images/${city.id}.jpg`}
        heroContext={`Property Statistics in ${city.name}`}
        description={`Review property statistics and trends for ${city.name}, including active listings, closed data, and expired data.`}
      />

      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        <h1 className="text-4xl font-bold mb-6 text-white">Property Statistics for {city.name}</h1>
        <p className="text-lg text-gray-300 mb-4">
          Discover key metrics and trends in the real estate market of {city.name}. Analyze price movements, market activity, and other critical insights to stay ahead.
        </p>
        {/* Placeholder for Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Add chart components here */}
          <div className="bg-gray-800 p-6 rounded-lg text-white">Chart Placeholder 1</div>
          <div className="bg-gray-800 p-6 rounded-lg text-white">Chart Placeholder 2</div>
          <div className="bg-gray-800 p-6 rounded-lg text-white">Chart Placeholder 3</div>
        </div>
      </section>
    </>
  );
}
