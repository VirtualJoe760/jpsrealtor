"use client";

import Link from "next/link";
import {
  UserRound,
  Phone,
  Image as ImageIcon,
  Camera,
  Type,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { getSiteReadiness } from "@/lib/agent-site-readiness";

/**
 * GoLiveBounties
 *
 * The agent's "go live" bounty board: the settings they must complete before
 * their public {slug}.chatrealty.io site publishes (free tier — no subscription).
 * Reads the SAME checklist (getSiteReadiness) that the public-site gate uses, so
 * clearing every bounty here is exactly what flips the site from Coming Soon to
 * live. Each open bounty deep-links to the settings step that satisfies it.
 */

interface GoLiveBountiesProps {
  name?: string | null;
  phone?: string | null;
  agentProfile?: any;
  isLight: boolean;
}

// UI metadata per readiness step (icon + one-line hint + the settings section
// that satisfies it). Keyed by getSiteReadiness step.key.
const BOUNTY_META: Record<string, { hint: string; section: string; icon: LucideIcon }> = {
  name: { hint: "Your name as it appears across your site.", section: "identity", icon: UserRound },
  phone: { hint: "A number clients can reach you at.", section: "identity", icon: Phone },
  heroPhoto: { hint: "The banner image at the top of your site.", section: "photos", icon: ImageIcon },
  headshot: { hint: "Your profile photo.", section: "photos", icon: Camera },
  headline: { hint: "A short tagline that introduces you.", section: "content", icon: Type },
  story: { hint: "A short bio or intro video.", section: "content", icon: BookOpen },
};

export default function GoLiveBounties({ name, phone, agentProfile, isLight }: GoLiveBountiesProps) {
  const { steps, completed, total, complete } = getSiteReadiness({ name, phone, agentProfile });
  const percentage = Math.round((completed / total) * 100);

  // ---- Live state ----
  if (complete) {
    return (
      <div
        className={`rounded-xl p-5 mb-8 flex items-center justify-between gap-4 ${
          isLight ? "bg-green-50 border-2 border-green-200" : "bg-green-900/20 border-2 border-green-800"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isLight ? "bg-green-100" : "bg-green-900/40"}`}>
            <Globe className={`w-6 h-6 ${isLight ? "text-green-600" : "text-green-400"}`} />
          </div>
          <div>
            <h3 className={`text-base font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
              Your site is live
            </h3>
            <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
              Every bounty is complete — you&apos;re published on the ChatRealty network.
            </p>
          </div>
        </div>
        <Link
          href="/agent/settings"
          className={`px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0 transition-colors ${
            isLight
              ? "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
              : "bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700"
          }`}
        >
          Edit site
        </Link>
      </div>
    );
  }

  // ---- Bounty board (incomplete) ----
  return (
    <div
      className={`rounded-xl p-6 mb-8 ${
        isLight
          ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200"
          : "bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-2 border-blue-800"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`text-xl font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>
            Go live checklist
          </h3>
          <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
            Complete these {total} bounties to publish your site on the ChatRealty network — no
            subscription needed.
          </p>
        </div>
        <div
          className={`text-3xl font-bold flex-shrink-0 ml-4 ${
            percentage >= 75 ? "text-green-600" : percentage >= 50 ? "text-yellow-600" : "text-blue-600"
          }`}
        >
          {completed}/{total}
        </div>
      </div>

      {/* Progress bar */}
      <div className={`w-full h-2.5 rounded-full mb-5 ${isLight ? "bg-gray-200" : "bg-gray-700"}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percentage >= 75 ? "bg-green-600" : percentage >= 50 ? "bg-yellow-500" : "bg-blue-600"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Bounties */}
      <ul className="space-y-2">
        {steps.map((step) => {
          const meta = BOUNTY_META[step.key] ?? { hint: "", section: "identity", icon: CheckCircle2 };
          const Icon = step.done ? CheckCircle2 : meta.icon;
          return (
            <li key={step.key}>
              <div
                className={`flex items-center gap-3 rounded-lg p-3 border ${
                  step.done
                    ? isLight
                      ? "bg-green-50/60 border-green-100"
                      : "bg-green-900/10 border-green-900/40"
                    : isLight
                    ? "bg-white border-gray-200"
                    : "bg-slate-800/40 border-slate-700"
                }`}
              >
                <div
                  className={`p-2 rounded-lg flex-shrink-0 ${
                    step.done
                      ? isLight ? "bg-green-100" : "bg-green-900/40"
                      : isLight ? "bg-blue-100" : "bg-blue-900/40"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      step.done
                        ? isLight ? "text-green-600" : "text-green-400"
                        : isLight ? "text-blue-600" : "text-blue-400"
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      step.done
                        ? isLight ? "text-gray-400 line-through" : "text-gray-500 line-through"
                        : isLight ? "text-gray-900" : "text-white"
                    }`}
                  >
                    {step.label}
                  </p>
                  {!step.done && (
                    <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                      {meta.hint}
                    </p>
                  )}
                </div>

                {step.done ? (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded flex-shrink-0 ${
                      isLight ? "bg-green-100 text-green-700" : "bg-green-900/40 text-green-300"
                    }`}
                  >
                    Done
                  </span>
                ) : (
                  <Link
                    href={`/agent/settings?section=${meta.section}`}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors ${
                      isLight
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}
                  >
                    Complete
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
