// Multi-tenant About page. The body (AboutClient) fetches the domain owner's
// public profile client-side; this server wrapper resolves the same owner for
// agent-specific SEO metadata.

import { headers } from "next/headers";
import type { Metadata } from "next";
import { resolveDomainOwner } from "@/lib/resolveDomainOwner";
import { getBaseUrlFromHeaders, getDomainConfigFromHeaders } from "@/lib/domain-utils";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AboutClient from "./AboutClient";

export async function generateMetadata(): Promise<Metadata> {
  // On the PLATFORM domain this page currently renders the primary agent's
  // bio (the owner-resolution fallback), which misrepresents ChatRealty and
  // duplicates the agent's own /about. Keep it out of search until the
  // platform has its own About content. Agent domains are unaffected.
  try {
    const cfg = await getDomainConfigFromHeaders();
    if (cfg.type === "platform") {
      return {
        title: { absolute: "About | ChatRealty" },
        description: "ChatRealty — AI-powered real estate sites for agents.",
        robots: { index: false, follow: true },
      };
    }
  } catch {
    /* fall through to the agent path */
  }

  try {
    const h = await headers();
    const host = h.get("host") || "localhost";
    const req = new Request(`http://${host}/`, { headers: h as unknown as HeadersInit });
    const { ownerId } = await resolveDomainOwner(req);
    if (ownerId) {
      await dbConnect();
      const u = await User.findById(ownerId)
        .select("name agentProfile.bio agentProfile.headline agentProfile.headshot agentProfile.brokerageName")
        .lean<{ name?: string; agentProfile?: { bio?: string; headline?: string; headshot?: string; brokerageName?: string } }>();
      const name = u?.name || "Your Agent";
      const ap = u?.agentProfile || {};
      const title = `About ${name}${ap.brokerageName ? ` | ${ap.brokerageName}` : ""}`;
      const description = (ap.bio || ap.headline || `Get to know ${name}, your local real estate agent.`).slice(0, 160);
      // Indexable since 2026-07-25: the page renders the owner's real
      // profile, and the old noindex contradicted robots.txt + the sitemap
      // (which both list /about) while hiding the E-E-A-T page from search.
      const canonicalBase = await getBaseUrlFromHeaders();
      return {
        // `absolute` skips the root titleTemplate — it appended the agent
        // name a second time ("About Joseph Sardella | Joseph Sardella").
        title: { absolute: title },
        description,
        alternates: { canonical: `${canonicalBase}/about` },
        openGraph: { title, description, images: ap.headshot ? [{ url: ap.headshot }] : [] },
        twitter: { card: "summary_large_image", title, description },
      };
    }
  } catch {
    /* fall through to default */
  }
  return { title: "About", description: "Get to know your local real estate agent." };
}

export default function AboutPage() {
  return <AboutClient />;
}
