// src/app/neighborhoods/[cityId]/[slug]/sell/page.tsx
import { Metadata } from "next";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { findCityByName } from "@/app/constants/counties";
import { notFound } from "next/navigation";
import SubdivisionSellPageClient from "@/app/components/pages/SubdivisionSellPageClient";

interface SellSubdivisionPageProps {
  params: Promise<{
    cityId: string;
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: SellSubdivisionPageProps): Promise<Metadata> {
  const { cityId, slug } = await params;
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug }).lean();

  if (!subdivision) {
    return { title: "Subdivision Not Found" };
  }

  const cityData = findCityByName(subdivision.city);
  if (!cityData || cityData.city.id !== cityId) {
    return { title: "Subdivision Not Found" };
  }

  return {
    title: `Sell Your ${subdivision.name} Home | ${subdivision.city}, ${subdivision.region}`,
    description: `Ready to sell your home in ${subdivision.name}? Get top dollar with Joey Sardella, your trusted real estate expert for ${subdivision.city}. Professional marketing and expert pricing.`,
    keywords: `sell my home ${subdivision.name}, ${subdivision.name} real estate agent, ${subdivision.city} realtor`,
  };
}

export default async function SellSubdivisionPage({ params }: SellSubdivisionPageProps) {
  const { cityId, slug } = await params;
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug }).lean();

  if (!subdivision) {
    notFound();
  }

  const cityData = findCityByName(subdivision.city);
  if (!cityData || cityData.city.id !== cityId) {
    notFound();
  }

  return (
    <SubdivisionSellPageClient
      subdivisionName={subdivision.name}
      cityName={subdivision.city}
      cityId={cityId}
      slug={slug}
      region={subdivision.region}
    />
  );
}
