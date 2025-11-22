// src/app/neighborhoods/[cityId]/[slug]/buy/page.tsx
import { Metadata } from "next";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { findCityByName } from "@/app/constants/counties";
import { notFound } from "next/navigation";
import SubdivisionBuyPageClient from "@/app/components/pages/SubdivisionBuyPageClient";

interface BuySubdivisionPageProps {
  params: {
    cityId: string;
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: BuySubdivisionPageProps): Promise<Metadata> {
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
    title: `Buy a Home in ${subdivision.name} | ${subdivision.city}, ${subdivision.region}`,
    description: `Looking to buy a home in ${subdivision.name}? Work with Joey Sardella, your trusted real estate expert for ${subdivision.city}. Find your dream home in this exclusive community today.`,
    keywords: `buy a home in ${subdivision.name}, buy a house in ${subdivision.name}, ${subdivision.name} real estate, ${subdivision.name} homes for sale, ${subdivision.city} realtor`,
  };
}

export default async function BuySubdivisionPage({ params }: BuySubdivisionPageProps) {
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
    <SubdivisionBuyPageClient
      subdivisionName={subdivision.name}
      cityName={subdivision.city}
      cityId={params.cityId}
      slug={params.slug}
      region={subdivision.region}
    />
  );
}
