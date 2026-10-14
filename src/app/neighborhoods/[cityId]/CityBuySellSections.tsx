"use client";

// The buy and sell forms, as SECTIONS of the city page.
//
// They used to be two standalone routes per city — /neighborhoods/{city}/buy
// and /{city}/sell — across ~230 cities, so ~460 URLs whose only
// city-specific content was the <title>, the meta description and one CTA
// heading. "Why Work With Joseph", the five-step journey and the agent bio were
// byte-identical on both pages and across every city. Google has a name for
// that pattern and it is not a good one; worse, those 460 near-duplicates were
// competing with the city page they were linked from for the same queries.
//
// Those routes now 301 here (see their page.tsx files and next.config.ts), so
// the forms keep working and the generic blocks are stated once, at /buy and
// /sell, instead of ~230 times each.
//
// The anchors matter: the redirect targets are #buy and #sell, so these ids are
// load-bearing. Renaming one turns an inbound link into a scroll to the top of
// a long page.

import Link from "next/link";
import { useAgentProfile } from "@/app/hooks/useAgentProfile";
import BuyIntakeCTA from "@/app/components/buy/BuyIntakeCTA";
import SellIntakeCTA from "@/app/components/sell/SellIntakeCTA";

export default function CityBuySellSections({
  cityName,
  cityId,
}: {
  cityName: string;
  cityId: string;
}) {
  const { agent } = useAgentProfile();

  return (
    <div className="space-y-16">
      <section id="buy" className="scroll-mt-24">
        <h2 className="mb-6 text-2xl font-bold text-neutral-900 md:text-3xl dark:text-neutral-50">
          Buying in {cityName}
        </h2>
        <BuyIntakeCTA agent={agent} cityName={cityName} cityId={cityId} />
        {/* The generic "why work with me" case lives at one URL now. Linking to
            it passes authority to a single page instead of splitting it across
            460 copies of the same four paragraphs. */}
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          New to the process?{" "}
          <Link href="/buy" className="underline hover:no-underline">
            See how buying works, step by step
          </Link>
          .
        </p>
      </section>

      <section id="sell" className="scroll-mt-24">
        <h2 className="mb-6 text-2xl font-bold text-neutral-900 md:text-3xl dark:text-neutral-50">
          Selling in {cityName}
        </h2>
        <SellIntakeCTA agent={agent} cityName={cityName} cityId={cityId} />
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          Thinking about listing?{" "}
          <Link href="/sell" className="underline hover:no-underline">
            See how selling works, step by step
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
