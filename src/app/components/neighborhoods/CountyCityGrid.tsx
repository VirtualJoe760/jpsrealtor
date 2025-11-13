"use client";

import React from "react";
import Link from "next/link";
import { County } from "@/app/constants/counties";

interface CountyCityGridProps {
  county: County;
}

export default function CountyCityGrid({ county }: CountyCityGridProps) {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-black via-gray-900/90 to-black border-b border-gray-800 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4 drop-shadow-2xl">{county.name}</h1>
          <p className="text-xl text-gray-200 max-w-3xl leading-relaxed">
            {county.description}
          </p>
        </div>
      </div>

      {/* Cities Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="bg-gradient-to-br from-gray-900/50 via-gray-900/30 to-black backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-800 p-6 md:p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Explore Cities in {county.name}
          </h2>
          <p className="text-gray-300 mb-8">
            Click on any city to view homes, neighborhoods, and community information.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {county.cities.map((city) => (
              <Link
                key={city.id}
                href={`/neighborhoods/${city.id}`}
                className="group bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-lg p-6 hover:border-white/50 hover:shadow-2xl hover:from-gray-800 hover:to-gray-900 transition-all duration-200"
              >
                <h3 className="text-xl font-semibold text-white group-hover:text-white mb-2">
                  {city.name}
                </h3>
                {city.population && (
                  <p className="text-sm text-gray-400 mb-2">
                    Population: {city.population.toLocaleString()}
                  </p>
                )}
                {city.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {city.description}
                  </p>
                )}
                <div className="mt-4 text-gray-300 text-sm font-medium group-hover:text-white group-hover:underline">
                  View Properties →
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Back to Counties */}
        <div className="text-center">
          <Link
            href="/neighborhoods"
            className="inline-block bg-gradient-to-r from-gray-900 to-black border border-gray-700 text-white px-6 py-3 rounded-lg hover:border-white/50 hover:from-gray-800 hover:to-gray-900 shadow-lg hover:shadow-2xl transition-all duration-200"
          >
            ← Back to All Counties
          </Link>
        </div>
      </section>
    </div>
  );
}
