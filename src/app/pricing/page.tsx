import type { Metadata } from "next";
import PricingClient from "./PricingClient";
import { getDomainConfigFromHeaders } from "@/lib/domain-utils";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getDomainConfigFromHeaders();

  return {
    title: `Pricing | ${cfg.siteName}`,
    description:
      "Choose the right plan for your real estate business. From free to enterprise, ChatRealty has a plan for every agent.",
    openGraph: {
      title: `Pricing | ${cfg.siteName}`,
      description:
        "Choose the right plan for your real estate business. From free to enterprise, ChatRealty has a plan for every agent.",
      url: `${cfg.baseUrl}/pricing`,
    },
  };
}

export default function PricingPage() {
  return <PricingClient />;
}
