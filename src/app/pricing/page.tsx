import type { Metadata } from "next";
import PricingClient from "./PricingClient";
import { getDomainConfigFromHeaders } from "@/lib/domain-utils";

// ChatRealty's agent pricing — a PLATFORM page. It renders on tenant
// domains too (one deployment), but it is not the agent's content: a
// homebuyer on jpsrealtor.com should never find ChatRealty's plans there,
// and two hosts serving it would compete. So: indexable on the platform
// only, always canonicalized to the platform URL.
const PLATFORM_URL = "https://www.chatrealty.io";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getDomainConfigFromHeaders();
  const isPlatform = cfg.type === "platform";
  const title = "Pricing | ChatRealty";
  const description =
    "Choose the right plan for your real estate business. From free to enterprise, ChatRealty has a plan for every agent.";

  return {
    // `absolute` skips the root titleTemplate, which otherwise appended the
    // site name a second time ("Pricing | ChatRealty | ChatRealty").
    title: { absolute: title },
    description,
    ...(!isPlatform && { robots: { index: false, follow: true } }),
    alternates: { canonical: `${PLATFORM_URL}/pricing` },
    openGraph: { title, description, url: `${PLATFORM_URL}/pricing` },
  };
}

export default function PricingPage() {
  return <PricingClient />;
}
