// src\app\neighborhoods\[cityId]\page.tsx

import React from "react";
import VariableHero from "@/components/VariableHero";
import { coachellaValleyCities } from "@/constants/cities";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import LocalInfoCard from "@/components/LocalInfoCard";
import { generateSlug } from "@/utils/slug";
import subdivisions from "@/constants/subdivisions";
import Image from "next/image";

// Generate metadata for the city page
export async function generateMetadata({ params }: { params: { cityId: string } }): Promise<Metadata> {
  const city = coachellaValleyCities.find((c) => c.id === params.cityId);
  if (!city) return {};

  return {
    title: `${city.name} Real Estate | Coachella Valley`,
    description: `Explore homes and properties in ${city.name}, a beautiful community in the Coachella Valley.`,
  };
}

export default async function CityPage({ params }: { params: Promise<{ cityId: string }> }) {
  const resolvedParams = await params;
  const { cityId } = resolvedParams;

  // Find the city data based on cityId
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  // Handle city not found
  if (!city) {
    notFound(); // Returns a 404 page
  }

  // Get subdivisions for the city
  const citySubdivisions = subdivisions[`${cityId}-neighborhood` as keyof typeof subdivisions] || [];

  // Generate slugs dynamically for the infoCards
  const infoCards = [
    {
      title: "Subdivisions",
      description: "Explore subdivisions in Coachella Valley.",
      imageUrl: "/infocards/subdivisions.png",
      link: { text: "View Subdivisions", href: `/neighborhoods/${cityId}/subdivisions` },
    },
    {
      title: "Find HOA",
      description: "Looking to get ahold of the HOA?",
      imageUrl: "/infocards/hoa.png",
      link: { text: "HOA Contact Info", href: `/neighborhoods/${cityId}/hoa-contact-info` },
    },
    {
      title: "Schools",
      description: "Find the best schools in the area.",
      imageUrl: "/infocards/school.png",
      link: { text: "View Schools", href: `/neighborhoods/${cityId}/schools` },
    },
    {
      title: "Local Business",
      description: "Discover popular dining spots, Explore local businesses.",
      imageUrl: "/infocards/resturants.png",
      link: { text: "View Restaurants", href: `/neighborhoods/${cityId}/local-business` },
    },
    {
      title: "Events",
      description: "Check out local events happening around.",
      imageUrl: "/infocards/events.png",
      link: { text: "View Events", href: `/neighborhoods/${cityId}/${generateSlug("Events")}` },
    },
  ];

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

      {/* Local Info Section */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {infoCards.map((card, index) => (
              <LocalInfoCard key={index} {...card} />
            ))}
          </div>
        </div>
      </section>

      {/* Subdivisions Section */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {citySubdivisions.map((subdivision) => (
              <div key={subdivision.name} className="p-4 bg-white rounded shadow">
                <Image
                  src={subdivision.photo}
                  alt={subdivision.name}
                  width={300}
                  height={200}
                  className="mb-4 rounded"
                />
                <h2 className="text-xl font-semibold">{subdivision.name}</h2>
                <p>{subdivision.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
