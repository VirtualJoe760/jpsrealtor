import React from "react";
import { Metadata } from "next";
import { coachellaValleyCities } from "@/constants/cities";
import { fetchCityAreaData } from "@/utils/fetchCityAreaData";
import VariableHero from "@/components/VariableHero";
import { QuarterlyAnalysis } from "@/app/components/charts/QuarterlyAnalysis";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Metadata generation function
export async function generateMetadata({
  params,
}: {
  params: { cityId: string };
}): Promise<Metadata> {
  const { cityId } = params;
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  if (!city) {
    return {
      title: "City Not Found - Property Statistics",
      description:
        "Explore detailed property statistics and insights for cities in the Coachella Valley.",
    };
  }

  return {
    title: `Property Statistics for ${city.name} - ${city.name} Real Estate`,
    description: `Discover comprehensive property statistics and insights for ${city.name}. Explore quarterly trends and data to guide your real estate decisions.`,
    keywords: [
      `${city.name} property statistics`,
      `${city.name} real estate trends`,
      `${city.name} housing data`,
      "Coachella Valley property statistics",
      "real estate insights",
      "quarterly analysis",
      `${city.name} market analysis`,
    ],
    openGraph: {
      title: `Property Statistics for ${city.name}`,
      description: `Detailed property statistics for ${city.name}, including quarterly trends and housing market data.`,
      url: `/neighborhoods/${cityId}/property-stats`,
      images: [
        {
          url: `/city-images/${cityId}.jpg`,
          alt: `Property statistics for ${city.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Property Statistics for ${city.name}`,
      description: `Explore detailed property statistics for ${city.name}. Stay informed about quarterly trends and market insights.`,
      images: [`/city-images/${cityId}.jpg`],
    },
  };
}

export default async function PropertyStatsPage({
  params,
}: {
  params: { cityId: string };
}) {
  const { cityId } = params;
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  if (!city) {
    return <p>City not found</p>;
  }

  // Fetch data for the city
  const areaData = await fetchCityAreaData(city);

  if (!areaData || Object.keys(areaData).length === 0) {
    return <p>No data available for {city.name}.</p>;
  }

  // Known quarters for the year
  const quarters = ["Q4 2024", "Q3 2024", "Q2 2024", "Q1 2024"];

  return (
    <>
      <VariableHero
        backgroundImage={`/city-images/${city.id}.jpg`}
        heroContext={`Property Statistics in ${city.name}`}
        description={`Explore detailed property statistics for all areas in ${city.name}.`}
      />

      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        <h1 className="text-4xl font-bold mb-6 text-white">
          Property Statistics for {city.name}
        </h1>

        <Accordion type="single" defaultValue="q4" collapsible>
          {quarters.map((quarter) => {
            const quarterKey = (() => {
              const match = quarter.match(/^Q(\d)/);
              return match ? `q${match[1]}` : undefined;
            })();

            if (!quarterKey) {
              console.error(`Invalid quarter format: ${quarter}`);
              return null;
            }

            const quarterData = Object.fromEntries(
              Object.entries(areaData).map(([area, data]) => {
                if (!data) {
                  return [area, {}];
                }

                const slug = `${area}-${quarterKey}`;
                const accessedData = Object.values(data).find(
                  (entry) => entry?.slug === slug
                );

                return [area, accessedData || {}];
              })
            );

            const hasData = Object.values(quarterData).some(
              (data) => Object.keys(data).length > 0
            );

            if (!hasData) {
              return null;
            }

            return (
              <AccordionItem key={quarter} value={quarterKey}>
                <AccordionTrigger>{quarter}</AccordionTrigger>
                <AccordionContent>
                  <QuarterlyAnalysis areaData={quarterData} quarter={quarter} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </section>
      {/* Call-to-Action */}
      <div className="text-center py-10 px-5">
        <h3 className="text-2xl font-semibold text-white mb-4">
          Ready to Make Your Next Real Estate Move?
        </h3>
        <p className="text-gray-300 mb-6">
          Whether you&apos;re buying, selling, or investing, I&apos;m here to guide you every
          step of the way.
        </p>
        <a
          href="/#contact"
          className="ml-2 px-4 py-2 bg-black text-white border border-white font-bold rounded-md hover:bg-gray-800 disabled:bg-gray-500"
        >
          Contact Me
        </a>
      </div>
    </>
  );
}
