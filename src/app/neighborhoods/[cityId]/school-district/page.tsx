"use client";

import React from "react";
import VariableHero from "@/components/VariableHero";
import { coachellaValleyCities } from "@/constants/cities";

const districts = [
  {
    id: "psusd",
    name: "Palm Springs Unified School District",
    description: "Serving Palm Springs, Desert Hot Springs, Cathedral City, and nearby areas."
  },
  {
    id: "dsusd",
    name: "Desert Sands Unified School District",
    description: "Covering La Quinta, Indian Wells, Palm Desert, and surrounding regions."
  },
  {
    id: "cvusd",
    name: "Coachella Valley Unified School District",
    description: "Focused on Coachella, Thermal, Mecca, and the surrounding neighboring areas."
  },
];

export default function SchoolDistrictPage({ params }: { params: { cityId: string } }) {
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
        heroContext={`School Districts in ${city.name}`}
        description={`Explore the school districts serving ${city.name} and the surrounding areas.`}
      />

      {/* Districts Section */}
      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        <h1 className="text-4xl font-bold mb-6 text-white">School Districts in {city.name}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {districts.map((district) => (
            <div
              key={district.id}
              className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            >
              <h2 className="text-xl font-bold text-white mb-2">{district.name}</h2>
              <p className="text-gray-300 mb-4">{district.description}</p>
              <a
                href={`/neighborhoods/${cityId}/school-district/${district.id}`}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-500"
              >
                View Schools
              </a>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
