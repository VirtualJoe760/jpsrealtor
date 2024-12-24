"use client";

import React, { useState, useEffect, useMemo } from "react";
import VariableHero from "@/components/VariableHero";
import { coachellaValleyCities } from "@/constants/cities";
import subdivisions from "@/constants/subdivisions";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export default function SubdivisionsPage({ params }: { params: { cityId: string } }) {
  const { cityId } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  if (!city) {
    notFound();
  }

  // Memoize subdivisions for the city
  const citySubdivisions = useMemo(() => {
    return subdivisions[`${cityId}-neighborhoods` as keyof typeof subdivisions] || [];
  }, [cityId]);

  // State for search
  const [searchTerm, setSearchTerm] = useState("");

  // Filtered subdivisions based on search term
  const filteredSubdivisions = citySubdivisions.filter((subdivision) =>
    subdivision.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={`/city-images/${city.id}.jpg`}
        heroContext={city.name}
        description={`Explore subdivisions in ${city.name}. Find the perfect neighborhood for your lifestyle.`}
      />

      {/* Search and List Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-4xl font-bold mb-6 text-white">Subdivisions in {city.name}</h1>

        {/* Search Bar */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search subdivisions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-500 rounded-md shadow-sm bg-black text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          />
          {/* Autocomplete Dropdown */}
          {searchTerm && (
            <div className="absolute z-10 mt-1 w-full bg-black border border-gray-500 rounded-md shadow-lg">
              {filteredSubdivisions.map((subdivision) => (
                <Link
                  key={subdivision.name}
                  href={`/${cityId}/subdivisions/${subdivision.name}`}
                  className="block px-4 py-2 text-white hover:bg-gray-700"
                >
                  {subdivision.name}
                </Link>
              ))}
              {filteredSubdivisions.length === 0 && (
                <p className="px-4 py-2 text-gray-400">No subdivisions found.</p>
              )}
            </div>
          )}
        </div>

        {/* Full Subdivision List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {citySubdivisions.map((subdivision) => (
            <div
              key={subdivision.name}
              id={`subdivision-${subdivision.name}`}
              className="flex flex-col rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <Image
                src={subdivision.photo || "/images/placeholder.jpg"}
                alt={subdivision.name}
                width={600}
                height={400}
                className="w-full h-64 object-cover"
              />
              <div className="p-6">
                <Link href={`/neighborhoods/${cityId}/subdivisions/${subdivision.slug}`}>
                  <h2 className="text-2xl font-bold text-white mb-4 hover:underline">
                    {subdivision.name}
                  </h2>
                </Link>
                <p className="text-lg text-gray-300 mb-4">{subdivision.description}</p>
                <Link
                  href={`/neighborhoods/${cityId}/subdivisions/${subdivision.slug}`}
                  className="text-sm font-medium text-blue-500 hover:underline"
                >
                  Learn more →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
