// src/app/subdivisions/[slug]/buy/page.tsx
// Redirect to new URL structure: /neighborhoods/[cityId]/[slug]/buy

import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { findCityByName } from "@/app/constants/counties";

interface BuySubdivisionPageProps {
  params: {
    slug: string;
  };
}

export default async function BuySubdivisionRedirect({ params }: BuySubdivisionPageProps) {
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug: params.slug }).lean();

  if (!subdivision) {
    redirect("/neighborhoods");
  }

  const cityData = findCityByName(subdivision.city);

  if (!cityData) {
    redirect("/neighborhoods");
  }

  redirect(`/neighborhoods/${cityData.city.id}/${params.slug}/buy`);
}
