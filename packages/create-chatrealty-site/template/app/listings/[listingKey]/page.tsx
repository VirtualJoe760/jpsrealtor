import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getListing } from "@/lib/chatrealty";
import { money, num } from "@/lib/format";
import Attribution from "@/components/Attribution";
import FavoriteButton from "@/components/FavoriteButton";
import InquiryForm from "@/components/InquiryForm";
import ListingMapClient from "@/components/ListingMapClient";

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
}: {
  params: Promise<{ listingKey: string }>;
}) {
  const { listingKey } = await params;
  const l = await getListing(listingKey);
  if (!l) notFound();

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
      <Link href="/listings" className="text-sm text-brand hover:underline">← Back to listings</Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-2xl bg-gray-100">
            <div className="absolute right-4 top-4 z-10">
              <FavoriteButton listing={l} />
            </div>
            {l.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.thumbUrl} alt={l.address ?? "Listing photo"} className="aspect-[16/10] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center text-gray-400">No photo available</div>
            )}
            {l.photoCount > 1 && (
              <a
                href={l.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-4 right-4 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white"
              >
                View all {l.photoCount} photos
              </a>
            )}
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
