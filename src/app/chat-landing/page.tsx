// Server wrapper for the PLATFORM homepage.
//
// chatrealty.io/ rewrites here (proxy.ts §5), so this page IS the platform
// homepage even though the URL the visitor sees is "/". It needs its own
// canonical: the root layout deliberately no longer sets one (a layout
// canonical is inherited by every page and stamped the bare domain onto ~1,924
// listing pages), and the client component below can't export metadata — so
// removing the layout canonical left the platform homepage with none at all.
// Caught by scripts/smoke-domains.mjs.

import type { Metadata } from "next";
import { getDomainConfigFromHeaders } from "@/lib/domain-utils";
import ChatLandingClient from "./ChatLandingClient";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getDomainConfigFromHeaders();
  // The visitor's URL is "/", not "/chat-landing" — canonicalize to the root.
  return { alternates: { canonical: cfg.baseUrl } };
}

export default function Page() {
  return <ChatLandingClient />;
}
