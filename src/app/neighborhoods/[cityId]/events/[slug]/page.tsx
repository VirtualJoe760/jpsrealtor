import React from "react";
import VariableHero from "@/components/VariableHero";
import { majorEvents } from "@/constants/eventsDataset";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = params;

  // Find the event based on the slug
  const event = majorEvents.find((e) => e.slug === slug);

  if (!event) {
    return {
      title: "Event Not Found - Joseph Sardella",
      description: "The requested event could not be found. Discover other exciting events in the Coachella Valley.",
      alternates: {
        canonical: `/events`,
      },
    };
  }

  return {
    title: `${event.name} | Coachella Valley | JPS Realtor`,
    description: `Plan your visit to ${event.name}, happening on ${event.date} at ${event.location}. Don't miss this exciting event!`,
    alternates: {
      canonical: `/events/${slug}`,
    },
    openGraph: {
      title: event.name,
      description: `Join us for ${event.name}, happening in ${event.date}. Learn more and plan your visit.`,
      url: `/events/${slug}`,
      images: [
        {
          url: event.image,
          alt: `${event.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: event.name,
      description: `Discover ${event.name} in ${event.location}. Happening on ${event.date}. Plan your visit today!`,
      images: [event.image],
    },
    keywords: [
      event.name,
      `${event.location} events`,
      `events on ${event.date}`,
      "Coachella Valley events",
      "local festivals",
      "community events",
      "things to do in the Coachella Valley",
    ],
  };
}

export default function EventDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  // Find the event based on slug
  const event = majorEvents.find((e) => e.slug === slug);

  if (!event) {
    return <p>Event not found</p>; // Handle the case where the event is not found
  }

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={event.image}
        heroContext={event.name}
        description={`Plan ahead for ${event.name}, happening this ${event.date}. Don't miss out on this exciting event.`}
      />

      {/* Event Details Section */}
      <section className="mx-auto max-w-5xl px-2 sm:px-6 lg:px-12 py-12">
        <h1 className="text-4xl font-bold mb-6 text-white">{event.name}</h1>
        <p className="text-2xl text-gray-300 mb-4 leading-relaxed">{event.description}</p>
        <p className="text-md text-gray-400 mb-2">
          <strong>Location:</strong> {event.location}
        </p>
        <p className="text-md text-gray-400 mb-4">
          <strong>Date:</strong> {event.date}
        </p>
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 px-4 py-2 bg-black text-white border border-white font-bold rounded-md hover:bg-gray-800"
        >
          Learn More
        </a>
      </section>
      {/* Call-to-Action Section */}
      <div className="text-center py-10 px-5">
        <h3 className="text-2xl font-semibold text-white mb-4">Ready to Make Your Next Real Estate Move?</h3>
        <p className="text-gray-300 mb-6">
          Whether you&apos;re buying, selling, or investing, I&apos;m here to guide you every step of the way.
        </p>
        <a
          href="/#contact"
          className="ml-2 px-4 py-2 bg-black text-white border border-white font-bold rounded-md hover:bg-gray-800"
        >
          Contact Me
        </a>
      </div>
    </>
  );
}
