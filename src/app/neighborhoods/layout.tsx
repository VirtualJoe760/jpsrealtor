/**
 * Navless layout for Neighborhoods — no traditional navigation, seamless,
 * immersive experience.
 *
 * ── Do not put a `metadata` export back in this file ─────────────────────────
 *
 * Until 2026-10-14 this layout exported a static Metadata block titled
 * "Coachella Valley Neighborhoods | Palm Desert, Indian Wells, La Quinta &
 * More", with a generic CV description, a CV keyword list, and
 * `city-images/la-quinta.jpg` as the og/twitter image.
 *
 * Next.js metadata merges FIELD BY FIELD, and every route under this layout set
 * only `title` / `description` / `alternates`. So the whole statewide
 * neighborhood tree — ~230 cities, ~1,400 subdivisions, Riverside included —
 * served correct <title>s next to og:title "Coachella Valley Neighborhoods",
 * a CV og:description, a photo of La Quinta, and keywords naming CV cities.
 * Those are the tags social platforms and Google's preview actually read, so
 * every page in the tree was announcing itself as the same CV hub page: a
 * duplicate-content signal generated entirely by metadata inheritance.
 *
 * The directory's own tags now live on the directory page (./page.tsx), where
 * they describe one URL instead of thousands. Place pages build complete
 * og/twitter blocks through `buildPlaceMetadata()` in lib/seo-metadata.ts.
 */

export default function NeighborhoodsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen">{children}</div>;
}
