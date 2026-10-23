"use client";

// The generic buyer-side case for working with this agent, stated ONCE.
//
// "Why Work With Joseph", the five-step buying journey and the agent bio used
// to render on /neighborhoods/{city}/buy for ~230 cities and, byte-identical,
// on /neighborhoods/{city}/sell as well. ~460 URLs carrying the same four
// blocks is a duplicate-content pattern, and it also split whatever authority
// those blocks earned across 460 copies instead of concentrating it on one
// page worth ranking for "work with a real estate agent in California".

import { useAgentProfile } from "@/app/hooks/useAgentProfile";
import AgentValueProps from "@/app/components/buy/AgentValueProps";
import BuyingJourney from "@/app/components/buy/BuyingJourney";
import BuyIntakeCTA from "@/app/components/buy/BuyIntakeCTA";

export default function BuyHubClient() {
  const { agent } = useAgentProfile();

  return (
    <div className="mx-auto max-w-5xl space-y-16 px-4 py-12">
      <header>
        <h1 className="text-3xl font-bold text-neutral-900 md:text-5xl dark:text-neutral-50">
          Buying a Home in California
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
          How the process works, what to expect at each stage, and how to get
          started — wherever in the state you are looking.
        </p>
      </header>

      <AgentValueProps agent={agent} />
      <BuyingJourney brandColor={agent.brandColor} />
      {/* No city to scope to here; the city-specific version of this form is a
          section of each city page. */}
      <BuyIntakeCTA agent={agent} cityName="" cityId="" />
    </div>
  );
}
