import React from "react";
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

  console.log("Fetched areaData:", areaData);

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
                  console.warn(`No data available for area: ${area}`);
                  return [area, {}];
                }

                const slug = `${area}-${quarterKey}`;
                const accessedData = Object.values(data).find(
                  (entry) => entry?.slug === slug
                );

                console.log(`Accessing data for ${area} in ${slug}:`, accessedData);
                return [area, accessedData || {}];
              })
            );

            const hasData = Object.values(quarterData).some(
              (data) => Object.keys(data).length > 0
            );

            if (!hasData) {
              console.warn(`No data available for ${quarter}`);
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
    </>
  );
}
