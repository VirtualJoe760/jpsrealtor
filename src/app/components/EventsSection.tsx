"use client";

import React, { useState, useEffect } from "react";
import { majorEvents } from "@/constants/eventsDataset";
import { ClipLoader } from "react-spinners";

interface EventsSectionProps {
  cityName: string;
}

const EventsSection: React.FC<EventsSectionProps> = ({ cityName }) => {
  const [loading, setLoading] = useState(true);
  const [prioritizedEvents, setPrioritizedEvents] = useState(majorEvents);

  useEffect(() => {
    // Simulate fetching and prioritization
    const fetchEvents = () => {
      const events = [
        ...majorEvents.filter((event) => event.location.includes(cityName)),
        ...majorEvents.filter((event) => !event.location.includes(cityName)),
      ];
      setPrioritizedEvents(events);
      setLoading(false);
    };

    fetchEvents();
  }, [cityName]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <ClipLoader size={50} color="#ffffff" />
      </div>
    );
  }

  if (prioritizedEvents.length === 0) {
    return <p className="text-gray-300">No major events found in the Coachella Valley.</p>;
  }

  return (
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
              href={`/neighborhoods/${cityName.toLowerCase()}/events/${event.slug}`}
              className="text-blue-400 hover:underline ml-1"
            >
              Read More
            </a>
          </p>
        </div>
      ))}
    </div>
  );
};

export default EventsSection;
