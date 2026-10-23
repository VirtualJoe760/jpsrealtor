// An honest statement of how an out-of-area market is actually served.
//
// The site publishes city pages for ~230 California markets. The agent's
// declared service areas are six Coachella Valley cities. Every one of those
// ~224 other pages was written in the same voice as the local ones — "your
// local expert in {City}", "specializes in {City}" — which is a claim about
// local expertise in places the agent does not work. That is a DRE advertising
// problem before it is an SEO one (B&P Code §10140 covers misleading
// representations), and it is also the exact signal that makes a statewide
// expansion read as programmatic rather than earned.
//
// This renders ONLY on pages outside the declared service areas, and it says
// the true thing: the licence is statewide, the local knowledge is not, and
// out-of-area clients are served through a referral network. A page that says
// so is more credible than one that pretends, and it answers the question a
// visitor in Fresno is actually asking.
//
// Server component: the disclosure has to be in the crawled HTML to count, and
// resolving the service areas needs a DB read.

import { headers } from "next/headers";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { resolveDomainOwner } from "@/lib/resolveDomainOwner";

interface Props {
  cityName: string;
  /** `cities.region`, e.g. "Inland Empire & Desert". */
  regionName?: string;
}

interface OwnerAreas {
  agentName?: string;
  serviceAreas: string[];
  /** The region the agent's own service areas sit in, for the contrast line. */
  homeRegion?: string;
}

async function getOwnerAreas(): Promise<OwnerAreas | null> {
  try {
    const h = await headers();
    const host = h.get("host") || "localhost";
    const req = new Request(`http://${host}/`, { headers: h as unknown as HeadersInit });
    const { ownerId } = await resolveDomainOwner(req);
    if (!ownerId) return null;

    await dbConnect();
    const owner = await User.findById(ownerId)
      .select("name agentProfile.serviceAreas")
      .lean<any>();
    if (!owner) return null;

    const areas: string[] = (owner.agentProfile?.serviceAreas || [])
      .map((a: any) => a?.name || a)
      .filter((n: unknown): n is string => typeof n === "string");

    return { agentName: owner.name, serviceAreas: areas };
  } catch {
    return null;
  }
}

export default async function ServiceAreaNote({ cityName, regionName }: Props) {
  const owner = await getOwnerAreas();

  // No declared service areas means no basis for deciding this page is
  // out-of-area, so say nothing rather than guess.
  if (!owner || owner.serviceAreas.length === 0) return null;

  const normalized = owner.serviceAreas.map((a) => a.toLowerCase());
  const isHomeMarket = normalized.includes(cityName.toLowerCase());
  if (isHomeMarket) return null;

  const firstName = owner.agentName?.split(" ")[0] || "your agent";
  const homeList = owner.serviceAreas.slice(0, 4).join(", ");

  return (
    <section
      aria-label={`How ${cityName} clients are served`}
      className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-5 text-sm leading-relaxed text-neutral-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-neutral-300"
    >
      <h2 className="mb-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        How {firstName} works with {cityName} buyers and sellers
      </h2>
      <p>
        {owner.agentName} is licensed throughout California, and the market data
        on this page is drawn from the same MLS records {firstName} uses every
        day. Day-to-day local expertise, though, is in {homeList}
        {regionName ? "" : " and the surrounding Coachella Valley"}. For a
        transaction in {cityName}
        {regionName ? ` or elsewhere in the ${regionName}` : ""}, {firstName}{" "}
        either works the deal directly or introduces you to a vetted agent who
        lives in that market — and tells you which, up front.
      </p>
    </section>
  );
}
