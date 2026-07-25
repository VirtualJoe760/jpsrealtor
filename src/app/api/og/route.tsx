// GET /api/og?subdomain=josephsardella
// Dynamic OG image generation for agent homepages.
// White background, the TEXT wordmark (CHAT thin / REALTY medium, Jost,
// wide tracking — same as the site's Wordmark component) center-left,
// transparent headshot off-center right. Satori requires explicit font
// data, so the two Jost weights are fetched from public/fonts/.

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export const runtime = "nodejs";

function getBaseUrl(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

/** Load the two Jost weights Satori needs for the text wordmark. */
async function loadWordmarkFonts(baseUrl: string) {
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
    return undefined; // Satori falls back to its default face — still text
  }
}

/**
 * The text wordmark, mirroring src/app/components/brand/Wordmark.tsx:
 * CHAT thin (200) + REALTY medium (500), 0.3em tracking (Satori wants px).
 * Satori has no text-transform, so the glyphs are literal uppercase.
 */
function WordmarkRow({ fontSize, color }: { fontSize: number; color: string }) {
  const tracking = Math.round(fontSize * 0.3);
  return (
    // marginRight cancels the phantom tracking after the final glyph — same
    // correction the site's Wordmark component makes.
    <div style={{ display: "flex", fontFamily: "Jost", fontSize, letterSpacing: tracking, color, marginRight: -tracking }}>
      <span style={{ fontWeight: 200 }}>CHAT</span>
      <span style={{ fontWeight: 500 }}>REALTY</span>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get("subdomain");
  const baseUrl = getBaseUrl(request);
  const fonts = await loadWordmarkFonts(baseUrl);

  if (!subdomain) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
        <WordmarkRow fontSize={92} color="#16181d" />
        <div style={{ display: "flex", fontFamily: "Jost", fontWeight: 200, fontSize: 30, color: "#6b7280", marginTop: 28, letterSpacing: 3 }}>
          AI-Powered Real Estate
        </div>
      </div>,
      { width: 1200, height: 630, ...(fonts && { fonts }) }
    );
  }

  await dbConnect();
  const agent = await User.findOne({ "agentProfile.subdomain": subdomain })
    .select("name brokerageName licenseNumber agentProfile.headshotTransparent agentProfile.headshot agentProfile.brandColors")
    .lean();

  const ap = (agent as any)?.agentProfile;
  const name: string = (agent as any)?.name || "";
  const brokerage: string = (agent as any)?.brokerageName || "";
  const license: string = (agent as any)?.licenseNumber || "";
  const headshotUrl: string = ap?.headshotTransparent || ap?.headshot || "";
  const primaryColor: string = ap?.brandColors?.primary || "#1e3a5f";

  // Build text lines array — no JSX conditionals
  const lines: { text: string; size: number; color: string; bold: boolean }[] = [];
  if (name) lines.push({ text: name, size: 42, color: primaryColor, bold: true });
  if (brokerage) lines.push({ text: brokerage, size: 22, color: "#6b7280", bold: false });
  if (license) lines.push({ text: `DRE# ${license}`, size: 16, color: "#9ca3af", bold: false });
  if (lines.length === 0) lines.push({ text: "AI-Powered Real Estate", size: 28, color: "#6b7280", bold: false });

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "white" }}>
      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 60, paddingTop: 60, paddingBottom: 60, flex: 1 }}>
          <div style={{ display: "flex", marginBottom: 44 }}>
            <WordmarkRow fontSize={68} color="#16181d" />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {lines.map((line, i) => (
              <div key={i} style={{ fontSize: line.size, fontWeight: line.bold ? 700 : 400, color: line.color, marginBottom: 8 }}>
                {line.text}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", width: headshotUrl ? 480 : 60 }}>
          {headshotUrl ? <img src={headshotUrl} alt={name} height={580} /> : <div style={{ display: "flex" }} />}
        </div>
      </div>
      <div style={{ display: "flex", height: 6, width: "100%", backgroundColor: primaryColor }} />
    </div>,
    { width: 1200, height: 630, ...(fonts && { fonts }) }
  );
}
