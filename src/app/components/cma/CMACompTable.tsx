"use client";

import { CMAComp, CMAStats } from "@/lib/cma/types";
import {
  Table, TableHeader, TableBody, TableFooter,
  TableHead, TableRow, TableCell,
} from "@/app/components/ui/table";
import { useTheme } from "@/app/contexts/ThemeContext";
import CMAConfidenceBadge from "./CMAConfidenceBadge";

// Same event ChatWidget listens for from ListingOptionsList — opens
// the production ListingBottomPanel for an active listing. Closed
// comp rows don't dispatch since /api/mls-listings/[slug] only serves
// active inventory.
const OPEN_PANEL_EVENT = "chatv3:open-listing-panel";

function compToSlim(comp: CMAComp) {
  return {
    listingKey: comp.listingKey,
    slugAddress: (comp as any).slugAddress, // Python may not write this on cmaStats comps
    address: comp.address,
    city: comp.city,
    subdivision: comp.subdivisionName ?? undefined,
    price: comp.currentListPrice ?? (comp as any).listPrice ?? 0,
    beds: comp.bedsTotal,
    baths: comp.bathsTotal,
    sqft: comp.livingArea,
    lotSize: comp.lotSize,
    yearBuilt: comp.yearBuilt,
    primaryPhotoUrl: (comp as any).primaryPhotoUrl,
    standardStatus: "Active",
    latitude: (comp as any).latitude,
    longitude: (comp as any).longitude,
  };
}

function dispatchOpenPanel(comp: CMAComp, allComps: CMAComp[], index: number) {
  if (typeof window === "undefined") return;
  // Pass the full active-comp set + the clicked index so the bottom
  // panel's swipe queue can navigate through all comps, not just the
  // one that was clicked.
  const siblings = allComps.map(compToSlim);
  window.dispatchEvent(
    new CustomEvent(OPEN_PANEL_EVENT, {
      detail: {
        listing: compToSlim(comp),
        siblings,
        index,
      },
    })
  );
}

function fmt(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString();
}

function fmtPrice(n: number | undefined | null): string {
  if (n == null || isNaN(n) || n === 0) return "—";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtRatio(n: number | undefined | null): string {
  if (n == null || isNaN(n) || n === 0) return "—";
  return n.toFixed(2);
}

function poolSpaGarage(comp: CMAComp): string {
  const p = comp.pool.value === true ? "Yes" : comp.pool.value === false ? "No" : "?";
  const s = comp.spa.value === true ? "Yes" : comp.spa.value === false ? "No" : "?";
  const g = comp.garageSpaces > 0 ? String(comp.garageSpaces) : "—";
  return `${p}/${s}/${g}`;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  } catch { return "—"; }
}

interface CMACompTableProps {
  title: string;
  comps: CMAComp[];
  stats: CMAStats;
  isClosed: boolean;
}

export default function CMACompTable({ title, comps, stats, isClosed }: CMACompTableProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  if (comps.length === 0) {
    return (
      <div className={`rounded-xl p-6 text-center text-sm ${isLight ? "bg-gray-50 text-gray-500" : "bg-neutral-900/40 text-neutral-500"}`}>
        No {isClosed ? "closed" : "active"} comparables found.
      </div>
    );
  }

  const headerBg = isClosed
    ? isLight ? "bg-blue-600" : "bg-blue-700"
    : isLight ? "bg-emerald-600" : "bg-emerald-700";

  const cellClass = `text-xs whitespace-nowrap ${isLight ? "text-gray-900" : "text-gray-200"}`;
  const headClass = `text-[11px] font-semibold whitespace-nowrap ${isLight ? "text-gray-600" : "text-neutral-400"}`;
  const footClass = `text-xs font-semibold whitespace-nowrap ${isLight ? "text-gray-700" : "text-gray-300"}`;

  return (
    <div className={`rounded-xl overflow-hidden border ${isLight ? "border-gray-200" : "border-neutral-800"}`}>
      {/* Section header */}
      <div className={`${headerBg} px-4 py-2.5`}>
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>

      <Table>
        <TableHeader>
          <TableRow className={isLight ? "bg-gray-50" : "bg-neutral-900/60"}>
            <TableHead className={headClass}>Address</TableHead>
            <TableHead className={headClass}>City</TableHead>
            <TableHead className={headClass}>Year</TableHead>
            {/* P/S/G column hidden until backend Python script writes
                pool/spa onto comp objects under canonical field names —
                see docs/cma/BACKEND_FIX_COMP_POOL_SPA.md. Showing "?/?/2"
                across the board makes the report look broken even though
                the missing data is a server-side normalization gap. */}
            {/* <TableHead className={headClass}>P/S/G</TableHead> */}
            {/* Date is the close date; only meaningful for closed comps. */}
            {isClosed && <TableHead className={headClass}>Date</TableHead>}
            <TableHead className={`${headClass} text-right`}>BD</TableHead>
            <TableHead className={`${headClass} text-right`}>BTH</TableHead>
            <TableHead className={`${headClass} text-right`}>SqFt</TableHead>
            <TableHead className={`${headClass} text-right`}>LotSz</TableHead>
            {/* LP/SqFt only meaningful for active comps. Closed comps
                report SP/SqFt below, which is the real signal. */}
            {!isClosed && <TableHead className={`${headClass} text-right`}>LP/SqFt</TableHead>}
            <TableHead className={`${headClass} text-right`}>LP</TableHead>
            {isClosed && <TableHead className={`${headClass} text-right`}>SP</TableHead>}
            {isClosed && <TableHead className={`${headClass} text-right`}>SP/SqFt</TableHead>}
            {isClosed && <TableHead className={`${headClass} text-right`}>SP/LP</TableHead>}
            <TableHead className={`${headClass} text-right`}>DIM</TableHead>
            <TableHead className={`${headClass} text-right`}>Score</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {comps.map((comp, i) => (
            <TableRow
              key={comp.listingKey}
              onClick={!isClosed ? () => dispatchOpenPanel(comp, comps, i) : undefined}
              className={`${
                isLight ? "hover:bg-gray-50" : "hover:bg-neutral-800/30"
              } ${
                !isClosed ? "cursor-pointer" : ""
              }`}
              title={!isClosed ? "Click to view photos and full details" : undefined}
            >
              <TableCell className={`${cellClass} max-w-[180px] truncate`}>
                {comp.address}
              </TableCell>
              <TableCell className={cellClass}>{comp.city}</TableCell>
              <TableCell className={cellClass}>{comp.yearBuilt || "—"}</TableCell>
              {/* P/S/G column hidden — see header comment */}
              {/* <TableCell className={cellClass}>
                <span title="Pool / Spa / Garage">{poolSpaGarage(comp)}</span>
              </TableCell> */}
              {isClosed && <TableCell className={cellClass}>{formatDate(comp.date)}</TableCell>}
              <TableCell className={`${cellClass} text-right`}>{comp.bedsTotal}</TableCell>
              <TableCell className={`${cellClass} text-right`}>{comp.bathsTotal}</TableCell>
              <TableCell className={`${cellClass} text-right`}>{fmt(comp.livingArea)}</TableCell>
              <TableCell className={`${cellClass} text-right`}>{fmt(comp.lotSize)}</TableCell>
              {!isClosed && (
                <TableCell className={`${cellClass} text-right`}>${fmt(comp.listPricePerSqft)}</TableCell>
              )}
              <TableCell className={`${cellClass} text-right`}>{fmtPrice(comp.currentListPrice)}</TableCell>
              {isClosed && <TableCell className={`${cellClass} text-right font-semibold`}>{fmtPrice(comp.closePrice)}</TableCell>}
              {isClosed && <TableCell className={`${cellClass} text-right`}>${fmt(comp.salePricePerSqft)}</TableCell>}
              {isClosed && <TableCell className={`${cellClass} text-right`}>{fmtRatio(comp.salePriceToListRatio)}</TableCell>}
              <TableCell className={`${cellClass} text-right`}>{comp.daysOnMarket}</TableCell>
              <TableCell className={`${cellClass} text-right`}>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  comp.similarityScore >= 70 ? "bg-emerald-500/20 text-emerald-400" :
                  comp.similarityScore >= 50 ? "bg-amber-500/20 text-amber-400" :
                  "bg-red-500/20 text-red-400"
                }`}>
                  {Math.round(comp.similarityScore)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

        <TableFooter className={isLight ? "bg-gray-50" : "bg-neutral-900/60"}>
          {/* Average row */}
          <TableRow>
            <TableCell className={footClass}>
              Total: {stats.count} · Average
            </TableCell>
            <TableCell className={footClass} />
            <TableCell className={footClass} />
            {/* Date column only renders for closed; keep the empty
                placeholder cell aligned. */}
            {isClosed && <TableCell className={footClass} />}
            <TableCell className={`${footClass} text-right`}>{stats.avgBedsTotal.toFixed(1)}</TableCell>
            <TableCell className={`${footClass} text-right`}>{stats.avgBathsTotal.toFixed(1)}</TableCell>
            <TableCell className={`${footClass} text-right`}>{fmt(stats.avgSqft)}</TableCell>
            <TableCell className={`${footClass} text-right`}>{fmt(stats.avgLotSize)}</TableCell>
            {!isClosed && (
              <TableCell className={`${footClass} text-right`}>${fmt(stats.avgPricePerSqft)}</TableCell>
            )}
            <TableCell className={`${footClass} text-right`}>{fmtPrice(stats.avgPrice)}</TableCell>
            {isClosed && <TableCell className={`${footClass} text-right`}>{fmtPrice(stats.avgPrice)}</TableCell>}
            {isClosed && <TableCell className={`${footClass} text-right`}>${fmt(stats.avgPricePerSqft)}</TableCell>}
            {isClosed && <TableCell className={`${footClass} text-right`}>{fmtRatio(stats.avgSalePriceToListRatio)}</TableCell>}
            <TableCell className={`${footClass} text-right`}>{stats.avgDaysOnMarket}</TableCell>
            <TableCell className={footClass} />
          </TableRow>
          {/* Median row */}
          <TableRow>
            <TableCell className={footClass}>Median</TableCell>
            {/* spans City + Year + (Date if closed) + BD + BTH */}
            <TableCell className={footClass} colSpan={isClosed ? 5 : 4} />
            <TableCell className={`${footClass} text-right`}>{fmt(stats.medianSqft)}</TableCell>
            <TableCell className={footClass} />
            {!isClosed && <TableCell className={footClass} />}
            <TableCell className={`${footClass} text-right`}>{fmtPrice(stats.medianPrice)}</TableCell>
            {isClosed && <TableCell className={`${footClass} text-right`}>{fmtPrice(stats.medianPrice)}</TableCell>}
            {isClosed && <TableCell className={footClass} colSpan={2} />}
            <TableCell className={footClass} />
            <TableCell className={footClass} />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
