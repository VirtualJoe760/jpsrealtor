// src/app/agent-site/[[...slug]]/page.tsx
// Public-facing agent branded page — served via {subdomain}.chatrealty.io
// This route is rewritten to by middleware; it should NOT appear in site navigation.

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AgentSubscription from "@/models/AgentSubscription";
import { verifyAdmin } from "@/lib/admin-auth";
import { getSiteReadiness } from "@/lib/agent-site-readiness";
import type { Metadata } from "next";
import AgentSiteClient from "./AgentSiteClient";

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
  const bareHost = host.split(":")[0];

  if (bareHost.includes("chatrealty.io")) {
    const parts = bareHost.split(".chatrealty.io")[0].split(".");
    const sub = parts[parts.length - 1];
    if (sub && sub !== "www" && sub !== "chatrealty" && !bareHost.startsWith("chatrealty.io")) {
      return sub;
    }
  }

  // Dev: "bethanyklier.localhost:3000" → "bethanyklier"
  if (bareHost.endsWith(".localhost")) {
    const sub = bareHost.split(".localhost")[0];
    if (sub && sub !== "www") return sub;
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

  const title = agent.agentProfile?.metaTitle || `${agent.name} | ChatRealty`;
  const description = agent.agentProfile?.metaDescription ||
    agent.agentProfile?.headline ||
    `Real estate services by ${agent.name}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/api/og?subdomain=${subdomain}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?subdomain=${subdomain}`],
    },
  };
}

// ---------------------------------------------------------------------------
// Page component (server) — fetches data, delegates rendering to client
// ---------------------------------------------------------------------------

export default async function AgentSitePage() {
  const subdomain = await getSubdomain();
  if (!subdomain) notFound();

  await dbConnect();

  const agent = await User.findOne({ "agentProfile.subdomain": subdomain })
    .select("_id name email phone licenseNumber brokerageName agentProfile")
    .lean<AgentData & { _id: string }>();

  if (!agent) notFound();

  const subscription = await AgentSubscription.findOne({
    agentId: agent._id,
    status: { $in: ["active", "trialing"] },
  }).lean();

  // Check if the current viewer is an admin or the agent themselves — bypass subscription gate
  const session = await (await import("next-auth")).getServerSession((await import("@/lib/auth")).authOptions);
  const viewerEmail = session?.user?.email;
  const viewerIsAdmin = !!(viewerEmail && (
    viewerEmail === "josephsardella@gmail.com" ||
    (session?.user as any)?.isAdmin ||
    (session?.user as any)?.impersonatedBy
  ));
  const viewerIsAgent = viewerEmail === agent.email;
  const isAdmin = viewerIsAdmin || viewerIsAgent;

  return (
    <AgentSiteClient
      agent={{
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        licenseNumber: agent.licenseNumber,
        brokerageName: agent.brokerageName,
      }}
      profile={agent.agentProfile ? {
        headshot: agent.agentProfile.headshot,
        heroPhoto: agent.agentProfile.heroPhoto,
        headline: agent.agentProfile.headline,
        tagline: agent.agentProfile.tagline,
        cellPhone: agent.agentProfile.cellPhone,
        officePhone: agent.agentProfile.officePhone,
        brandColors: agent.agentProfile.brandColors,
      } : undefined}
      hasActiveSubscription={
        // Site goes live once the agent completes setup (free tier — no paid
        // sub needed), or has an active subscription, or admin force-activated.
        getSiteReadiness(agent as any).complete ||
        !!subscription ||
        !!(agent.agentProfile as any)?.siteForceActive
      }
      isAdmin={isAdmin}
      agentEmail={agent.email}
    />
  );
}
