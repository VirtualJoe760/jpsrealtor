"use client";

// The generic seller-side case, stated ONCE. See the note in ../buy/BuyHubClient.

import { useAgentProfile } from "@/app/hooks/useAgentProfile";
import AgentValueProps from "@/app/components/buy/AgentValueProps";
import SellingJourney from "@/app/components/sell/SellingJourney";
import SellIntakeCTA from "@/app/components/sell/SellIntakeCTA";

export default function SellHubClient() {
  const { agent } = useAgentProfile();

  return (
    <div className="mx-auto max-w-5xl space-y-16 px-4 py-12">
      <header>
        <h1 className="text-3xl font-bold text-neutral-900 md:text-5xl dark:text-neutral-50">
          Selling a Home in California
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
          Pricing, preparation, marketing and negotiation — what actually moves
          a sale, and what it costs.
        </p>
      </header>

      <AgentValueProps agent={agent} />
      <SellingJourney brandColor={agent.brandColor} />
      <SellIntakeCTA agent={agent} cityName="" cityId="" />
    </div>
  );
}
