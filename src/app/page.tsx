// src/app/page.tsx
//
// Thin SERVER wrapper around the client homepage (HomeClient.tsx, the
// insights/chat/map ?view= page). It exists so the homepage can declare
// page-level metadata — a client component can't export generateMetadata.
//
// The canonical lives HERE, not in the root layout: a root-layout canonical
// is inherited by every page that doesn't set its own, which is exactly the
// bug that stamped the bare domain root onto ~1,924 listing pages. The
// homepage is the one page whose canonical IS the base URL (aliased to the
// primary host on supplementary domains).

import type { Metadata } from "next";
import { getDomainConfigFromHeaders } from "@/lib/domain-utils";
import HomeClient from "./HomeClient";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getDomainConfigFromHeaders();
  return {
    alternates: {
      canonical: cfg.baseUrl,
    },
  };
}

export default function Page() {
  return <HomeClient />;
}
