import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getListing, getListingPhotos } from "@/lib/chatrealty";
import { money, num } from "@/lib/format";
import Attribution from "@/components/Attribution";
import FavoriteButton from "@/components/FavoriteButton";
import InquiryForm from "@/components/InquiryForm";
import ListingMapClient from "@/components/ListingMapClient";
import PhotoGallery from "@/components/PhotoGallery";

// Where "← Back to listings" goes. Cards carry the visitor's search in `?back=`
// so returning from a detail page lands on the search they built, not the
// unfiltered browse. Only same-site paths under /listings are honored — an
// attacker-supplied `back` must never turn this into an off-site redirect.
function safeBackHref(back: string | undefined): string {
  if (!back) return "/listings";
  const decoded = (() => {
    try {
      return decodeURIComponent(back);
    } catch {
      return "";
    }
  })();
  return /^\/listings(\?|$)/.test(decoded) ? decoded : "/listings";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ listingKey: string }>;
}): Promise<Metadata> {
  const { listingKey } = await params;
  const l = await getListing(listingKey).catch(() => null);
  if (!l) return { title: "Listing" };
  return {
    title: `${l.address ?? "Home"} — ${money(l.currentPrice ?? l.listPrice)}`,
    description: l.publicRemarks?.slice(0, 160) ?? undefined,
  };
}

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingKey: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const [{ listingKey }, { back }] = await Promise.all([params, searchParams]);
  const l = await getListing(listingKey);
  if (!l) notFound();
  const photos = await getListingPhotos(l.listingKey);
  const backHref = safeBackHref(back);

  const facts: [string, string][] = [
    ["Beds", num(l.beds)],
    ["Baths", num(l.baths)],
    ["Sqft", num(l.sqft)],
    ["Year built", l.yearBuilt ? String(l.yearBuilt) : "—"],
    ["Property type", l.propertyType ?? "—"],
    ["Status", l.status ?? "—"],
    ["HOA", l.hoaFee != null ? `${money(l.hoaFee)}${l.hoaFeeFrequency ? ` / ${l.hoaFeeFrequency}` : ""}` : "—"],
    ["Pool", l.pool ? "Yes" : "No"],
    ["Days on market", l.daysOnMarket != null ? String(l.daysOnMarket) : "—"],
  ];

  return (
    <div>
      <Link href={backHref} className="text-sm text-brand hover:underline">← Back to listings</Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative">
            <div className="absolute right-4 top-4 z-10">
              <FavoriteButton listing={l} />
            </div>
            {/* Every photo, ON THIS SITE. The old "View all N photos" button
                linked to chatrealty.io — never send the buyer off-site to see
                the rest of a home they're already looking at. */}
            <PhotoGallery
              photos={photos}
              fallbackUrl={l.thumbUrl}
              alt={l.address ?? "Listing photo"}
            />
          </div>

          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{money(l.currentPrice ?? l.listPrice)}</h1>
            </div>
            <p className="mt-1 text-lg text-gray-700">{l.address}</p>
            <p className="text-gray-500">
              {[l.city, l.state, l.postalCode].filter(Boolean).join(", ")}
              {l.subdivision ? ` · ${l.subdivision}` : ""}
            </p>
            {/* IDX attribution — required */}
            <Attribution agent={l.listAgentName} office={l.listOfficeName} className="mt-2 !text-xs" />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-gray-400">{k}</dt>
                <dd className="text-sm font-medium text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>

          {l.publicRemarks && (
            <div className="mt-6">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">About this home</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{l.publicRemarks}</p>
            </div>
          )}

          {l.latitude != null && l.longitude != null && (
            <div className="mt-6 h-72 overflow-hidden rounded-xl border border-gray-200">
              <ListingMapClient listings={[l]} />
            </div>
          )}
        </div>

        {/* Inquiry sidebar */}
        <aside>
          <div className="sticky top-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Interested?</h2>
            <p className="mb-4 text-sm text-gray-500">Send a quick note and we&apos;ll follow up.</p>
            <InquiryForm listingKey={l.listingKey} />
          </div>
        </aside>
      </div>
    </div>
  );
}
