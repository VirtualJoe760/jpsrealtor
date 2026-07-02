"use client";

import { CreditCard, Check } from "lucide-react";
import { TIER_DETAILS } from "@/config/stripe-prices";
import type { SubscriptionTier } from "@/models/AgentSubscription";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

const TIER_ORDER: SubscriptionTier[] = [
  "free",
  "beginner",
  "experienced",
  "topagent",
];

/**
 * Billing / plan panel. Shown both as the onboarding wizard's plan step and as
 * the Settings → Billing section. Only the Free plan is selectable right now;
 * paid tiers are shown greyed as "Coming soon".
 */
export default function BillingSettings({ isLight }: StepProps) {
  const currentTier: SubscriptionTier = "free"; // everyone is on Free for now

  return (
    <div className="space-y-6">
      <div>
        <h2
          className={`text-2xl font-semibold ${
            isLight ? "text-gray-900" : "text-white"
          }`}
        >
          Plan &amp; Billing
        </h2>
        <p
          className={`text-sm mt-1 ${
            isLight ? "text-gray-600" : "text-gray-400"
          }`}
        >
          You&apos;re on the free plan. Paid tiers unlock email, messaging,
          campaigns and more &mdash; coming soon.
        </p>
      </div>

      {/* Current plan banner */}
      <div
        className={`rounded-lg p-4 flex items-center gap-3 ${
          isLight
            ? "bg-gray-50 border border-gray-200"
            : "bg-gray-800 border border-gray-700"
        }`}
      >
        <CreditCard
          className={`w-8 h-8 ${isLight ? "text-blue-500" : "text-emerald-400"}`}
        />
        <div>
          <p
            className={`text-base font-semibold ${
              isLight ? "text-gray-900" : "text-white"
            }`}
          >
            {TIER_DETAILS[currentTier].name} Plan
          </p>
          <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-400"}`}>
            {TIER_DETAILS[currentTier].description || "Your current plan"}
          </p>
        </div>
      </div>

      {/* Plan grid — Free is current; paid tiers are greyed "Coming soon" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TIER_ORDER.map((id) => {
          const t = TIER_DETAILS[id];
          const isCurrent = id === currentTier;
          return (
            <div
              key={id}
              className={`relative rounded-xl border p-4 flex flex-col ${
                isCurrent
                  ? isLight
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-emerald-500 bg-emerald-950/20 ring-2 ring-emerald-800"
                  : isLight
                  ? "border-gray-200 bg-white opacity-60"
                  : "border-gray-800 bg-gray-900/60 opacity-60"
              }`}
            >
              <h3
                className={`text-lg font-bold ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                {t.name}
              </h3>
              <div className="mt-2 mb-3">
                <span
                  className={`text-3xl font-extrabold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  ${t.monthlyPrice}
                </span>
                {t.monthlyPrice > 0 && (
                  <span
                    className={`text-sm ml-1 ${
                      isLight ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    /mo
                  </span>
                )}
              </div>
              <ul className="space-y-1.5 flex-1 mb-4">
                {t.features.slice(0, 5).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        isLight ? "text-blue-500" : "text-emerald-400"
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        isLight ? "text-gray-600" : "text-gray-300"
                      }`}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                disabled
                className={`w-full py-2.5 rounded-lg text-sm font-bold cursor-default ${
                  isCurrent
                    ? isLight
                      ? "bg-blue-100 text-blue-700"
                      : "bg-emerald-900/30 text-emerald-400"
                    : isLight
                    ? "bg-gray-100 text-gray-400"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {isCurrent ? "Current plan" : "Coming soon"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
