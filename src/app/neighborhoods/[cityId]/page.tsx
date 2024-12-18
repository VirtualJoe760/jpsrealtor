import React from "react";
import VariableHero from "@/components/VariableHero"; // Adjusted component imports
import { coachellaValleyCities } from "@/constants/cities";
import { notFound } from "next/navigation";

export default async function CityPage({ params }: { params: Promise<{ cityId: string }> }) {
  const resolvedParams = await params; // Await the params promise
  const { cityId } = resolvedParams;

  // Step 2: Find the city data based on cityId
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  // Step 3: Handle city not found
  if (!city) {
    notFound(); // Returns a 404 page
  }

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={`/city-images/${city.id}.jpg`}
        heroContext={city.name}
        description={city.description}
      />

      {/* Main Content Section */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-4xl font-bold mb-4">{city.heading}</h1>
        <p className="text-lg leading-7 mb-6">{city.body}</p>

        {/* Population Info */}
        <div className="p-4 rounded-md mb-8">
          <p className="text-xl font-semibold">
            Population: {city.population.toLocaleString()}
          </p>
        </div>
      </section>
    </>
  );
}
