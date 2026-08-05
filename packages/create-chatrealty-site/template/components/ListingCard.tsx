import Link from "next/link";
import type { ListingSummary } from "@/lib/types";
import { money, num } from "@/lib/format";
import Attribution from "./Attribution";
import FavoriteButton from "./FavoriteButton";

export default function ListingCard({
  listing,
  priority = false,
  backHref,
}: {
  listing: ListingSummary;
  // Above-the-fold cards (featured homes, first listings row) pass priority so
  // their photo loads eagerly — lazy-loading them left blank gray boxes on
  // first paint (tester find). Off-screen cards stay lazy.
  priority?: boolean;
  // Where "← Back to listings" should return to from the detail page. Carries
  // the visitor's search with them; without it, clicking a result and coming
  // back dropped them on the unfiltered browse.
  backHref?: string;
}) {
  const href =
    `/listings/${encodeURIComponent(listing.listingKey)}` +
    (backHref ? `?back=${encodeURIComponent(backHref)}` : "");
  const specs = [
    listing.beds != null ? `${num(listing.beds)} bd` : null,
    listing.baths != null ? `${num(listing.baths)} ba` : null,
    listing.sqft != null ? `${num(listing.sqft)} sqft` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton listing={listing} />
      </div>

      <Link href={href} className="block">
        <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100">
          {listing.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.thumbUrl}
              alt={listing.address || "Listing photo"}
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              loading={priority ? "eager" : "lazy"}
              // React 19 added fetchPriority to the img types and warns on the
              // lowercase DOM spelling, so a brand-new site logged console
              // errors on its very first page. Camel case is both correct for
              // React and no longer needs a ts-expect-error.
              fetchPriority={priority ? "high" : undefined}
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              No photo available
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-lg font-bold text-gray-900">{money(listing.currentPrice ?? listing.listPrice)}</p>
            {listing.distanceMiles != null && (
              <span className="text-xs text-gray-500">{listing.distanceMiles} mi</span>
            )}
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-gray-700">{listing.address || "Address withheld"}</p>
          <p className="text-sm text-gray-500">
            {[listing.city, listing.subdivision].filter(Boolean).join(" · ")}
          </p>
          {specs && <p className="mt-2 text-sm font-medium text-gray-700">{specs}</p>}
          <Attribution agent={listing.listAgentName} office={listing.listOfficeName} className="mt-2" />
        </div>
      </Link>
    </div>
  );
}
