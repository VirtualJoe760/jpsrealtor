// src/app/neighborhoods/[cityId]/sell/page.tsx
import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCityById } from "@/app/constants/counties";
import { coachellaValleyCities } from "@/app/constants/cities";
import SellPageClient from "./SellPageClient";
import generatedCityContent from "@/data/city-content-generated.json";

interface SellPageProps {
  params: Promise<{ cityId: string }>;
}

export async function generateMetadata({ params }: SellPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const cityData = findCityById(resolvedParams.cityId);

  if (!cityData) {
    return { title: "City Not Found" };
  }

  const { city, countyName } = cityData;

  return {
    title: `Sell Your Home in ${city.name}, CA | ${city.name} Listing Agent`,
    description: `Selling your home in ${city.name}? Joseph Sardella delivers data-driven pricing, professional marketing, and expert negotiation to maximize your sale in ${countyName}.`,
    alternates: {
      canonical: `https://jpsrealtor.com/neighborhoods/${resolvedParams.cityId}/sell`,
    },
  };
}

export default async function SellInCityPage({ params }: SellPageProps) {
  const resolvedParams = await params;
  const cityData = findCityById(resolvedParams.cityId);

  if (!cityData) {
    notFound();
  }

  const { city, countyName } = cityData;

  const cvCity = coachellaValleyCities.find(c => c.id === resolvedParams.cityId);
  const generated = (generatedCityContent as Record<string, any>)[resolvedParams.cityId];
  const about = cvCity?.about || generated?.about || "";
  const description = cvCity?.description || generated?.description || "";

  return (
    <SellPageClient
      cityName={city.name}
      cityId={resolvedParams.cityId}
      countyName={countyName}
      population={city.population}
      about={about}
      description={description}
    />
  );
}
