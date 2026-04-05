"use client";

import { CMAComp, CMAStats } from "@/lib/cma/types";
import {
  Table, TableHeader, TableBody, TableFooter,
  TableHead, TableRow, TableCell,
} from "@/app/components/ui/table";
import { useTheme } from "@/app/contexts/ThemeContext";
import CMAConfidenceBadge from "./CMAConfidenceBadge";

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
            <TableHead className={headClass}>Listing #</TableHead>
            <TableHead className={headClass}>Address</TableHead>
            <TableHead className={headClass}>City</TableHead>
            <TableHead className={headClass}>Year</TableHead>
            <TableHead className={headClass}>P/S/G</TableHead>
            <TableHead className={headClass}>Date</TableHead>
            <TableHead className={`${headClass} text-right`}>BD</TableHead>
            <TableHead className={`${headClass} text-right`}>BTH</TableHead>
            <TableHead className={`${headClass} text-right`}>SqFt</TableHead>
            <TableHead className={`${headClass} text-right`}>LotSz</TableHead>
            <TableHead className={`${headClass} text-right`}>LP/SqFt</TableHead>
            <TableHead className={`${headClass} text-right`}>Orig LP</TableHead>
            <TableHead className={`${headClass} text-right`}>LP</TableHead>
            {isClosed && <TableHead className={`${headClass} text-right`}>SP</TableHead>}
            {isClosed && <TableHead className={`${headClass} text-right`}>SP/SqFt</TableHead>}
            {isClosed && <TableHead className={`${headClass} text-right`}>SP/LP</TableHead>}
            <TableHead className={`${headClass} text-right`}>DIM</TableHead>
            <TableHead className={`${headClass} text-right`}>Score</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {comps.map((comp) => (
            <TableRow
              key={comp.listingKey}
              className={isLight ? "hover:bg-gray-50" : "hover:bg-neutral-800/30"}
            >
              <TableCell className={cellClass}>{comp.listingId}</TableCell>
              <TableCell className={`${cellClass} max-w-[180px] truncate`}>
                {comp.address}
              </TableCell>
              <TableCell className={cellClass}>{comp.city}</TableCell>
              <TableCell className={cellClass}>{comp.yearBuilt || "—"}</TableCell>
              <TableCell className={cellClass}>
                <span title="Pool / Spa / Garage">{poolSpaGarage(comp)}</span>
              </TableCell>
              <TableCell className={cellClass}>{formatDate(comp.date)}</TableCell>
              <TableCell className={`${cellClass} text-right`}>{comp.bedsTotal}</TableCell>
              <TableCell className={`${cellClass} text-right`}>{comp.bathsTotal}</TableCell>
              <TableCell className={`${cellClass} text-right`}>{fmt(comp.livingArea)}</TableCell>
              <TableCell className={`${cellClass} text-right`}>{fmt(comp.lotSize)}</TableCell>
              <TableCell className={`${cellClass} text-right`}>${fmt(comp.listPricePerSqft)}</TableCell>
              <TableCell className={`${cellClass} text-right`}>{fmtPrice(comp.originalListPrice)}</TableCell>
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
            <TableCell className={footClass} colSpan={2}>
              Total: {stats.count} · Average
            </TableCell>
            <TableCell className={footClass} />
            <TableCell className={footClass} />
            <TableCell className={footClass} />
            <TableCell className={footClass} />
            <TableCell className={`${footClass} text-right`}>{stats.avgBedsTotal.toFixed(1)}</TableCell>
            <TableCell className={`${footClass} text-right`}>{stats.avgBathsTotal.toFixed(1)}</TableCell>
            <TableCell className={`${footClass} text-right`}>{fmt(stats.avgSqft)}</TableCell>
            <TableCell className={`${footClass} text-right`}>{fmt(stats.avgLotSize)}</TableCell>
            <TableCell className={`${footClass} text-right`}>${fmt(stats.avgPricePerSqft)}</TableCell>
            <TableCell className={`${footClass} text-right`} />
            <TableCell className={`${footClass} text-right`}>{fmtPrice(stats.avgPrice)}</TableCell>
            {isClosed && <TableCell className={`${footClass} text-right`}>{fmtPrice(stats.avgPrice)}</TableCell>}
            {isClosed && <TableCell className={`${footClass} text-right`}>${fmt(stats.avgPricePerSqft)}</TableCell>}
            {isClosed && <TableCell className={`${footClass} text-right`}>{fmtRatio(stats.avgSalePriceToListRatio)}</TableCell>}
            <TableCell className={`${footClass} text-right`}>{stats.avgDaysOnMarket}</TableCell>
            <TableCell className={footClass} />
          </TableRow>
          {/* Median row */}
          <TableRow>
            <TableCell className={footClass} colSpan={2}>Median</TableCell>
            <TableCell className={footClass} colSpan={6} />
            <TableCell className={`${footClass} text-right`}>{fmt(stats.medianSqft)}</TableCell>
            <TableCell className={footClass} />
            <TableCell className={footClass} />
            <TableCell className={footClass} />
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
