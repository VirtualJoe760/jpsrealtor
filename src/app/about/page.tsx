// Multi-tenant About page. The body (AboutClient) fetches the domain owner's
// public profile client-side; this server wrapper resolves the same owner for
// agent-specific SEO metadata.

import { headers } from "next/headers";
import type { Metadata } from "next";
import { resolveDomainOwner } from "@/lib/resolveDomainOwner";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AboutClient from "./AboutClient";

export async function generateMetadata(): Promise<Metadata> {
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
      return {
        title,
        description,
        // Kept out of search engines while the About page is still being built.
        robots: { index: false, follow: false },
        openGraph: { title, description, images: ap.headshot ? [{ url: ap.headshot }] : [] },
        twitter: { card: "summary_large_image", title, description },
      };
    }
  } catch {
    /* fall through to default */
  }
  return { title: "About", description: "Get to know your local real estate agent.", robots: { index: false, follow: false } };
}

export default function AboutPage() {
  return <AboutClient />;
}
