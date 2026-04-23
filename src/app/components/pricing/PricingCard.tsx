"use client";

import { Check } from "lucide-react";

export interface TierConfig {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  cta: string;
  isPopular?: boolean;
}

export const TIERS: TierConfig[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "Subdomain (yourname.chatrealty.io)",
      "10 listing photos",
      "1 video tour",
      "Community support",
    ],
    cta: "Get Started",
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 49,
    annualPrice: 490,
    features: [
      "Everything in Free, plus:",
      "Custom domain",
      "50 listing photos",
      "3 video tours",
      "Email support",
      "Lead capture forms",
      "Representation agreements",
    ],
    cta: "Subscribe",
  },
  {
    id: "professional",
    name: "Professional",
    monthlyPrice: 99,
    annualPrice: 990,
    features: [
      "Everything in Starter, plus:",
      "200 listing photos",
      "10 video tours",
      "Priority support",
      "Analytics dashboard",
      "Data export",
      "API access",
      "Custom backgrounds",
      "Blog / content pages",
    ],
    cta: "Subscribe",
    isPopular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 299,
    annualPrice: 2990,
    features: [
      "Everything in Professional, plus:",
      "999 listing photos",
      "50 video tours",
      "Dedicated support",
      "Webhooks & integrations",
      "Agent matching",
      "100 custom pages",
    ],
    cta: "Subscribe",
  },
];

interface PricingCardProps {
  tier: TierConfig;
  isAnnual: boolean;
  isCurrentPlan?: boolean;
  isLight: boolean;
  onSelect: (tierId: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function PricingCard({
  tier,
  isAnnual,
  isCurrentPlan = false,
  isLight,
  onSelect,
  disabled = false,
  compact = false,
}: PricingCardProps) {
  const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
  const displayPrice = isAnnual ? Math.round(tier.annualPrice / 12) : tier.monthlyPrice;
  const isPopular = tier.isPopular && !isCurrentPlan;

  return (
    <div
      className={`relative rounded-xl border p-6 flex flex-col transition-all ${
        compact ? "p-4" : "p-6"
      } ${
        isCurrentPlan
          ? isLight
            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
            : "border-emerald-500 bg-emerald-950/20 ring-2 ring-emerald-800"
          : isPopular
          ? isLight
            ? "border-blue-400 bg-white shadow-lg shadow-blue-100 scale-[1.02]"
            : "border-emerald-400 bg-gray-900/80 shadow-lg shadow-emerald-900/20 scale-[1.02]"
          : isLight
          ? "border-gray-200 bg-white hover:border-gray-300"
          : "border-gray-800 bg-gray-900/60 hover:border-gray-700"
      }`}
    >
      {/* Popular badge */}
      {isPopular && (
        <div
          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${
            isLight
              ? "bg-blue-600 text-white"
              : "bg-emerald-500 text-white"
          }`}
        >
          Most Popular
        </div>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <div
          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${
            isLight
              ? "bg-blue-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          Current Plan
        </div>
      )}

      {/* Tier name */}
      <h3
        className={`${compact ? "text-lg" : "text-xl"} font-bold ${
          isLight ? "text-gray-900" : "text-white"
        }`}
      >
        {tier.name}
      </h3>

      {/* Price */}
      <div className="mt-3 mb-4">
        <span
          className={`${compact ? "text-3xl" : "text-4xl"} font-extrabold ${
            isLight ? "text-gray-900" : "text-white"
          }`}
        >
          ${displayPrice}
        </span>
        {tier.monthlyPrice > 0 && (
          <span
            className={`text-sm ml-1 ${
              isLight ? "text-gray-500" : "text-gray-400"
            }`}
          >
            /mo
          </span>
        )}
        {isAnnual && tier.annualPrice > 0 && (
          <p
            className={`text-xs mt-1 ${
              isLight ? "text-green-600" : "text-green-400"
            }`}
          >
            ${price}/yr &mdash; save ${tier.monthlyPrice * 12 - tier.annualPrice}/yr
          </p>
        )}
      </div>

      {/* Features */}
      <ul className={`space-y-2 flex-1 ${compact ? "mb-4" : "mb-6"}`}>
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                isLight ? "text-blue-500" : "text-emerald-400"
              }`}
            />
            <span
              className={`text-sm ${
                isLight ? "text-gray-600" : "text-gray-300"
              }`}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={() => onSelect(tier.id)}
        disabled={disabled || isCurrentPlan}
        className={`w-full py-3 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isCurrentPlan
            ? isLight
              ? "bg-blue-100 text-blue-600 cursor-default"
              : "bg-emerald-900/30 text-emerald-400 cursor-default"
            : tier.isPopular || tier.monthlyPrice === 0
            ? isLight
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
            : isLight
            ? "bg-gray-900 hover:bg-gray-800 text-white"
            : "bg-gray-700 hover:bg-gray-600 text-white"
        }`}
      >
        {isCurrentPlan ? "Current Plan" : tier.cta}
      </button>
    </div>
  );
}
