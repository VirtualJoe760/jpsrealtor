// src/app/neighborhoods/[cityId]/sell/page.tsx
import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCityById } from "@/app/constants/counties";
import SellPageClient from "@/app/components/pages/SellPageClient";

interface SellPageProps {
  params: Promise<{ cityId: string }>;
}

export async function generateMetadata({ params }: SellPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const cityData = findCityById(resolvedParams.cityId);

  if (!cityData) {
    return {
      title: "City Not Found",
    };
  }

  const { city, countyName } = cityData;

  return {
    title: `Sell Your ${city.name} Home | Expert Real Estate Agent - Joey Sardella`,
    description: `Ready to sell your home in ${city.name}? Get top dollar with Joey Sardella, your trusted ${countyName} real estate expert. Professional marketing, expert pricing, and dedicated service.`,
    keywords: `sell my home ${city.name}, sell my house ${city.name}, ${city.name} real estate agent, list my home ${city.name}, ${countyName} realtor, selling property ${city.name}, home value ${city.name}`,
  };
}

export default async function SellInCityPage({ params }: SellPageProps) {
  const resolvedParams = await params;
  const cityData = findCityById(resolvedParams.cityId);

  if (!cityData) {
    notFound();
  }

  const { city, countyName } = cityData;

  return (
    <SellPageClient
      cityName={city.name}
      cityId={resolvedParams.cityId}
      countyName={countyName}
      population={city.population}
    />
  );
}
