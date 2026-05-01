// GET /api/og?subdomain=josephsardella
// Dynamic OG image generation for agent homepages.
// White background, ChatRealty logo center-left, transparent headshot off-center right.
// Falls back to static chatrealty-logo-og.png if no agent or no headshot.

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get("subdomain");

  // No subdomain — return platform default OG
  if (!subdomain) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${getBaseUrl(request)}/images/brand/chatrealty-logo-og.png`}
            alt="ChatRealty"
            width={800}
            height={420}
            style={{ objectFit: "contain" }}
          />
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // Fetch agent data
  await dbConnect();
  const agent = await User.findOne({ "agentProfile.subdomain": subdomain })
    .select("name brokerageName licenseNumber agentProfile.headshotTransparent agentProfile.headshot agentProfile.brandColors")
    .lean<{
      name?: string;
      brokerageName?: string;
      licenseNumber?: string;
      agentProfile?: {
        headshotTransparent?: string;
        headshot?: string;
        brandColors?: { primary?: string };
      };
    }>();

  const ap = agent?.agentProfile;
  const headshotUrl = ap?.headshotTransparent || ap?.headshot;
  const primaryColor = ap?.brandColors?.primary || "#1e3a5f";
  const baseUrl = getBaseUrl(request);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "white",
          position: "relative",
        }}
      >
        {/* Left section — logo + agent info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px",
            flex: 1,
          }}
        >
          {/* ChatRealty Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${baseUrl}/images/brand/chatrealty-logo-light-1436x356.png`}
            alt="ChatRealty"
            width={280}
            height={70}
            style={{ objectFit: "contain", marginBottom: 40 }}
          />

          {/* Agent Name */}
          {agent?.name && (
            <div
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: primaryColor,
                marginBottom: 8,
              }}
            >
              {agent.name}
            </div>
          )}

          {/* Brokerage */}
          {agent?.brokerageName && (
            <div
              style={{
                fontSize: 22,
                color: "#6b7280",
                marginBottom: 6,
              }}
            >
              {agent.brokerageName}
            </div>
          )}

          {/* License */}
          {agent?.licenseNumber && (
            <div
              style={{
                fontSize: 16,
                color: "#9ca3af",
              }}
            >
              DRE# {agent.licenseNumber}
            </div>
          )}
        </div>

        {/* Right section — headshot */}
        {headshotUrl && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              width: 480,
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={headshotUrl}
              alt={agent?.name || "Agent"}
              style={{
                height: "100%",
                maxWidth: 480,
                objectFit: "contain",
                objectPosition: "bottom right",
              }}
            />
          </div>
        )}

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: `linear-gradient(to right, ${primaryColor}, #3b82f6)`,
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function getBaseUrl(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}
