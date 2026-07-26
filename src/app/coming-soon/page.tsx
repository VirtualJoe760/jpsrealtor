// The "site under construction" page for an agent subdomain that exists but
// isn't published yet.
//
// WHY IT EXISTS: {agent}.chatrealty.io previously answered a bare 404 before
// the agent finished setup or connected a built site — a dead end for anyone
// who typed the address early (and a bad first impression for an agent
// showing a colleague their new subdomain).
//
// SCOPE — read this before assuming it fixes every subdomain 404:
//   * It only renders for subdomains routed to THIS app. A subdomain that was
//     never registered as a Vercel domain 404s at the edge, before our code
//     runs, so nothing here can catch it. Registering the subdomain at
//     provisioning is what makes this page reachable.
//   * www.{agent}.chatrealty.io additionally fails TLS: the wildcard cert
//     covers ONE label, so a two-label host has no matching certificate and
//     the browser blocks before any request is sent. Also unfixable here —
//     it needs the www twin registered per-agent (Vercel issues a cert per
//     domain) or a multi-level wildcard cert.

import type { Metadata } from "next";
import Wordmark from "@/app/components/brand/Wordmark";

export const metadata: Metadata = {
  title: "Coming soon",
  description: "This site is being built.",
  // Never index a placeholder — it would compete with the real site later.
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <Wordmark className="text-[22px] text-neutral-100" />

      <h1 className="mt-10 text-2xl font-semibold text-neutral-50 sm:text-3xl">
        This site is under construction
      </h1>
      <p className="mt-3 max-w-md text-neutral-400">
        The agent is putting the finishing touches on it. Check back soon.
      </p>

      <a
        href="https://www.chatrealty.io"
        className="mt-8 rounded-lg border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-800"
      >
        Visit ChatRealty
      </a>
    </main>
  );
}
