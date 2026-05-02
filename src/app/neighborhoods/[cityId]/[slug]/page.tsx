// src/app/neighborhoods/[cityId]/[slug]/page.tsx
// Subdivision detail page

import { Metadata } from "next";
import SubdivisionPageClient from "./SubdivisionPageClient";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/app/components/seo/JsonLd";
import { createSlug } from "@/lib/utils/slug";
import { getBaseUrlFromHeaders } from "@/lib/domain-utils";

interface SubdivisionPageProps {
  params: Promise<{
    cityId: string;
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: SubdivisionPageProps): Promise<Metadata> {
  const { cityId, slug } = await params;
  await dbConnect();

  // Find all subdivisions with this slug, then match by city
  // Many subdivisions share names (e.g. "Downtown") across different cities
  const candidates = await Subdivision.find({ slug }).lean();
  const subdivision = candidates.find((s) => createSlug(s.city) === cityId);

  if (!subdivision || createSlug(subdivision.city) !== cityId) {
    return {
      title: "Subdivision Not Found",
    };
  }

  const baseUrl = await getBaseUrlFromHeaders();

  return {
    title: `${subdivision.name} Homes for Sale | ${subdivision.city}, CA`,
    description:
      subdivision.description ||
      `Browse ${subdivision.listingCount} homes for sale in ${subdivision.name}, ${subdivision.city}. Average price: $${subdivision.avgPrice.toLocaleString()}. Joseph Sardella, local Coachella Valley expert.`,
    alternates: {
      canonical: `${baseUrl}/neighborhoods/${cityId}/${slug}`,
    },
  };
}

export default async function SubdivisionPage({ params }: SubdivisionPageProps) {
  const { cityId, slug } = await params;
  await dbConnect();

  // Find correct subdivision for this city (many share names like "Downtown")
  const candidates = await Subdivision.find({ slug }).lean();
  const subdivision = candidates.find((s) => createSlug(s.city) === cityId);

  if (!subdivision) {
    notFound();
  }

  // Serialize subdivision to plain object for Client Component
  const serializedSubdivision = JSON.parse(JSON.stringify(subdivision));

  const baseUrl = await getBaseUrlFromHeaders();
  const breadcrumbItems = [
    { name: "Home", url: baseUrl },
    { name: "Neighborhoods", url: `${baseUrl}/neighborhoods` },
    { name: subdivision.city, url: `${baseUrl}/neighborhoods/${cityId}` },
    { name: subdivision.name, url: `${baseUrl}/neighborhoods/${cityId}/${slug}` },
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
