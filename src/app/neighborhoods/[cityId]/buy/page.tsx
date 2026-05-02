// src/app/neighborhoods/[cityId]/buy/page.tsx
import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCityById } from "@/app/constants/counties";
import { coachellaValleyCities } from "@/app/constants/cities";
import BuyPageClient from "./BuyPageClient";
import generatedCityContent from "@/data/city-content-generated.json";
import { getBaseUrlFromHeaders } from "@/lib/domain-utils";

interface BuyPageProps {
  params: Promise<{ cityId: string }>;
}

export async function generateMetadata({ params }: BuyPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const baseUrl = await getBaseUrlFromHeaders();
  const cityData = findCityById(resolvedParams.cityId);

  if (!cityData) {
    return { title: "City Not Found" };
  }

  const { city } = cityData;

  return {
    title: `Buy a Home in ${city.name}, CA | ${city.name} Real Estate Agent`,
    description: `Looking to buy a home in ${city.name}? Joseph Sardella is your local Coachella Valley real estate expert. Browse homes for sale, get market insights, and find your dream home.`,
    alternates: {
      canonical: `${baseUrl}/neighborhoods/${resolvedParams.cityId}/buy`,
    },
  };
}

export default async function BuyInCityPage({ params }: BuyPageProps) {
  const resolvedParams = await params;
  const cityData = findCityById(resolvedParams.cityId);

  if (!cityData) {
    notFound();
  }

  const { city, countyName } = cityData;

  // Get about text from CV cities or generated content
  const cvCity = coachellaValleyCities.find(c => c.id === resolvedParams.cityId);
  const generated = (generatedCityContent as Record<string, any>)[resolvedParams.cityId];
  const about = cvCity?.about || generated?.about || "";
  const description = cvCity?.description || generated?.description || "";

  return (
    <BuyPageClient
      cityName={city.name}
      cityId={resolvedParams.cityId}
      countyName={countyName}
      population={city.population}
      about={about}
      description={description}
    />
  );
}
