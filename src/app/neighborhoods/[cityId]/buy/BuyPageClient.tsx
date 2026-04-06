"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useAgentProfile } from "@/app/hooks/useAgentProfile";
import dynamic from "next/dynamic";

const BuyPageHero3D = dynamic(() => import("@/app/components/buy/BuyPageHero3D"), {
  ssr: false,
  loading: () => <div className="h-[70vh] bg-black" />,
});
import MarketSnapshot from "@/app/components/buy/MarketSnapshot";
import FeaturedListings from "@/app/components/buy/FeaturedListings";
import AgentValueProps from "@/app/components/buy/AgentValueProps";
import BuyingJourney from "@/app/components/buy/BuyingJourney";
import ContactCTA from "@/app/components/buy/ContactCTA";

interface BuyPageClientProps {
  cityId: string;
  cityName: string;
  countyName: string;
  population?: number;
  about?: string;
  description?: string;
}

export default function BuyPageClient({
  cityId,
  cityName,
  countyName,
  population,
  about,
  description,
}: BuyPageClientProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const { agent } = useAgentProfile();

  return (
    <div className="min-h-screen" data-page="buy">
      <BuyPageHero3D cityName={cityName} cityId={cityId} agent={agent} />
      <div className="max-w-5xl mx-auto mt-16 space-y-16">
        <MarketSnapshot cityId={cityId} cityName={cityName} />
        <FeaturedListings cityId={cityId} cityName={cityName} />
        <AgentValueProps agent={agent} />
        <BuyingJourney brandColor={agent.brandColor} />
        <ContactCTA agent={agent} cityName={cityName} />
      </div>
    </div>
  );
}
