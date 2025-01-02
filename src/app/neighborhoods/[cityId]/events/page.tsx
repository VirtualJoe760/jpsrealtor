import React from "react";
import VariableHero from "@/components/VariableHero";
import EventsSection from "@/components/EventsSection";
import { coachellaValleyCities } from "@/constants/cities";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: { cityId: string } }): Promise<Metadata> {
  const { cityId } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);
  if (!city) {
    return {
      title: "City Not Found | JPS Realtor",
      description: "Explore events and happenings in your area.",
    };
  }

  return {
    title: `Events in ${city.name} | JPS Realtor`,
    description: `Discover the most exciting events happening in and around ${city.name}, including major festivals, community gatherings, and more.`,
    metadataBase: new URL("https://jpsrealtor.com"),
    openGraph: {
      title: `Events in ${city.name} | JPS Realtor`,
      description: `Explore top events in ${city.name} and the Coachella Valley, from iconic festivals to unique community experiences.`,
      url: `https://jpsrealtor.com/neighborhoods/${cityId}/events`,
      images: [
        {
          url: `/city-images/${cityId}.jpg`,
          alt: `Events in ${city.name}`,
        },
      ],
    },
    keywords: [
      `${city.name} events`,
      `${city.name} festivals`,
      `${city.name} concerts`,
      `${city.name} live music`,
      `${city.name} community gatherings`,
      `${city.name} art exhibitions`,
      `${city.name} outdoor events`,
      "Coachella Valley events",
      "Coachella music festival",
      "Stagecoach festival",
      `${city.name} farmers markets`,
      `${city.name} family-friendly events`,
      `${city.name} seasonal festivals`,
      `${city.name} holiday events`,
      `${city.name} cultural celebrations`,
      `${city.name} wellness retreats`,
      `${city.name} local celebrations`,
      `${city.name} nightlife events`,
      `${city.name} outdoor movie nights`,
      "Palm Springs International Film Festival",
      "La Quinta arts festival",
      "Indio tamale festival",
      `${city.name} hiking meetups`,
      `${city.name} charity runs`,
      "Desert art installations",
      `${city.name} food truck events`,
    ],
  };
}

export default function EventsPage({ params }: { params: { cityId: string } }) {
  const { cityId } = params;

  // Find the city data based on cityId
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  if (!city) {
    return <p className="text-gray-300">City not found</p>;
  }

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={`/city-images/${city.id}.jpg`}
        heroContext={`${city.name} Events`}
        description={`Discover the most exciting events happening in and around ${city.name}. From major festivals to community gatherings, there's something for everyone.`}
      />

      {/* Events Section */}
      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        <h1 className="text-4xl font-bold mb-6 text-white">Major Events in the Coachella Valley</h1>
        <EventsSection cityName={city.name} />
      </section>
    </>
  );
}
