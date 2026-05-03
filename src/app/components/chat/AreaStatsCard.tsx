"use client";

// AreaStatsCard — renders aggregate stats from the getAreaStats tool.
// Tool-emitted shape lives in ComponentData.areaStats (ChatProvider.tsx).

import { useTheme } from "@/app/contexts/ThemeContext";
import type { ComponentData } from "./ChatProvider";

type AreaStats = NonNullable<ComponentData["areaStats"]>;

const fmt = (n: number) => n.toLocaleString("en-US");
const money = (n: number) => `$${fmt(Math.round(n))}`;

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  A: "Sale",
  B: "Rental",
  C: "Multifamily",
  D: "Land",
};

const SCOPE_LABELS: Record<string, string> = {
  street: "Street",
  subdivision: "Subdivision",
  city: "City",
  county: "County",
  zip: "ZIP",
};

export default function AreaStatsCard({ data }: { data: AreaStats }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const { scope, propertyType, stats } = data;
  const isRental = propertyType === "B";

  // Annualized rent figure for rentals (listPrice on type-B records is the
  // monthly rent, no separate field — see UnifiedListing model).
  const avgAnnualRent = isRental ? stats.avgPrice * 12 : null;
  const medianAnnualRent = isRental ? stats.medianPrice * 12 : null;

  if (stats.totalListings === 0) {
    return (
      <div
        className={`p-6 rounded-lg border ${
          isLight
            ? "bg-blue-50 border-blue-200 text-gray-700"
            : "bg-neutral-800/50 border-neutral-700 text-neutral-300"
        }`}
      >
        <p className="text-sm">
          No active {isRental ? "rentals" : "listings"} found in <strong>{scope.value}</strong>.
          Try widening the filters.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`p-5 rounded-lg border space-y-4 ${
        isLight
          ? "bg-white border-gray-200"
          : "bg-neutral-900 border-neutral-700"
      }`}
    >
      {/* Header */}
      <div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3
            className={`text-base font-semibold ${
              isLight ? "text-gray-900" : "text-white"
            }`}
          >
            {scope.value}
          </h3>
          <span
            className={`text-xs ${
              isLight ? "text-gray-500" : "text-neutral-400"
            }`}
          >
            {SCOPE_LABELS[scope.type] || scope.type}
            {" · "}
            {PROPERTY_TYPE_LABELS[propertyType] || propertyType}
            {scope.cityName && scope.type === "street" && ` · ${scope.cityName}`}
          </span>
        </div>
        <p
          className={`text-xs mt-1 ${
            isLight ? "text-gray-600" : "text-neutral-400"
          }`}
        >
          {fmt(stats.totalListings)} {stats.totalListings === 1 ? "listing" : "listings"}
          {stats.newListingsCount > 0 && (
            <> · {stats.newListingsCount} new this week</>
          )}
        </p>
      </div>

      {/* Headline grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat
          label={isRental ? "Avg monthly rent" : "Avg price"}
          value={money(stats.avgPrice)}
          isLight={isLight}
        />
        <Stat
          label={isRental ? "Median monthly rent" : "Median price"}
          value={money(stats.medianPrice)}
          isLight={isLight}
        />
        <Stat
          label="Range"
          value={`${money(stats.priceRange.min)} – ${money(stats.priceRange.max)}`}
          isLight={isLight}
        />
        {isRental && avgAnnualRent !== null && (
          <Stat
            label="Avg annualized"
            value={money(avgAnnualRent)}
            isLight={isLight}
          />
        )}
        {isRental && medianAnnualRent !== null && (
          <Stat
            label="Median annualized"
            value={money(medianAnnualRent)}
            isLight={isLight}
          />
        )}
        {stats.avgSqft > 0 && (
          <Stat
            label="Avg sqft"
            value={fmt(stats.avgSqft)}
            isLight={isLight}
          />
        )}
        {stats.medianPricePerSqft > 0 && (
          <Stat
            label={isRental ? "Median rent / sqft" : "Median $/sqft"}
            value={`$${fmt(stats.medianPricePerSqft)}`}
            isLight={isLight}
          />
        )}
      </div>

      {/* Property subtype breakdown */}
      {stats.propertyTypes.length > 1 && (
        <div>
          <p
            className={`text-xs uppercase tracking-wide font-medium mb-2 ${
              isLight ? "text-gray-500" : "text-neutral-400"
            }`}
          >
            Property type breakdown
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className={`text-left ${
                    isLight ? "text-gray-600" : "text-neutral-400"
                  }`}
                >
                  <th className="font-normal pb-1">Type</th>
                  <th className="font-normal pb-1 text-right">Count</th>
                  <th className="font-normal pb-1 text-right">Avg</th>
                  <th className="font-normal pb-1 text-right">$/sqft</th>
                </tr>
              </thead>
              <tbody className={isLight ? "text-gray-900" : "text-white"}>
                {stats.propertyTypes.map((p) => (
                  <tr
                    key={p.subType}
                    className={`border-t ${
                      isLight ? "border-gray-100" : "border-neutral-800"
                    }`}
                  >
                    <td className="py-1.5">{p.subType}</td>
                    <td className="py-1.5 text-right">{fmt(p.count)}</td>
                    <td className="py-1.5 text-right">{money(p.avgPrice)}</td>
                    <td className="py-1.5 text-right">
                      {p.avgPricePerSqft > 0 ? `$${fmt(p.avgPricePerSqft)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HOA + amenities — only show when meaningful */}
      {(stats.hoa || hasAnyAmenity(stats.amenities)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.hoa && (
            <div>
              <p
                className={`text-xs uppercase tracking-wide font-medium mb-1 ${
                  isLight ? "text-gray-500" : "text-neutral-400"
                }`}
              >
                HOA ({stats.hoa.count} of {stats.totalListings})
              </p>
              <p
                className={`text-sm ${isLight ? "text-gray-900" : "text-white"}`}
              >
                ${fmt(stats.hoa.min)}–${fmt(stats.hoa.max)} / mo · avg ${fmt(stats.hoa.avg)}
              </p>
            </div>
          )}
          {hasAnyAmenity(stats.amenities) && (
            <div>
              <p
                className={`text-xs uppercase tracking-wide font-medium mb-1 ${
                  isLight ? "text-gray-500" : "text-neutral-400"
                }`}
              >
                Amenity rates
              </p>
              <p
                className={`text-sm ${isLight ? "text-gray-900" : "text-white"}`}
              >
                {amenityList(stats.amenities)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  isLight,
}: {
  label: string;
  value: string;
  isLight: boolean;
}) {
  return (
    <div>
      <p
        className={`text-xs ${
          isLight ? "text-gray-500" : "text-neutral-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-base font-semibold ${
          isLight ? "text-gray-900" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function hasAnyAmenity(a: AreaStats["stats"]["amenities"]): boolean {
  return (
    a.poolPct > 0 ||
    a.spaPct > 0 ||
    a.viewPct > 0 ||
    a.fireplacePct > 0 ||
    a.gatedPct > 0 ||
    a.seniorPct > 0
  );
}

function amenityList(a: AreaStats["stats"]["amenities"]): string {
  const parts: string[] = [];
  if (a.poolPct > 0) parts.push(`${a.poolPct}% pool`);
  if (a.spaPct > 0) parts.push(`${a.spaPct}% spa`);
  if (a.viewPct > 0) parts.push(`${a.viewPct}% view`);
  if (a.fireplacePct > 0) parts.push(`${a.fireplacePct}% fireplace`);
  if (a.gatedPct > 0) parts.push(`${a.gatedPct}% gated`);
  if (a.seniorPct > 0) parts.push(`${a.seniorPct}% 55+`);
  return parts.join(" · ");
}
