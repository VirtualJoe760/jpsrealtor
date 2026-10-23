// src/app/subdivisions/[slug]/buy/page.tsx
// Redirect to new URL structure: /neighborhoods/[cityId]/[slug]/buy
// ── Why this points at an ANCHOR and not at a /buy route ────────────────────
//
// This shim used to redirect to /neighborhoods/{city}/{slug}/buy. That URL was
// removed on 2026-10-14 (it was one of ~460 near-identical per-place buy/sell
// pages) and now 301s to /neighborhoods/{city}#buy — so leaving this pointing
// there produced a REDIRECT CHAIN: /subdivisions/x/buy → /neighborhoods/c/x/buy
// → /neighborhoods/c#buy. Google follows chains but discounts them, and each
// hop is a round trip for a real visitor. Point straight at the destination.
//
// `permanentRedirect` (308), not `redirect` (307): this is a settled URL
// migration, and a temporary redirect tells Google to keep the old URL in the
// index and keep checking back.

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

interface BuySubdivisionPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function BuySubdivisionRedirect({ params }: BuySubdivisionPageProps) {
  const { slug } = await params;
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug }).lean();

  if (!subdivision) {
    redirect("/neighborhoods");
  }

  const cityData = findCityByName(subdivision.city);

  if (!cityData) {
    redirect("/neighborhoods");
  }

  permanentRedirect(`/neighborhoods/${cityData.city.id}#buy`);
}
