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
    title: `Buy a Home in ${city.name}, CA | ${city.name} Real Estate Agent`,
    description: `Looking to buy a home in ${city.name}? Joseph Sardella is your local Coachella Valley real estate expert. Browse homes for sale, get market insights, and find your dream home.`,
    alternates: {
      canonical: `https://jpsrealtor.com/neighborhoods/${resolvedParams.cityId}/buy`,
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

  return (
    <BuyPageClient
      cityName={city.name}
      cityId={resolvedParams.cityId}
      countyName={countyName}
      population={city.population}
    />
  );
}
