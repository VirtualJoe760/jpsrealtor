// src/app/subdivisions/[slug]/page.tsx
// Redirect to new URL structure: /neighborhoods/[cityId]/[slug]

import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { findCityByName } from "@/app/constants/counties";

interface SubdivisionPageProps {
  params: {
    slug: string;
  };
}

export default async function SubdivisionRedirect({ params }: SubdivisionPageProps) {
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug: params.slug }).lean();

  if (!subdivision) {
    // If subdivision doesn't exist, redirect to neighborhoods page
    redirect("/neighborhoods");
  }

  // Get cityId from city name
  const cityData = findCityByName(subdivision.city);

  if (!cityData) {
    // If city not found in our system, redirect to neighborhoods
    redirect("/neighborhoods");
  }

  // Redirect to new URL structure
  redirect(`/neighborhoods/${cityData.city.id}/${params.slug}`);
}
