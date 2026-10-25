/**
 * The CMA document, as HTML that Puppeteer prints to a landscape Letter PDF.
 *
 * Laid out from `Joseph_Sardella_Rental_CMA_Banner_Margins_Jost.pdf`: five
 * pages at 792x612pt — cover, summary, active table, closed table, disclaimer
 * — with a branded header and a "JPSREALTOR.COM / page N" footer on each.
 *
 * ── Differences from the source template, and why ───────────────────────────
 *
 * The template is a RESIDENTIAL LEASE analysis. This is a SALE analysis,
 * because the heat-map tiles it is generated from are propertyType 'A'. The
 * structure is unchanged; the lease-specific columns become their sale
 * equivalents (Leased Price -> Sold Price, SP/LP keeps its meaning).
 *
 * No agent columns, by request — and the source template has none either.
 *
 * ── Honesty rules carried into the document ─────────────────────────────────
 *
 * A CMA is handed to clients, so a number that quietly misleads is worse here
 * than anywhere else in the app:
 *
 *   - A blank cell stays blank. The source template says "Blank cells reflect
 *     blank fields in the source" and retains a lot size of 0.14 exactly as
 *     reported; this does the same rather than inferring or dropping rows.
 *   - Every statistic prints the count it came from. A median over two comps
 *     is labelled as such instead of looking like a market.
 *   - A shared (association/community) pool is never printed as a pool.
 *   - A partial year says so on the page, not just in the UI.
 */

import type { CmaData, Comp, ColStats, CompStats } from './collect'

export interface CmaBranding {
  agentName: string
  brokerage: string | null
  dreNumber: string | null
  site: string
}

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

/** Blank stays blank — never "0" or "N/A", which read as data. */
const txt = (v: unknown): string => (v == null || v === '' ? '' : esc(v))

const usd = (n: number | null | undefined, dp = 0): string =>
  n == null ? '' : `$${n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`

const num = (n: number | null | undefined, dp = 0): string =>
  n == null ? '' : n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })

const date = (iso: string | null): string =>
  !iso ? '' : new Date(iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })

/**
 * Street line only.
 *
 * `unparsedAddress` is the full "45727 Toro Peak Road, Palm Desert, CA 92260",
 * and the table already has its own City column — printing both wastes the
 * widest column in a 17-column landscape table on a repeated value. Anything
 * before the first comma is the street; if there is no comma the value is
 * passed through untouched rather than guessed at.
 */
function street(addr: string | null): string {
  if (!addr) return ''
  const i = addr.indexOf(',')
  return esc(i > 0 ? addr.slice(0, i).trim() : addr)
}

/** "Yes/ No" in the template's own style; a shared pool is not a pool. */
function poolSpa(c: Comp): string {
  const p = c.pool == null ? '' : c.pool && !c.poolShared ? 'Yes' : 'No'
  const s = c.spa == null ? '' : c.spa ? 'Yes' : 'No'
  if (!p && !s) return ''
  return `${p || '—'}/ ${s || '—'}`
}

/** The four summary rows under a table, in the template's order. */
function statRows(stats: CompStats, cols: Array<{ key: keyof CompStats; fmt: (n: number | null) => string }>) {
  const rows: Array<[string, (s: ColStats) => number | null]> = [
    ['Average', (s) => s.average],
    ['Min', (s) => s.min],
    ['Max', (s) => s.max],
    ['Median', (s) => s.median],
  ]
  return rows
    .map(
      ([label, pick]) => `<tr class="sum">
        <td class="lbl">${label}</td>
        <td colspan="5"></td>
        ${cols.map((c) => `<td class="n">${c.fmt(pick(stats[c.key]))}</td>`).join('')}
      </tr>`,
    )
    .join('')
}

function page(brand: CmaBranding, n: number, total: number, body: string, subtitle: string): string {
  return `<section class="page">
    <header class="hdr">
      <div class="who">
        <div class="nm">${esc(brand.agentName).toUpperCase()}</div>
        <div class="sub">RESIDENTIAL REAL ESTATE AGENT${brand.dreNumber ? ` | DRE# ${esc(brand.dreNumber)}` : ''}</div>
      </div>
    </header>
    ${body}
    <footer class="ftr">
      <span>${esc(subtitle)}</span>
      <span>${esc(brand.site)} &middot; ${n} of ${total}</span>
    </footer>
  </section>`
}

export function renderCma(data: CmaData, brand: CmaBranding): string {
  const { active, closed, activeStats, closedStats, bbox, year, cities } = data
  const place = cities.length ? cities.join(' / ') : 'Selected area'
  const asOf = new Date().toLocaleString('en-US', {
    month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit',
  })
  const subtitle = `Residential Sale CMA | Listings as of ${asOf}`
  const partial = year === 2026
  const TOTAL_PAGES = 5

  // Cover ------------------------------------------------------------------
  const cover = `<section class="page cover">
    <div class="cov-body">
      <h1>MARKET ANALYSIS</h1>
      <h2>${esc(place.toUpperCase())} / RESIDENTIAL SALE COMPARABLES</h2>
      <div class="cov-stats">
        <div><span class="k">ACTIVE</span><span class="v">${usd(activeStats.listPrice.median)}</span></div>
        <div><span class="k">CLOSED</span><span class="v">${usd(closedStats.closePrice.median)}</span></div>
        <div><span class="k">COMPARABLES</span><span class="v">${active.length + closed.length}</span></div>
      </div>
    </div>
    <footer class="ftr cov-ftr">
      <span>${esc(brand.agentName)}${brand.brokerage ? ` | ${esc(brand.brokerage)}` : ''}${brand.dreNumber ? ` | DRE# ${esc(brand.dreNumber)}` : ''}</span>
      <span>${esc(brand.site)} &middot; ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
    </footer>
  </section>`

  // Summary ----------------------------------------------------------------
  const rect = [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat].map((v) => v.toFixed(6)).join(', ')
  const summary = page(brand, 1, TOTAL_PAGES, `
    <h1 class="t">MARKET ANALYSIS</h1>
    <h2 class="s">${esc(place.toUpperCase())} / RESIDENTIAL SALE COMPARABLES</h2>
    <div class="tiles">
      <div><span class="k">ACTIVE LISTINGS</span><span class="v">${active.length}</span></div>
      <div><span class="k">CLOSED LISTINGS</span><span class="v">${closed.length}</span></div>
      <div><span class="k">TOTAL COMPARABLES</span><span class="v">${active.length + closed.length}</span></div>
      <div><span class="k">MEDIAN SOLD PRICE</span><span class="v">${usd(closedStats.closePrice.median) || '—'}</span></div>
    </div>

    <h3>Market snapshot</h3>
    <p>Closed comparables: ${num(closedStats.sqft.median)} SqFt median | ${usd(closedStats.spPerSqft.median, 2)} / SqFt median |
       ${num(closedStats.dim.median)} DIM median | Median list price ${usd(closedStats.listPrice.median)} |
       Median sold price ${usd(closedStats.closePrice.median)}${closedStats.spToLp.median != null ? ` | Median sale-to-list ${(closedStats.spToLp.median * 100).toFixed(1)}%` : ''}.
       Each statistic is drawn from the comparables listed on the following pages.</p>

    <h3>Search criteria and scope</h3>
    <p>Property type Residential Sale (type A). Inside the map search Rectangle
       (${esc(rect)}). Status of Active and Closed.
       ${year !== null ? `Closed date within ${year}.` : 'All available closed dates.'}
       ${data.truncated ? ' Result set was truncated at the per-status limit.' : ''}</p>

    <h3>Data integrity note</h3>
    <p>All ${active.length + closed.length} comparable listings are reproduced on the following pages. Values, blanks and
       unusual lot-size entries are retained exactly as provided by the source. Days in market is derived from the
       on-market and close dates because the source days-on-market field is not populated. Lot size is the source
       <em>lot size area</em> value and its unit is reproduced as reported. A pool shown as &ldquo;No&rdquo; may still
       have association or community pool access, which is not a private pool. No independent property valuation or
       recommended price is inferred.${partial ? ' The 2026 period covers 11 of 12 months and is not comparable to a full year without prorating.' : ''}</p>
    <p class="by">Prepared by ${esc(brand.agentName)}${brand.brokerage ? ` &middot; ${esc(brand.brokerage)}` : ''}${brand.dreNumber ? ` &middot; DRE# ${esc(brand.dreNumber)}` : ''}</p>
  `, subtitle)

  // Active table -----------------------------------------------------------
  const activeCols = [
    { key: 'beds' as const, fmt: (n: number | null) => num(n) },
    { key: 'baths' as const, fmt: (n: number | null) => num(n) },
    { key: 'sqft' as const, fmt: (n: number | null) => num(n) },
    { key: 'lotSize' as const, fmt: (n: number | null) => num(n) },
    { key: 'lpPerSqft' as const, fmt: (n: number | null) => usd(n, 2) },
    { key: 'originalListPrice' as const, fmt: (n: number | null) => usd(n) },
    { key: 'listPrice' as const, fmt: (n: number | null) => usd(n) },
    { key: 'dim' as const, fmt: (n: number | null) => num(n) },
  ]
  const activePage = page(brand, 2, TOTAL_PAGES, `
    <h1 class="t">ACTIVE SALE COMPARABLES</h1>
    <h2 class="s">${active.length} active listing${active.length === 1 ? '' : 's'} &middot; ${esc(place)}</h2>
    ${active.length === 0 ? '<p class="empty">No active listings inside this tile.</p>' : `
    <table>
      <thead><tr>
        <th>Listing #</th><th>Address</th><th>City</th><th>Year</th><th>Pool/Spa</th><th>On Market</th>
        <th class="n">Beds</th><th class="n">Baths</th><th class="n">Apx SqFt</th><th class="n">Lot Size</th>
        <th class="n">LP/SqFt</th><th class="n">Orig List</th><th class="n">List Price</th><th class="n">DIM</th>
      </tr></thead>
      <tbody>
        ${active.map((c) => `<tr>
          <td>${txt(c.mlsNumber)}</td><td>${street(c.address)}</td><td>${txt(c.city)}</td>
          <td>${txt(c.yearBuilt)}</td><td>${poolSpa(c)}</td><td>${date(c.statusDate)}</td>
          <td class="n">${num(c.beds)}</td><td class="n">${num(c.baths)}</td><td class="n">${num(c.sqft)}</td>
          <td class="n">${num(c.lotSize)}</td><td class="n">${usd(c.lpPerSqft, 2)}</td>
          <td class="n">${usd(c.originalListPrice)}</td><td class="n">${usd(c.listPrice)}</td><td class="n">${num(c.dim)}</td>
        </tr>`).join('')}
        ${statRows(activeStats, activeCols)}
      </tbody>
    </table>
    <p class="note">Summary rows are computed from the ${active.length} listing${active.length === 1 ? '' : 's'} above.
       DIM = days in market, derived from the on-market date.</p>`}
  `, subtitle)

  // Closed table -----------------------------------------------------------
  const closedCols = [
    { key: 'beds' as const, fmt: (n: number | null) => num(n) },
    { key: 'baths' as const, fmt: (n: number | null) => num(n) },
    { key: 'sqft' as const, fmt: (n: number | null) => num(n) },
    { key: 'lotSize' as const, fmt: (n: number | null) => num(n) },
    { key: 'lpPerSqft' as const, fmt: (n: number | null) => usd(n, 2) },
    { key: 'originalListPrice' as const, fmt: (n: number | null) => usd(n) },
    { key: 'listPrice' as const, fmt: (n: number | null) => usd(n) },
    { key: 'closePrice' as const, fmt: (n: number | null) => usd(n) },
    { key: 'spPerSqft' as const, fmt: (n: number | null) => usd(n, 2) },
    { key: 'spToLp' as const, fmt: (n: number | null) => (n == null ? '' : n.toFixed(2)) },
    { key: 'dim' as const, fmt: (n: number | null) => num(n) },
  ]
  const closedPage = page(brand, 3, TOTAL_PAGES, `
    <h1 class="t">CLOSED SALE COMPARABLES</h1>
    <h2 class="s">${closed.length} closed listing${closed.length === 1 ? '' : 's'} &middot; ${esc(place)}</h2>
    ${closed.length === 0 ? '<p class="empty">No closed sales inside this tile for the selected period.</p>' : `
    <table class="tight">
      <thead><tr>
        <th>Listing #</th><th>Address</th><th>City</th><th>Year</th><th>Pool/Spa</th><th>Sold Date</th>
        <th class="n">Beds</th><th class="n">Baths</th><th class="n">Apx SqFt</th><th class="n">Lot Size</th>
        <th class="n">LP/SqFt</th><th class="n">Orig List</th><th class="n">List Price</th>
        <th class="n">Sold Price</th><th class="n">SP/SqFt</th><th class="n">SP/LP</th><th class="n">DIM</th>
      </tr></thead>
      <tbody>
        ${closed.map((c) => `<tr>
          <td>${txt(c.mlsNumber)}</td><td>${street(c.address)}</td><td>${txt(c.city)}</td>
          <td>${txt(c.yearBuilt)}</td><td>${poolSpa(c)}</td><td>${date(c.statusDate)}</td>
          <td class="n">${num(c.beds)}</td><td class="n">${num(c.baths)}</td><td class="n">${num(c.sqft)}</td>
          <td class="n">${num(c.lotSize)}</td><td class="n">${usd(c.lpPerSqft, 2)}</td>
          <td class="n">${usd(c.originalListPrice)}</td><td class="n">${usd(c.listPrice)}</td>
          <td class="n">${usd(c.closePrice)}</td><td class="n">${usd(c.spPerSqft, 2)}</td>
          <td class="n">${c.spToLp == null ? '' : c.spToLp.toFixed(2)}</td><td class="n">${num(c.dim)}</td>
        </tr>`).join('')}
        ${statRows(closedStats, closedCols)}
      </tbody>
    </table>
    <p class="note">Blank cells reflect blank fields in the source and are retained as reported. Summary rows are computed
       from the ${closed.length} listing${closed.length === 1 ? '' : 's'} above
       (${closedStats.closePrice.n} with a sold price${closedStats.dim.n !== closed.length ? `, ${closedStats.dim.n} with a derivable DIM` : ''}).</p>`}
  `, subtitle)

  // Disclaimer -------------------------------------------------------------
  const disclaimer = page(brand, 4, TOTAL_PAGES, `
    <div class="disc">
      <p>Price statistics for closed listings are based on sold price. Active listings are based on current list price.</p>
      <p>Information is deemed to be reliable, but is not guaranteed. &copy; ${new Date().getFullYear()} MLS and FBS.
         Prepared by ${esc(brand.agentName)} on ${new Date().toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}.${brand.dreNumber ? ` DRE#: ${esc(brand.dreNumber)}` : ''}</p>
      <p>This analysis is generated from a map tile selection and reproduces the comparables it used. It is not an
         appraisal and does not state a recommended price.</p>
    </div>
  `, subtitle)

  return `<!doctype html><html><head><meta charset="utf-8">
  <title>Residential Sale CMA</title>
  <style>
    @page { size: 11in 8.5in; margin: 0; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: 'Jost', 'Helvetica Neue', Arial, sans-serif; color:#15171a; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .page { width:11in; height:8.5in; padding:0.45in 0.55in 0.4in; position:relative; page-break-after:always; overflow:hidden; }
    .page:last-child { page-break-after:auto; }

    .hdr { border-bottom:1.5px solid #15171a; padding-bottom:6px; margin-bottom:14px; }
    .hdr .nm { font-size:15px; font-weight:700; letter-spacing:.14em; }
    .hdr .sub { font-size:8px; letter-spacing:.1em; color:#5b6066; margin-top:2px; }

    .ftr { position:absolute; left:0.55in; right:0.55in; bottom:0.3in; display:flex; justify-content:space-between;
           font-size:8px; color:#5b6066; border-top:.5px solid #c9ced4; padding-top:5px; }

    h1.t { font-size:19px; letter-spacing:.1em; margin:0 0 2px; font-weight:700; }
    h2.s { font-size:10px; letter-spacing:.08em; color:#5b6066; margin:0 0 14px; font-weight:400; }
    h3 { font-size:10px; letter-spacing:.06em; margin:12px 0 3px; font-weight:700; }
    p  { font-size:8.5px; line-height:1.45; margin:0 0 6px; color:#2d3238; }
    p.by { margin-top:10px; font-size:8px; color:#5b6066; }
    p.note { margin-top:7px; font-size:7.5px; color:#5b6066; }
    p.empty { font-size:10px; color:#5b6066; margin-top:30px; }

    .tiles { display:flex; gap:26px; margin:4px 0 6px; }
    .tiles div { display:flex; flex-direction:column; }
    .tiles .k { font-size:7.5px; letter-spacing:.09em; color:#5b6066; }
    .tiles .v { font-size:20px; font-weight:700; margin-top:1px; }

    table { width:100%; border-collapse:collapse; margin-top:4px; }
    th { font-size:6.8px; letter-spacing:.04em; text-align:left; color:#3c4147; font-weight:700;
         border-bottom:1px solid #15171a; padding:3px 3px 4px; }
    td { font-size:7.4px; padding:3px; border-bottom:.5px solid #e4e7ea; }
    table.tight td, table.tight th { font-size:6.9px; padding:2.5px; }
    td.n, th.n { text-align:right; }
    tr.sum td { border-top:1px solid #15171a; border-bottom:none; font-weight:700; background:#f4f6f8; }
    tr.sum .lbl { text-align:right; letter-spacing:.05em; }

    .cover { display:flex; flex-direction:column; justify-content:center; background:#15171a; color:#fff; }
    .cover h1 { font-size:40px; letter-spacing:.1em; margin:0 0 6px; font-weight:700; }
    .cover h2 { font-size:12px; letter-spacing:.14em; color:#aab1b8; margin:0 0 48px; font-weight:400; }
    .cov-stats { display:flex; gap:64px; }
    .cov-stats .k { display:block; font-size:8px; letter-spacing:.14em; color:#aab1b8; }
    .cov-stats .v { display:block; font-size:30px; font-weight:700; margin-top:4px; }
    .cov-ftr { color:#aab1b8; border-top:.5px solid #3a3f45; }

    .disc { margin-top:40px; max-width:7.4in; }
    .disc p { font-size:8.5px; color:#3c4147; margin-bottom:10px; }
  </style></head><body>
  ${cover}${summary}${activePage}${closedPage}${disclaimer}
  </body></html>`
}
