// /affiliate-terms — ChatRealty Affiliate Program Terms.
// Numbers render from src/config/affiliates.ts so the page can't drift from
// what the code pays. Bump AFFILIATE_TERMS_VERSION on a material change.
// DRAFT pending counsel review (DRE / RESPA §8 / FTC) — see
// docs/commerce/affiliates.md.

import type { Metadata } from "next";
import Link from "next/link";
import {
  AFFILIATE_TIERS,
  AFFILIATE_TERMS_VERSION,
  ATTRIBUTION_WINDOW_DAYS,
  PAYOUT_MINIMUM_USD,
  PAYOUT_DAY_OF_MONTH,
  REFUND_HOLD_DAYS,
} from "@/config/affiliates";

export const metadata: Metadata = {
  title: "Affiliate Program Terms | ChatRealty",
  description: "Terms for the ChatRealty affiliate program: commissions on agent subscriptions, attribution, payouts and disclosure rules.",
  alternates: { canonical: "https://chatrealty.io/affiliate-terms" },
};

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 mb-2 text-lg font-semibold">{children}</h2>;

export default function AffiliateTermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed">
      <h1 className="mb-1 text-2xl font-bold">ChatRealty Affiliate Program Terms</h1>
      <p className="mb-6 opacity-70">Version {AFFILIATE_TERMS_VERSION}</p>

      <p>
        These terms govern the ChatRealty affiliate program (&quot;Program&quot;). By applying you agree to them. ChatRealty may
        approve or decline any application.
      </p>

      <H>1. What you earn</H>
      <p>
        You earn a flat amount each month for every real estate agent who subscribes to a paid ChatRealty plan through your
        link, for every month that agent&apos;s subscription payment is collected. Your per-agent rate depends on how many of your
        referred agents are paying at the time each payment is collected, and that rate applies to all of them:
      </p>
      <table className="my-3 text-left">
        <tbody>
          {AFFILIATE_TIERS.map((t) => (
            <tr key={t.minAgents}>
              <td className="pr-6">{t.label}</td>
              <td className="font-semibold">${t.ratePerAgent} per agent per month</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Agents who cancel, stop paying, are on a free trial or are past due do not count toward your tier. A commission never
        exceeds the amount the agent actually paid for that month.
      </p>

      <H>2. Subscriptions only</H>
      <p>
        Commissions are paid only on ChatRealty software subscription fees. You earn nothing on, and ChatRealty will never pay
        you for, any real estate transaction, client, lead, referral of a buyer or seller, loan, title or escrow service, or
        closing; nor on credit purchases, advertising or marketing spend, domains, or other add-ons. If you hold a real estate,
        mortgage, title or escrow license, you are responsible for confirming your participation complies with the rules that
        apply to you.
      </p>

      <H>3. Attribution</H>
      <p>
        An agent is credited to you when they sign up or subscribe within {ATTRIBUTION_WINDOW_DAYS} days of clicking your link,
        on the same browser. If they click more than one affiliate&apos;s link, the most recent click counts. Once the agent&apos;s
        subscription is credited to an affiliate, it stays credited. You cannot earn on your own subscription.
      </p>

      <H>4. Payment</H>
      <p>
        Each commission becomes payable {REFUND_HOLD_DAYS} days after the agent&apos;s payment. If that payment is refunded or
        charged back, the commission is cancelled, or deducted from your next payout if it was already paid. We pay by Stripe
        transfer around the {PAYOUT_DAY_OF_MONTH}th of each month when your payable balance is at least ${PAYOUT_MINIMUM_USD};
        smaller balances roll over. To be paid you must complete Stripe&apos;s payout onboarding (identity, bank account and tax
        information). You are an independent contractor and responsible for your own taxes; Stripe issues the 1099 where
        required.
      </p>

      <H>5. Disclosure (required)</H>
      <p>
        Under FTC rules you must clearly and conspicuously disclose that you are paid when you recommend ChatRealty — for
        example, &quot;I earn a commission if you subscribe through my link.&quot; Put it next to the link, not only in a bio or
        footer. Undisclosed promotion is grounds for termination and forfeiture of unpaid commissions.
      </p>

      <H>6. Prohibited conduct</H>
      <ul className="list-disc pl-5">
        <li>Spam, unsolicited bulk messages, or texts/calls without consent.</li>
        <li>Bidding on ChatRealty brand terms in paid search, or posing as ChatRealty.</li>
        <li>False or misleading claims about ChatRealty, its pricing, or results.</li>
        <li>Self-referrals, fake accounts, cookie stuffing, or paying agents to sign up.</li>
        <li>Offering coupons or discounts ChatRealty has not given you.</li>
      </ul>

      <H>7. Changes and termination</H>
      <p>
        ChatRealty may change rates or these terms with 30 days&apos; notice by email; changes apply to payments collected after
        the notice period. Either side may end participation at any time. On termination for breach, unpaid commissions are
        forfeited; otherwise payable commissions earned before termination are paid on the normal schedule.
      </p>

      <H>8. Contact</H>
      <p>
        Questions: reply to any program email, or visit your <Link href="/partner/affiliate" className="underline">affiliate dashboard</Link>.
      </p>
    </main>
  );
}
