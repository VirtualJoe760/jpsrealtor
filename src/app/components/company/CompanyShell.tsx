"use client";

// Shared frame for the ChatRealty company pages (/mission, /join, /invest,
// /support). Deliberately NOT the CenterHero used by the legal pages: that
// renders the primary agent's business card, and these pages speak for
// ChatRealty the company, not for any one agent.

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/app/contexts/ThemeContext";

export function useCompanyTheme() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  return {
    isLight,
    heading: isLight ? "text-gray-900" : "text-white",
    body: isLight ? "text-gray-700" : "text-neutral-300",
    muted: isLight ? "text-gray-500" : "text-neutral-400",
    card: isLight
      ? "bg-white/90 border-gray-200"
      : "bg-neutral-900/70 border-neutral-700/60",
    accent: isLight ? "text-blue-600" : "text-sky-400",
    primaryBtn: "bg-blue-600 text-white hover:bg-blue-500",
    secondaryBtn: isLight
      ? "border border-gray-300 text-gray-800 hover:bg-gray-100"
      : "border border-neutral-600 text-white hover:bg-neutral-800",
    input: isLight
      ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
      : "bg-neutral-950/60 border-neutral-700 text-white placeholder-neutral-500",
  };
}

export function CompanyShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useCompanyTheme();
  return (
    <main className="min-h-screen px-4 sm:px-6 py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        <p className={`text-xs font-semibold tracking-[0.3em] uppercase ${t.accent}`}>{eyebrow}</p>
        <h1 className={`mt-3 text-4xl md:text-5xl font-bold leading-tight ${t.heading}`}>{title}</h1>
        {lede && <p className={`mt-5 text-lg leading-relaxed ${t.body}`}>{lede}</p>}
        <div className="mt-10 space-y-8">{children}</div>
      </div>
    </main>
  );
}

export function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  const t = useCompanyTheme();
  return (
    <section className={`rounded-2xl border p-6 md:p-8 backdrop-blur-sm ${t.card}`}>
      {title && <h2 className={`text-xl md:text-2xl font-semibold mb-4 ${t.heading}`}>{title}</h2>}
      <div className={`space-y-4 leading-relaxed ${t.body}`}>{children}</div>
    </section>
  );
}

/**
 * Renders children for signed-in users; otherwise a prompt to create an
 * account (or sign in and come straight back to this page).
 */
export function AccountGate({ action, children }: { action: string; children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname() || "/";
  const t = useCompanyTheme();

  if (status === "loading") {
    return <div className={`h-24 rounded-xl animate-pulse ${t.isLight ? "bg-gray-100" : "bg-neutral-800/60"}`} />;
  }
  if (status === "authenticated") return <>{children}</>;

  return (
    <div className={`rounded-xl border p-5 ${t.isLight ? "border-blue-200 bg-blue-50" : "border-sky-900 bg-sky-950/40"}`}>
      <p className={`font-medium ${t.heading}`}>Create a free ChatRealty account to {action}.</p>
      <p className={`mt-1 text-sm ${t.muted}`}>It takes a minute. Already have one? Sign in and you&apos;ll land right back here.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/auth/signup" className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${t.primaryBtn}`}>
          Create an account
        </Link>
        <Link
          href={`/auth/signin?from=${encodeURIComponent(pathname)}`}
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${t.secondaryBtn}`}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
