// GET /api/og/place?name=Indio&region=Coachella+Valley&count=486&median=515000
//
// Share card for a city or subdivision page.
//
// Why this route exists: every neighborhood page shared the SAME og:image
// (la-quinta.jpg, inherited from the neighborhoods layout) regardless of which
// city it described. Riverside shared a photo of La Quinta. A per-place card is
// the fix, and it has to be generated because there is no per-city photo to
// point at — `cities.photo` is empty for all 1,047 rows and the only per-city
// imagery on hand is MLS listing photography owned by other brokerages.
//
// Numbers are passed in rather than queried. The caller
// (generateMetadata → lib/market-stats) has already computed them, so querying
// again here would double the DB cost of every page render to produce an image
// that social crawlers fetch at most once.

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

function baseUrlOf(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

/** Same two Jost weights the agent card uses; Satori needs explicit font data. */
async function loadFonts(baseUrl: string) {
  try {
    const [w200, w500] = await Promise.all([
      fetch(`${baseUrl}/fonts/jost-latin-200-normal.woff`).then((r) => r.arrayBuffer()),
      fetch(`${baseUrl}/fonts/jost-latin-500-normal.woff`).then((r) => r.arrayBuffer()),
    ]);
    return [
      { name: "Jost", data: w200, weight: 200 as const, style: "normal" as const },
      { name: "Jost", data: w500, weight: 500 as const, style: "normal" as const },
    ];
  } catch {
    return undefined;
  }
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  // Cap the length so a pathological query string cannot push the layout
  // off-card. Satori does not reflow text the way a browser would.
  const name = (sp.get("name") || "California").slice(0, 48);
  const region = (sp.get("region") || "").slice(0, 48);
  const count = Number(sp.get("count"));
  const median = Number(sp.get("median"));

  const baseUrl = baseUrlOf(request);
  const fonts = await loadFonts(baseUrl);

  const facts: { label: string; value: string }[] = [];
  if (Number.isFinite(count) && count > 0) {
    facts.push({ label: "Homes for sale", value: count.toLocaleString() });
  }
  if (Number.isFinite(median) && median > 0) {
    facts.push({ label: "Median list price", value: formatPrice(median) });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0b0d12",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {region ? (
            <div
              style={{
                display: "flex",
                fontFamily: "Jost",
                fontWeight: 500,
                fontSize: 26,
                letterSpacing: 6,
                color: "#7dd3b0",
                marginBottom: 20,
              }}
            >
              {region.toUpperCase()}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontFamily: "Jost",
              fontWeight: 500,
              fontSize: name.length > 24 ? 76 : 104,
              color: "#f5f5f3",
              lineHeight: 1.05,
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Jost",
              fontWeight: 200,
              fontSize: 34,
              color: "#c9cdd2",
              marginTop: 14,
            }}
          >
            Homes for sale &amp; market data
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 56 }}>
            {facts.map((f) => (
              <div key={f.label} style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontFamily: "Jost",
                    fontWeight: 500,
                    fontSize: 52,
                    color: "#f5f5f3",
                  }}
                >
                  {f.value}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontFamily: "Jost",
                    fontWeight: 200,
                    fontSize: 22,
                    letterSpacing: 2,
                    color: "#9aa1a8",
                    marginTop: 6,
                  }}
                >
                  {f.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
          {/* The platform mark, not a brokerage logo: one deployment serves
              many agents, so a hardcoded agency here would stamp one brand
              onto every other agent's share cards. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${baseUrl}/images/brand/chatrealty-logo-light-1436x356.png`}
            alt="chatRealty"
            width={300}
            height={74}
            style={{ objectFit: "contain" }}
          />
        </div>
      </div>
    ),
    { width: 1200, height: 630, ...(fonts && { fonts }) },
  );
}
