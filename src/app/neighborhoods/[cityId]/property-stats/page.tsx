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

export default async function PropertyStatsPage({ params }: { params: { cityId: string } }) {
  const { cityId } = params;
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  if (!city) {
    return <p>City not found</p>;
  }

  const areaData = await fetchCityAreaData(city);

  if (!Object.keys(areaData).length) {
    return <p>No data available for {city.name}.</p>;
  }

  // Define available quarters dynamically
  const quarters = ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024"];
  const availableQuarters = quarters.filter((quarter) => {
    // Check if any areaData includes data for the given quarter
    // This assumes fetchCityAreaData includes quarter information
    return Object.values(areaData).some(
      (data: any) => data.quarter === quarter
    );
  });

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

        <Accordion type="single" collapsible>
          {availableQuarters.map((quarter) => (
            <AccordionItem key={quarter} value={quarter.toLowerCase()}>
              <AccordionTrigger>{quarter}</AccordionTrigger>
              <AccordionContent>
                <QuarterlyAnalysis areaData={areaData} quarter={quarter} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}
