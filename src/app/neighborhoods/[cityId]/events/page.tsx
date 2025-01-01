"use client";

import React from "react";
import VariableHero from "@/components/VariableHero";
import { majorEvents } from "@/constants/eventsDataset";
import { coachellaValleyCities } from "@/constants/cities";

export default function EventsPage({ params }: { params: { cityId: string } }) {
  const { cityId } = params;

  // Find the city data based on cityId
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  if (!city) {
    return <p>City not found</p>; // Handle the case where the city is not found
  }

  // Prioritize events in the city's location
  const prioritizedEvents = [
    ...majorEvents.filter((event) => event.location.includes(city.name)),
    ...majorEvents.filter((event) => !event.location.includes(city.name)),
  ];

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

        {prioritizedEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prioritizedEvents.map((event) => (
              <div key={event.slug} className="p-6 rounded-lg shadow-md">
                <img
                  src={event.image}
                  alt={event.name}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
                <h2 className="text-xl font-bold text-white">{event.name}</h2>
                <p className="text-gray-300 mt-2">{event.date}</p>
                <p className="text-gray-300 mt-2">{event.location}</p>
                <p className="text-gray-400 mt-4">
                  {event.description.slice(0, 50)}...
                  <a
                    href={`/neighborhoods/${city.id}/events/${event.slug}`}
                    className="text-blue-400 hover:underline ml-1"
                  >
                    Read More
                  </a>
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-300">No major events found in the Coachella Valley.</p>
        )}
      </section>
    </>
  );
}
