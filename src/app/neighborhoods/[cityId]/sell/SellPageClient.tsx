"use client";

import { useAgentProfile } from "@/app/hooks/useAgentProfile";
import dynamic from "next/dynamic";

const SellPageHero3D = dynamic(() => import("@/app/components/sell/SellPageHero3D"), {
  ssr: false,
  loading: () => <div className="h-[70vh] bg-black" />,
});
import MarketSnapshot from "@/app/components/buy/MarketSnapshot";
import AgentValueProps from "@/app/components/buy/AgentValueProps";
import SellingJourney from "@/app/components/sell/SellingJourney";
import SellIntakeCTA from "@/app/components/sell/SellIntakeCTA";

interface SellPageClientProps {
  cityId: string;
  cityName: string;
  countyName: string;
  population?: number;
  about?: string;
  description?: string;
}

export default function SellPageClient({
  cityId,
  cityName,
}: SellPageClientProps) {
  const { agent } = useAgentProfile();

  return (
    <div className="min-h-screen" data-page="sell">
      <SellPageHero3D cityName={cityName} cityId={cityId} agent={agent} />
      <div className="max-w-5xl mx-auto mt-16 space-y-16 px-4">
        <MarketSnapshot cityId={cityId} cityName={cityName} />
        <AgentValueProps agent={agent} />
        <SellingJourney brandColor={agent.brandColor} />
        <SellIntakeCTA agent={agent} cityName={cityName} cityId={cityId} />
      </div>
    </div>
  );
}
