// NOT RENDERED since 2026-10-17 — Joseph asked for the footer to be hidden on
// every page; layout.tsx no longer mounts it and Privacy / Terms moved to the
// sidebar (components/LegalLinks). Kept because the identity resolution below
// is the server-rendered source of the agent's DRE# and broker; on agent sites
// the sidebar's agency line shows them, but client-rendered. Restore by
// mounting <SiteFooter /> after {children} in app/layout.tsx.
//
// The global footer: brokerage identity, licence numbers and legal links, on
// EVERY page.
//
// What it replaces: components/Footer.tsx rendered two links (Privacy, Terms)
// and began with `if (pathname !== '/') return null` — so ~100,000 pages had no
// footer at all, and no page anywhere named the brokerage or a DRE number.
// California DRE advertising rules require the responsible broker to be
// identified in advertising, and a public real-estate website is advertising.
// It is also an ordinary trust signal: a site that never says who is
// responsible for it reads as unaffiliated, which is the opposite of what an
// E-E-A-T assessment is looking for.
//
// A SERVER component, for two reasons. The identity has to be in the crawled
// HTML to count as a signal at all, and resolving it needs a DB read that
// should not become a client fetch on every page.
//
// NOTHING IS HARDCODED. One deployment serves many agents' domains (see
// docs/ARCHITECTURE.md, "No component hardcodes a brokerage"): a literal
// "Fathom Realty" here would stamp Joey's broker onto every other agent's
// site. Everything comes from the resolved domain owner, and a field that is
// missing renders nothing rather than a placeholder.

import Link from "next/link";
import { headers } from "next/headers";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { resolveDomainOwner } from "@/lib/resolveDomainOwner";

interface FooterIdentity {
  agentName?: string;
  licenseNumber?: string;
  brokerageName?: string;
  brokerageLegalName?: string;
  brokerageLicense?: string;
  phone?: string;
}

async function getFooterIdentity(): Promise<FooterIdentity> {
  try {
    const h = await headers();
    const host = h.get("host") || "localhost";
    // resolveDomainOwner takes a Request; build a minimal one from the incoming
    // headers, the same way getServerTenantConfig() in lib/nav-layout does.
    const req = new Request(`http://${host}/`, { headers: h as unknown as HeadersInit });
    const { ownerId } = await resolveDomainOwner(req);
    if (!ownerId) return {};

    await dbConnect();
    const owner = await User.findById(ownerId)
      .select(
        "name phone licenseNumber brokerageName " +
          "agentProfile.licenseNumber agentProfile.brokerageName " +
          "agentProfile.brokerage agentProfile.cellPhone agentProfile.officePhone",
      )
      .lean<any>();
    if (!owner) return {};

    const ap = owner.agentProfile || {};
    const brk = ap.brokerage || {};
    // Newest brokerage model first; the legacy pair is the migration fallback
    // for agents not yet moved onto agentProfile.brokerage.
    const brokerageName = brk.name || ap.brokerageName || owner.brokerageName;

    return {
      agentName: owner.name,
      licenseNumber: ap.licenseNumber || owner.licenseNumber,
      brokerageName,
      brokerageLegalName: brk.legalName || brokerageName,
      brokerageLicense: brk.licenseNumber,
      phone: ap.cellPhone || ap.officePhone || owner.phone,
    };
  } catch {
    // The footer is not worth a 500. An unresolved owner renders the legal
    // links alone, which is what the old footer did on its best day.
    return {};
  }
}

export default async function SiteFooter() {
  const id = await getFooterIdentity();

  const identityLine = [
    id.agentName,
    id.licenseNumber ? `DRE# ${id.licenseNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const brokerLine = [
    id.brokerageLegalName,
    id.brokerageLicense ? `DRE# ${id.brokerageLicense}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <footer className="w-full border-t border-neutral-200 px-6 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-8 text-xs text-neutral-500 sm:pb-8 dark:border-neutral-800 dark:text-neutral-400">
      {/* Bottom padding clears the fixed mobile bottom nav (sm:hidden, ~85px
          measured, plus the device safe area) so the legal text is not tucked
          behind it. Desktop has no bottom bar, so sm: resets to normal. */}
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        {identityLine || brokerLine ? (
          <div className="space-y-1">
            {identityLine ? (
              <p className="font-medium text-neutral-700 dark:text-neutral-300">
                {identityLine}
              </p>
            ) : null}
            {brokerLine ? <p>{brokerLine}</p> : null}
            {id.phone ? (
              <p>
                <a href={`tel:${id.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">
                  {id.phone}
                </a>
              </p>
            ) : null}
          </div>
        ) : null}

        {/* IDX/MLS and fair-housing boilerplate. Required in substance by MLS
            display rules, and the kind of disclosure whose absence a manual
            reviewer notices on a site republishing other brokerages'
            listings. */}
        <p className="max-w-3xl leading-relaxed">
          Listing information is provided for consumers&apos; personal,
          non-commercial use and may not be used for any purpose other than to
          identify prospective properties. Information is deemed reliable but is
          not guaranteed. Equal Housing Opportunity.
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/privacy-policy" className="hover:underline">
            Privacy Policy
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/terms-of-service" className="hover:underline">
            Terms of Service
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/data-deletion" className="hover:underline">
            Data Deletion
          </Link>
          {/* Server-rendered links to the two hubs, so every page on the site
              is within one click of them. */}
          <span aria-hidden="true">|</span>
          <Link href="/neighborhoods" className="hover:underline">
            Neighborhoods
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/buy" className="hover:underline">
            Buying
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/sell" className="hover:underline">
            Selling
          </Link>
        </div>
      </div>
    </footer>
  );
}
