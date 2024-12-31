"use client";

import React, { useEffect } from "react";
import VariableHero from "@/components/VariableHero";
import LocalBusinessChat from "@/components/LocalBusinessChat";
import { coachellaValleyCities } from "@/constants/cities";

export default function LocalBusinessPage({ params }: { params: { cityId: string } }) {
  const { cityId } = params;

  // Find the city data based on the cityId
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  if (!city) {
    return <p>City not found</p>; // Handle the case where the city is not found
  }

  // Dynamically set the page title for SEO
  useEffect(() => {
    document.title = `Search and Explore Local Businesses in ${city.name}`;
  }, [city.name]);

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={`/city-images/${city.id}.jpg`}
        heroContext={`${city.name} Local Businesses`}
        description={`Discover top-rated businesses in and around ${city.name}. From restaurants to services, explore what the area has to offer.`}
      />

      {/* Chat Section */}
      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        <h1 className="text-4xl font-bold mb-6 text-white">
          Explore Local Businesses in {city.name}
        </h1>
        <LocalBusinessChat cityId={city.name} />
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
