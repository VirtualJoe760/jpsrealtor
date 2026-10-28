"use client";

import Link from "next/link";
import { CompanyShell, Section, useCompanyTheme } from "@/app/components/company/CompanyShell";

const STACK = [
  { tool: "CRM", typical: "$100–$300 / month" },
  { tool: "Dialer", typical: "~$300 / month" },
  { tool: "Agent website", typical: "~$300 / month" },
];

export default function MissionClient() {
  const t = useCompanyTheme();
  return (
    <CompanyShell
      eyebrow="Our Mission"
      title={<>Built by an agent. <span className={t.accent}>For agents.</span></>}
      lede="ChatRealty is setting out to be the one platform a realtor needs to run their business — and to put agents, not lead brokers, at the center of real estate online."
    >
      <Section title="You keep paying for data you already own">
        <p>
          Since it began, the real estate software industry has stacked cost on top of cost. You join an
          association to become a realtor. You pay for access to the MLS. Then you get billed again — by company
          after company — for that same data.
        </p>
        <div className="grid gap-3 sm:grid-cols-3 pt-2">
          {STACK.map((s) => (
            <div key={s.tool} className={`rounded-xl border p-4 ${t.isLight ? "border-gray-200" : "border-neutral-700"}`}>
              <p className={`text-sm ${t.muted}`}>{s.tool}</p>
              <p className={`mt-1 text-lg font-semibold ${t.heading}`}>{s.typical}</p>
            </div>
          ))}
        </div>
        <p className={`text-sm ${t.muted}`}>Typical industry pricing — much of it to reach data you already pay for.</p>
      </Section>

      <Section title="One platform, centered on the agent">
        <p>
          ChatRealty brings the CRM, the dialer and the website builder into one platform that is agent-focused and
          built by an agent — and that your clients can use too.
        </p>
        <p>
          Instead of a central portal that sells website leads back to agents at a premium, agents on ChatRealty
          create a profile that becomes <strong className={t.heading}>their own website</strong>. Think of it as
          Facebook and Zillow having a baby: your domain, your insight, your local knowledge and your brand are what
          drive the site&apos;s visibility — so you can stand alongside the industry giants instead of renting space
          from them.
        </p>
        <p>
          We&apos;re building the alternative to pay-to-play lead systems: a one-stop shop for every piece of
          technology a realtor needs in today&apos;s market.
        </p>
      </Section>

      <Section title="Modern tools that set you apart">
        <ul className="space-y-2 list-disc pl-5">
          <li><strong className={t.heading}>CMAs on demand</strong> — comparative market analyses generated in seconds.</li>
          <li><strong className={t.heading}>Cash-flow calculator</strong> — see whether a property can be profitable with a loan.</li>
          <li><strong className={t.heading}>Historical data on demand</strong> — share market history with clients that your competition can&apos;t.</li>
        </ul>
      </Section>

      <Section title="Our promise">
        <p className={`text-lg ${t.heading}`}>
          We don&apos;t want to sell you a subscription and say &ldquo;good luck out there, kid.&rdquo;
        </p>
        <p>Our goal is to see you make money — and to be part of your business&apos;s growth.</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/join" className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${t.primaryBtn}`}>Join us</Link>
          <Link href="/invest" className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${t.secondaryBtn}`}>Invest in ChatRealty</Link>
          <Link href="/support" className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${t.secondaryBtn}`}>Support our work</Link>
        </div>
      </Section>
    </CompanyShell>
  );
}
