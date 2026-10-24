// src/app/subdivisions/[slug]/page.tsx
// Redirect to new URL structure: /neighborhoods/[cityId]/[slug]
// `permanentRedirect` (308) rather than `redirect` (307): this is a settled URL
// migration to the /neighborhoods/{city}/{slug} structure, and a TEMPORARY
// redirect asks Google to keep the old URL indexed and keep re-checking it.

// `params` is AWAITED. It is a Promise in Next.js 16, and this file read
// `params.slug` synchronously — so the slug was always `undefined`, the
// Subdivision lookup always missed, and EVERY legacy URL here fell through to
// the "not found" branch and dumped the visitor on /neighborhoods. The
// redirects had been silently dead; TypeScript did not catch it because the
// local Props interface declared the old non-Promise shape.
import { permanentRedirect, redirect } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { findCityByName } from "@/app/constants/counties";

interface SubdivisionPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function SubdivisionRedirect({ params }: SubdivisionPageProps) {
  const { slug } = await params;
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug }).lean();

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
  permanentRedirect(`/neighborhoods/${cityData.city.id}/${slug}`);
}
