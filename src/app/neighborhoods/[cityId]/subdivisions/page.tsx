"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import VariableHero from "@/components/VariableHero";
import { coachellaValleyCities } from "@/constants/cities";
import subdivisions from "@/constants/subdivisions";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

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

  // Memoize subdivisions for the city
  const citySubdivisions = useMemo(() => {
    return (
      subdivisions[`${cityId}-neighborhoods` as keyof typeof subdivisions] || []
    );
  }, [cityId]);

  // State for filtered subdivisions
  const [validSubdivisions, setValidSubdivisions] = useState<
    typeof citySubdivisions
  >([]);

  // Ref to track whether updates should affect scroll
  const updateRef = useRef(false);

  useEffect(() => {
    const valid = citySubdivisions.filter((subdivision) => subdivision.photo);
    setValidSubdivisions(valid);
  }, [citySubdivisions]);

  // Track and restore scroll position
  const handleScroll = () => {
    updateRef.current = false; // Prevent scroll focus
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Filter subdivisions by search term
  const [searchTerm, setSearchTerm] = useState("");
  const filteredSubdivisions = useMemo(() => {
    if (!searchTerm) return validSubdivisions; // Return the original array when the search term is empty
  
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
  
    return [...validSubdivisions].sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
  
      // Exact matches come first
      if (aName === lowerCaseSearchTerm && bName !== lowerCaseSearchTerm) return -1;
      if (bName === lowerCaseSearchTerm && aName !== lowerCaseSearchTerm) return 1;
  
      // Starts with the search term come next
      if (aName.startsWith(lowerCaseSearchTerm) && !bName.startsWith(lowerCaseSearchTerm)) return -1;
      if (bName.startsWith(lowerCaseSearchTerm) && !aName.startsWith(lowerCaseSearchTerm)) return 1;
  
      // Subdivisions that include the term come last
      if (aName.includes(lowerCaseSearchTerm) && !bName.includes(lowerCaseSearchTerm)) return -1;
      if (bName.includes(lowerCaseSearchTerm) && !aName.includes(lowerCaseSearchTerm)) return 1;
  
      // Maintain original order if equally ranked
      return 0;
    });
  }, [validSubdivisions, searchTerm]);
  

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
        <h1 className="text-4xl font-bold mb-10 text-white">
          Subdivisions in {city.name}
        </h1>

        {/* Full Subdivision List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSubdivisions.map((subdivision) => (
            <div
              key={subdivision.name}
              id={`subdivision-${subdivision.name}`}
              className="flex flex-col rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <Image
                src={subdivision.photo}
                alt={subdivision.name}
                width={600}
                height={400}
                className="w-full h-64 object-cover"
                onError={() => {
                  // Only remove invalid subdivisions after ensuring no scroll disruptions
                  if (!updateRef.current) {
                    setValidSubdivisions((current) =>
                      current.filter((s) => s.name !== subdivision.name)
                    );
                  }
                }}
              />
              <div className="p-6">
                <Link
                  href={`/neighborhoods/${cityId}/subdivisions/${subdivision.slug}`}
                >
                  <h2 className="text-2xl font-bold text-white mb-4 hover:underline">
                    {subdivision.name}
                  </h2>
                </Link>
                <p className="text-lg text-gray-300 mb-4">
                  {subdivision.description.length > 100
                    ? `${subdivision.description.slice(0, 100)}...`
                    : subdivision.description}
                </p>
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
