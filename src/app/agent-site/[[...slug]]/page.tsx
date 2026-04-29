// src/app/agent-site/[[...slug]]/page.tsx
// Public-facing agent branded page — served via {subdomain}.chatrealty.io
// This route is rewritten to by middleware; it should NOT appear in site navigation.

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AgentSubscription from "@/models/AgentSubscription";
import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentData {
  name: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  brokerageName?: string;
  agentProfile?: {
    headshot?: string;
    heroPhoto?: string;
    headline?: string;
    tagline?: string;
    cellPhone?: string;
    officePhone?: string;
    brandColors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
    metaTitle?: string;
    metaDescription?: string;
  };
}

// ---------------------------------------------------------------------------
// Helper — resolve subdomain from header or hostname
// ---------------------------------------------------------------------------

async function getSubdomain(): Promise<string | null> {
  const hdrs = await headers();

  // Prefer the header set by middleware
  const fromHeader = hdrs.get("x-agent-subdomain");
  if (fromHeader) return fromHeader;

  // Fallback: extract from host
  const host = hdrs.get("host") || "";
  if (host.includes("chatrealty.io")) {
    const parts = host.split(".chatrealty.io")[0].split(".");
    const sub = parts[parts.length - 1];
    if (sub && sub !== "www" && sub !== "chatrealty" && !host.startsWith("chatrealty.io")) {
      return sub;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Dynamic metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const subdomain = await getSubdomain();
  if (!subdomain) return { title: "Agent Site" };

  await dbConnect();
  const agent = await User.findOne({ "agentProfile.subdomain": subdomain })
    .select("name agentProfile.metaTitle agentProfile.metaDescription agentProfile.headline")
    .lean<AgentData>();

  if (!agent) return { title: "Agent Site" };

  return {
    title: agent.agentProfile?.metaTitle || `${agent.name} | ChatRealty`,
    description:
      agent.agentProfile?.metaDescription ||
      agent.agentProfile?.headline ||
      `Real estate services by ${agent.name}`,
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function AgentSitePage() {
  const subdomain = await getSubdomain();
  if (!subdomain) notFound();

  await dbConnect();

  // Look up agent by subdomain
  const agent = await User.findOne({ "agentProfile.subdomain": subdomain })
    .select("_id name email phone licenseNumber brokerageName agentProfile")
    .lean<AgentData & { _id: string }>();

  if (!agent) notFound();

  // Check for active subscription
  const subscription = await AgentSubscription.findOne({
    agentId: agent._id,
    status: { $in: ["active", "trialing"] },
  }).lean();

  const hasActiveSubscription = !!subscription;
  const profile = agent.agentProfile;
  const primaryColor = profile?.brandColors?.primary || "#1e3a5f";
  const contactPhone = profile?.cellPhone || profile?.officePhone || agent.phone;

  // ----- Coming Soon (no subscription) ----- //
  if (!hasActiveSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-500">
            {agent.name?.charAt(0) || "?"}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
          {agent.brokerageName && (
            <p className="text-gray-500">{agent.brokerageName}</p>
          )}
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Coming Soon</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {agent.name}&apos;s real estate site is under construction. Check
              back soon for listings, market insights, and more.
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Powered by{" "}
            <a
              href="https://chatrealty.io"
              className="underline hover:text-gray-600"
            >
              ChatRealty
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ----- Active subscription — branded page ----- //
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section
        className="relative flex items-center justify-center text-white"
        style={{
          minHeight: "70vh",
          background: profile?.heroPhoto
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${profile.heroPhoto}) center/cover no-repeat`
            : primaryColor,
        }}
      >
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto space-y-6">
          {/* Headshot */}
          {profile?.headshot && (
            <img
              src={profile.headshot}
              alt={agent.name || "Agent headshot"}
              className="w-32 h-32 rounded-full mx-auto border-4 border-white/80 object-cover shadow-lg"
            />
          )}

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight drop-shadow-md">
            {agent.name}
          </h1>

          {agent.brokerageName && (
            <p className="text-lg opacity-90">{agent.brokerageName}</p>
          )}

          {agent.licenseNumber && (
            <p className="text-sm opacity-70">DRE #{agent.licenseNumber}</p>
          )}

          {profile?.headline && (
            <h2 className="text-2xl md:text-3xl font-light mt-2">
              {profile.headline}
            </h2>
          )}

          {profile?.tagline && (
            <p className="text-lg opacity-80 max-w-xl mx-auto">
              {profile.tagline}
            </p>
          )}

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {contactPhone && (
              <a
                href={`tel:${contactPhone.replace(/\D/g, "")}`}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-white font-semibold shadow-md hover:shadow-lg transition-shadow"
                style={{ color: primaryColor }}
              >
                <PhoneIcon />
                {contactPhone}
              </a>
            )}
            {agent.email && (
              <a
                href={`mailto:${agent.email}`}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full border-2 border-white/80 font-semibold hover:bg-white/10 transition-colors"
              >
                <EmailIcon />
                Email Me
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-400 border-t">
        <p>
          &copy; {new Date().getFullYear()} {agent.name}. All rights reserved.
        </p>
        <p className="mt-1">
          Powered by{" "}
          <a
            href="https://chatrealty.io"
            className="underline hover:text-gray-600"
          >
            ChatRealty
          </a>
        </p>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons (tiny, no external dependency)
// ---------------------------------------------------------------------------

function PhoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
