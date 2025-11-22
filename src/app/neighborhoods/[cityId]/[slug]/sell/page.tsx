// src/app/neighborhoods/[cityId]/[slug]/sell/page.tsx
import { Metadata } from "next";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { findCityByName } from "@/app/constants/counties";
import { notFound } from "next/navigation";
import SubdivisionSellPageClient from "@/app/components/pages/SubdivisionSellPageClient";

interface SellSubdivisionPageProps {
  params: {
    cityId: string;
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: SellSubdivisionPageProps): Promise<Metadata> {
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug: params.slug }).lean();

  if (!subdivision) {
    return {
      title: "Subdivision Not Found",
    };
  }

  // Validate cityId matches subdivision's city
  const cityData = findCityByName(subdivision.city);
  if (!cityData || cityData.city.id !== params.cityId) {
    return {
      title: "Subdivision Not Found",
    };
  }

  return {
    title: `Sell Your ${subdivision.name} Home | ${subdivision.city}, ${subdivision.region}`,
    description: `Ready to sell your home in ${subdivision.name}? Get top dollar with Joey Sardella, your trusted real estate expert for ${subdivision.city}. Professional marketing and expert pricing.`,
    keywords: `sell my home ${subdivision.name}, sell my house ${subdivision.name}, ${subdivision.name} real estate agent, list my home ${subdivision.name}, ${subdivision.city} realtor`,
  };
}

export default async function SellSubdivisionPage({ params }: SellSubdivisionPageProps) {
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug: params.slug }).lean();

  if (!subdivision) {
    notFound();
  }

  // Validate cityId matches subdivision's city
  const cityData = findCityByName(subdivision.city);
  if (!cityData || cityData.city.id !== params.cityId) {
    notFound();
  }

  return (
    <SubdivisionSellPageClient
      subdivisionName={subdivision.name}
      cityName={subdivision.city}
      cityId={params.cityId}
      slug={params.slug}
      region={subdivision.region}
    />
  );
}
