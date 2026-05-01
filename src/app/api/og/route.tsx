// GET /api/og?subdomain=josephsardella
// Dynamic OG image generation for agent homepages.
// White background, ChatRealty logo center-left, transparent headshot off-center right.
// Falls back to static chatrealty-logo-og.png if no agent or no headshot.

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

export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get("subdomain");
  const baseUrl = getBaseUrl(request);
  const logoUrl = `${baseUrl}/images/brand/chatrealty-logo-light-1436x356.png`;

  if (!subdomain) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
        <img src={`${baseUrl}/images/brand/chatrealty-logo-og.png`} alt="ChatRealty" width={800} height={420} />
      </div>,
      { width: 1200, height: 630 }
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
          <img src={logoUrl} alt="ChatRealty" width={800} height={200} style={{ marginBottom: 40 }} />
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
    { width: 1200, height: 630 }
  );
}
