// src/app/neighborhoods/[cityId]/buy/page.tsx
import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCityById } from "@/app/constants/counties";
import BuyPageClient from "@/app/components/pages/BuyPageClient";

interface BuyPageProps {
  params: Promise<{ cityId: string }>;
}

export async function generateMetadata({ params }: BuyPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const cityData = findCityById(resolvedParams.cityId);

  if (!cityData) {
    return {
      title: "City Not Found",
    };
  }

  const { city, countyName } = cityData;

  return {
    title: `Buy a Home in ${city.name}, ${countyName} | Expert Real Estate Agent`,
    description: `Looking to buy a home in ${city.name}? Work with Joey Sardella, your trusted ${countyName} real estate expert. Get personalized service, market insights, and find your dream home today.`,
    keywords: `buy a home in ${city.name}, buy a house in ${city.name}, ${city.name} real estate agent, homes for sale ${city.name}, ${countyName} realtor, buying property ${city.name}`,
  };
}

export default async function BuyInCityPage({ params }: BuyPageProps) {
  const resolvedParams = await params;
  const cityData = findCityById(resolvedParams.cityId);

  if (!cityData) {
    notFound();
  }

  const { city, countyName } = cityData;

  return (
    <BuyPageClient
      cityName={city.name}
      cityId={resolvedParams.cityId}
      countyName={countyName}
      population={city.population}
    />
  );
}
