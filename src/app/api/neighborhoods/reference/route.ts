import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import { City } from '@/models/cities';
import Subdivision from '@/models/subdivisions';

/**
 * GET /api/neighborhoods/reference
 *
 * Lightweight hierarchy for UI selectors (campaign wizard, etc.)
 * Returns just names and slugs — no listing counts, prices, or stats.
 * Loads in <200ms vs 2-5s for the full /neighborhoods/directory endpoint.
 *
 * Response: { regions: [{ name, slug, counties: [{ name, slug, cities: [{ name, slug }] }] }] }
 *
 * Subdivisions are NOT included in the initial response — fetch them
 * on demand via ?city=slug query param.
 */
export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const citySlug = searchParams.get('city');
    const search = searchParams.get('search');

    // Global subdivision search across all cities — used by the campaign wizard
    if (search && search.trim().length >= 2) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const subs = await Subdivision.find(
        { name: { $regex: escaped, $options: 'i' } },
        { name: 1, slug: 1, city: 1, _id: 0 }
      )
        .limit(30)
        .sort({ name: 1 })
        .lean();

      const cityNames = Array.from(new Set(subs.map((s: any) => s.city).filter(Boolean)));
      const cities = cityNames.length > 0
        ? await City.find({ name: { $in: cityNames } }, { name: 1, slug: 1, _id: 0 }).lean()
        : [];
      const citySlugByName = new Map(cities.map((c: any) => [c.name, c.slug]));

      const results = subs.map((s: any) => ({
        name: s.name,
        slug: s.slug,
        city: s.city,
        citySlug: citySlugByName.get(s.city) || String(s.city).toLowerCase().replace(/\s+/g, '-'),
      }));

      return NextResponse.json({ subdivisions: results });
    }

    // If city param provided, return subdivisions for that city
    if (citySlug) {
      const subdivisions = await Subdivision.find(
        { city: { $regex: new RegExp(`^${citySlug.replace(/-/g, '.').replace(/\./g, '[- ]')}$`, 'i') } },
        { name: 1, slug: 1, _id: 0 }
      )
        .sort({ name: 1 })
        .lean();

      // Also try by slug lookup on the city model
      if (subdivisions.length === 0) {
        const city = await City.findOne({ slug: citySlug }, { name: 1 }).lean();
        if (city) {
          const subsByCityName = await Subdivision.find(
            { city: (city as any).name },
            { name: 1, slug: 1, _id: 0 }
          )
            .sort({ name: 1 })
            .lean();
          return NextResponse.json({ subdivisions: subsByCityName });
        }
      }

      return NextResponse.json({ subdivisions });
    }

    // Otherwise, return the region → county → city tree (no subdivisions)
    const cities = await City.find(
      { listingCount: { $gt: 0 } },
      { name: 1, slug: 1, county: 1, region: 1, _id: 0 }
    )
      .sort({ name: 1 })
      .lean();

    // Build hierarchy
    const regionMap: Record<string, Record<string, { name: string; slug: string }[]>> = {};

    for (const city of cities) {
      const region = (city as any).region || 'Other';
      const county = (city as any).county || 'Other';
      if (!regionMap[region]) regionMap[region] = {};
      if (!regionMap[region][county]) regionMap[region][county] = [];
      regionMap[region][county].push({
        name: (city as any).name,
        slug: (city as any).slug,
      });
    }

    const regions = Object.entries(regionMap)
      .map(([regionName, counties]) => ({
        name: regionName,
        slug: regionName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        counties: Object.entries(counties)
          .map(([countyName, citiesList]) => ({
            name: countyName,
            slug: countyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            cities: citiesList,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(
      { regions },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (error) {
    console.error('[neighborhoods/reference] Error:', error);
    return NextResponse.json({ error: 'Failed to load neighborhoods' }, { status: 500 });
  }
}
