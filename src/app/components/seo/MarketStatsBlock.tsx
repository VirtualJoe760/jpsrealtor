// Server-rendered market statistics for a city or subdivision page.
//
// SERVER-rendered is the whole point, so no "use client" here. The numbers that
// make a place page unique have to be in the initial HTML: the existing stats
// UI (components/cities/CityStats) is a client component that renders the
// server's four pre-aggregated numbers and then re-fetches, and the map's
// status line shipped "Showing 0 properties for sale in Indio" in the HTML
// because its listing array starts empty. Googlebot does render JS, but it
// renders it on a second pass that a low-authority page may wait weeks for —
// and a page whose crawled HTML says 0 has already made its claim.
//
// Styling follows CrawlableLinks: plain Tailwind with `dark:` variants rather
// than the `useThemeClasses()` hook, which only exists client-side.

import Link from "next/link";
import type { MarketStats } from "@/lib/market-stats";
import { describeMarket, formatPrice } from "@/lib/market-stats";

interface Props {
  stats: MarketStats;
  /** Display name — the city or subdivision as a reader would say it. */
  placeName: string;
  /** Linkable sold comps are nice but optional; subdivisions often lack slugs. */
  showRecentSales?: boolean;
}

function Trend({ pct }: { pct: number | null }) {
  // Below half a percent is noise in a median over a few hundred sales;
  // printing "+0.2%" implies a precision this data does not have.
  if (pct == null || Math.abs(pct) < 0.5) return null;
  const up = pct > 0;
  return (
    <span
      className={`ml-1.5 text-xs font-medium tabular-nums ${
        up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Tile({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: number | null;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-1 flex items-baseline text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
        {value}
        {trend !== undefined ? <Trend pct={trend ?? null} /> : null}
      </div>
      {hint ? (
        <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{hint}</div>
      ) : null}
    </div>
  );
}

function Bars({ title, buckets }: { title: string; buckets: { label: string; count: number }[] }) {
  if (!buckets.length) return null;
  const max = Math.max(...buckets.map((b) => b.count)) || 1;
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{title}</h3>
      <dl className="mt-3 space-y-2">
        {buckets.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <dt className="w-32 shrink-0 text-xs text-neutral-600 dark:text-neutral-400">
              {b.label}
            </dt>
            <dd className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className="h-2 rounded-full bg-neutral-300 dark:bg-neutral-700"
                style={{ width: `${Math.max(4, (b.count / max) * 100)}%` }}
              />
              <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {b.count}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function MarketStatsBlock({ stats, placeName, showRecentSales = true }: Props) {
  const sentences = describeMarket(stats, placeName);
  const hasAnything =
    stats.activeCount > 0 || stats.closedCount > 0 || sentences.length > 0;
  if (!hasAnything) return null;

  return (
    <section
      aria-labelledby="market-stats-heading"
      className="rounded-2xl border border-neutral-200 bg-white/60 p-6 md:p-8 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <h2
        id="market-stats-heading"
        className="text-2xl font-bold text-neutral-900 md:text-3xl dark:text-neutral-50"
      >
        {placeName} Housing Market
      </h2>

      {/* Prose BEFORE the tiles on purpose: the sentences are the part that
          reads as original writing, and they are assembled from the same
          numbers the tiles show, so they can never contradict them. */}
      {sentences.length > 0 ? (
        <div className="mt-3 space-y-2 text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
          {sentences.map((s) => (
            <p key={s}>{s}</p>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.medianClosePrice != null ? (
          <Tile
            label="Median sale price"
            value={formatPrice(stats.medianClosePrice)}
            hint={`${stats.closedCount.toLocaleString()} sales, last 12 months`}
            trend={stats.yoyMedianPricePercent}
          />
        ) : null}
        {stats.medianListPrice != null ? (
          <Tile
            label="Median list price"
            value={formatPrice(stats.medianListPrice)}
            hint={`${stats.activeCount.toLocaleString()} active listings`}
          />
        ) : null}
        {stats.medianClosePricePerSqFt != null ? (
          <Tile
            label="Price per sq ft"
            value={`$${Math.round(stats.medianClosePricePerSqFt)}`}
            hint="Median, closed sales"
          />
        ) : null}
        {stats.medianDaysOnMarket != null ? (
          <Tile
            label="Days on market"
            value={String(Math.round(stats.medianDaysOnMarket))}
            // Named explicitly because active listings in this MLS feed carry
            // no daysOnMarket value at all — see trap #2 in lib/market-stats.
            hint="Median, list to close"
          />
        ) : null}
        {stats.saleToListPercent != null ? (
          <Tile
            label="Sale to list"
            value={`${stats.saleToListPercent}%`}
            hint="Of asking price"
          />
        ) : null}
        {stats.monthsOfSupply != null ? (
          <Tile
            label="Months of supply"
            value={stats.monthsOfSupply.toFixed(1)}
            hint="6 months is balanced"
          />
        ) : null}
        {stats.newLast7Days > 0 ? (
          <Tile
            label="New this week"
            value={stats.newLast7Days.toLocaleString()}
            hint="Listed in the last 7 days"
          />
        ) : null}
        {stats.listPriceP10 != null && stats.listPriceP90 != null ? (
          <Tile
            label="Typical price range"
            value={`${formatPrice(stats.listPriceP10)} – ${formatPrice(stats.listPriceP90)}`}
            // 10th–90th percentile, NOT min–max. The old stats block printed
            // min–max and reported "$1k – $5.9M" for Indio, because the $1,300
            // floor was a rental and one bad row is all min–max needs.
            hint="10th–90th percentile of asking prices"
          />
        ) : null}
        {stats.priorMedianClosePrice != null && stats.yoySalesVolumePercent != null ? (
          <Tile
            label="Sales volume"
            value={stats.closedCount.toLocaleString()}
            hint={`vs ${stats.priorClosedCount.toLocaleString()} the year before`}
            trend={stats.yoySalesVolumePercent}
          />
        ) : null}
      </div>

      {stats.inventoryByType.length > 1 || stats.inventoryByPriceBand.length > 1 ? (
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          <Bars title="Inventory by price" buckets={stats.inventoryByPriceBand} />
          <Bars title="Inventory by property type" buckets={stats.inventoryByType} />
        </div>
      ) : null}

      {showRecentSales && stats.recentSales.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Recently sold in {placeName}
          </h3>
          <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">
            {stats.recentSales.map((sale) => (
              <li
                key={`${sale.address}-${sale.closeDate}`}
                className="flex items-baseline justify-between gap-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate text-neutral-700 dark:text-neutral-300">
                  {/* Linked only when the sold record kept its slug — a dead
                      /mls-listings/undefined link is worse than plain text. */}
                  {sale.slugAddress ? (
                    <Link
                      href={`/mls-listings/${sale.slugAddress}`}
                      className="hover:underline"
                    >
                      {sale.address}
                    </Link>
                  ) : (
                    sale.address
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-neutral-600 dark:text-neutral-400">
                  {formatPrice(sale.closePrice)}
                  <span className="ml-2 text-xs text-neutral-400 dark:text-neutral-500">
                    {new Date(sale.closeDate).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-6 text-xs text-neutral-400 dark:text-neutral-500">
        Market data derived from MLS records, updated{" "}
        {new Date(stats.computedAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        . Figures cover single-family and attached residential sales and exclude
        rentals and land.
      </p>
    </section>
  );
}
