// src/app/neighborhoods/[cityId]/[slug]/page.tsx
// Subdivision detail page

import { Metadata } from "next";
import SubdivisionPageClient from "./SubdivisionPageClient";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/app/components/seo/JsonLd";

interface SubdivisionPageProps {
  params: Promise<{
    cityId: string;
    slug: string;
  }>;
}

// Helper to create slug from city name
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function generateMetadata({
  params,
}: SubdivisionPageProps): Promise<Metadata> {
  const { cityId, slug } = await params;
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug }).lean();

  if (!subdivision) {
    return {
      title: "Subdivision Not Found",
    };
  }

  // Validate cityId matches subdivision's city by comparing slugs
  const citySlug = createSlug(subdivision.city);
  if (citySlug !== cityId) {
    return {
      title: "Subdivision Not Found",
    };
  }

  return {
    title: `${subdivision.name} Homes for Sale | ${subdivision.city}, CA`,
    description:
      subdivision.description ||
      `Browse ${subdivision.listingCount} homes for sale in ${subdivision.name}, ${subdivision.city}. Average price: $${subdivision.avgPrice.toLocaleString()}. Joseph Sardella, local Coachella Valley expert.`,
    alternates: {
      canonical: `https://jpsrealtor.com/neighborhoods/${cityId}/${slug}`,
    },
  };
}

export default async function SubdivisionPage({ params }: SubdivisionPageProps) {
  const { cityId, slug } = await params;
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug }).lean();

  if (!subdivision) {
    notFound();
  }

  // Validate cityId matches subdivision's city by comparing slugs
  const citySlug = createSlug(subdivision.city);
  if (citySlug !== cityId) {
    notFound();
  }

  // Serialize subdivision to plain object for Client Component
  const serializedSubdivision = JSON.parse(JSON.stringify(subdivision));

  const breadcrumbItems = [
    { name: "Home", url: "https://jpsrealtor.com" },
    { name: "Neighborhoods", url: "https://jpsrealtor.com/neighborhoods" },
    { name: subdivision.city, url: `https://jpsrealtor.com/neighborhoods/${cityId}` },
    { name: subdivision.name, url: `https://jpsrealtor.com/neighborhoods/${cityId}/${slug}` },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <SubdivisionPageClient
        cityId={cityId}
        slug={slug}
        subdivision={serializedSubdivision}
      />
    </>
  );
}
