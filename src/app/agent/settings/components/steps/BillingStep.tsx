"use client";

import { useState, useEffect } from "react";
import { CreditCard, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import PricingCard, { TIERS } from "@/app/components/pricing/PricingCard";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

interface SubscriptionData {
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
  amount: number;
  interval: string;
  cancelAtPeriodEnd: boolean;
}

interface UsageData {
  photos: { used: number; limit: number };
  videos: { used: number; limit: number };
  customPages: { used: number; limit: number };
}

interface InvoiceRecord {
  id: string;
  date: string;
  amount: number;
  status: string;
  invoiceUrl: string | null;
}

export default function BillingStep({
  formData,
  updateField,
  isLight,
  onSave,
  isSaving,
}: StepProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const res = await fetch("/api/stripe/subscription");
        if (res.ok) {
          const data = await res.json();
          setSubscription(data.subscription || null);
          setUsage(data.usage || null);
          setInvoices(data.invoices || []);
          if (data.subscription?.interval === "annual") {
            setIsAnnual(true);
          }
        }
      } catch {
        // No subscription data available
      } finally {
        setLoading(false);
      }
    };
    fetchBilling();
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Portal error
    } finally {
      setPortalLoading(false);
    }
  };

  const handleChangePlan = async (tierId: string) => {
    if (tierId === "free") return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tierId,
          billingInterval: isAnnual ? "annual" : "monthly",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Checkout error
    } finally {
      setCheckoutLoading(false);
    }
  };

  const cardClass = `rounded-xl border p-6 ${
    isLight ? "bg-white border-gray-200" : "bg-gray-900/60 border-gray-800"
  }`;

  const labelClass = `text-sm font-medium ${
    isLight ? "text-gray-500" : "text-gray-400"
  }`;

  const valueClass = `text-base font-semibold ${
    isLight ? "text-gray-900" : "text-white"
  }`;

  if (loading) {
    return (
      <div className={cardClass}>
        <div className="flex items-center justify-center py-12">
          <Loader2
            className={`w-6 h-6 animate-spin ${
              isLight ? "text-gray-400" : "text-gray-500"
            }`}
          />
          <span
            className={`ml-2 text-sm ${
              isLight ? "text-gray-500" : "text-gray-400"
            }`}
          >
            Loading billing information...
          </span>
        </div>
      </div>
    );
  }

  // No subscription — show upgrade prompt
  if (!subscription || subscription.tier === "free") {
    return (
      <div className={cardClass}>
        <h2
          className={`text-xl font-bold mb-1 ${
            isLight ? "text-gray-900" : "text-white"
          }`}
        >
          Subscription
        </h2>
        <p
          className={`text-sm mb-6 ${
            isLight ? "text-gray-500" : "text-gray-400"
          }`}
        >
          Manage your plan and billing details.
        </p>

        {/* Current plan */}
        <div
          className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${
            isLight ? "bg-gray-50 border border-gray-200" : "bg-gray-800 border border-gray-700"
          }`}
        >
          <CreditCard
            className={`w-8 h-8 ${
              isLight ? "text-gray-400" : "text-gray-500"
            }`}
          />
          <div>
            <p className={valueClass}>Free Plan</p>
            <p className={labelClass}>
              Basic features with limited photos and videos
            </p>
          </div>
        </div>

        {/* Upgrade prompt */}
        <div
          className={`rounded-lg p-5 text-center ${
            isLight
              ? "bg-blue-50 border border-blue-200"
              : "bg-blue-950/20 border border-blue-800"
          }`}
        >
          <AlertCircle
            className={`w-8 h-8 mx-auto mb-2 ${
              isLight ? "text-blue-500" : "text-blue-400"
            }`}
          />
          <h3
            className={`font-bold mb-1 ${
              isLight ? "text-blue-800" : "text-blue-300"
            }`}
          >
            Unlock more features
          </h3>
          <p
            className={`text-sm mb-4 ${
              isLight ? "text-blue-600" : "text-blue-400"
            }`}
          >
            Upgrade to get custom domains, more photos, analytics, and priority
            support.
          </p>
          <a
            href="/pricing"
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white transition-colors ${
              isLight
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            View Plans
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Usage meters even on free */}
        {usage && <UsageMeters usage={usage} isLight={isLight} />}
      </div>
    );
  }

  // Active subscription view
  const statusColor =
    subscription.status === "active"
      ? isLight
        ? "bg-green-100 text-green-700"
        : "bg-green-900/30 text-green-400"
      : subscription.status === "trialing"
      ? isLight
        ? "bg-blue-100 text-blue-700"
        : "bg-blue-900/30 text-blue-400"
      : isLight
      ? "bg-amber-100 text-amber-700"
      : "bg-amber-900/30 text-amber-400";

  const tierConfig = TIERS.find((t) => t.id === subscription.tier);

  return (
    <div className={cardClass}>
      <h2
        className={`text-xl font-bold mb-1 ${
          isLight ? "text-gray-900" : "text-white"
        }`}
      >
        Subscription
      </h2>
      <p
        className={`text-sm mb-6 ${
          isLight ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Manage your plan, billing, and usage.
      </p>

      {/* Current plan card */}
      <div
        className={`rounded-lg p-5 mb-6 ${
          isLight
            ? "bg-gray-50 border border-gray-200"
            : "bg-gray-800 border border-gray-700"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <CreditCard
              className={`w-6 h-6 ${
                isLight ? "text-blue-500" : "text-emerald-400"
              }`}
            />
            <div>
              <p className={valueClass}>{tierConfig?.name || subscription.tier} Plan</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                >
                  {subscription.status}
                </span>
                {subscription.cancelAtPeriodEnd && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isLight
                        ? "bg-red-100 text-red-700"
                        : "bg-red-900/30 text-red-400"
                    }`}
                  >
                    Cancels at period end
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className={valueClass}>
              ${subscription.amount}
              <span className={`text-sm font-normal ${labelClass}`}>
                /{subscription.interval === "annual" ? "yr" : "mo"}
              </span>
            </p>
            {subscription.currentPeriodEnd && (
              <p className={`text-xs ${isLight ? "text-gray-400" : "text-gray-500"}`}>
                Next billing:{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={openPortal}
          disabled={portalLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isLight
              ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
              : "bg-gray-700 hover:bg-gray-600 text-gray-200"
          } disabled:opacity-50`}
        >
          {portalLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          Manage Billing
        </button>
      </div>

      {/* Usage meters */}
      {usage && <UsageMeters usage={usage} isLight={isLight} />}

      {/* Change Plan */}
      <div className="mt-6">
        <button
          onClick={() => setShowChangePlan(!showChangePlan)}
          className={`text-sm font-medium ${
            isLight
              ? "text-blue-600 hover:text-blue-700"
              : "text-emerald-400 hover:text-emerald-300"
          }`}
        >
          {showChangePlan ? "Hide plan options" : "Change Plan"}
        </button>

        {showChangePlan && (
          <div className="mt-4">
            {/* Billing toggle */}
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-sm ${
                  !isAnnual
                    ? isLight ? "text-gray-900 font-medium" : "text-white font-medium"
                    : isLight ? "text-gray-500" : "text-gray-400"
                }`}
              >
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isAnnual
                    ? isLight ? "bg-blue-600" : "bg-emerald-600"
                    : isLight ? "bg-gray-300" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    isAnnual ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
              <span
                className={`text-sm ${
                  isAnnual
                    ? isLight ? "text-gray-900 font-medium" : "text-white font-medium"
                    : isLight ? "text-gray-500" : "text-gray-400"
                }`}
              >
                Annual
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TIERS.filter((t) => t.id !== "free").map((tier) => (
                <PricingCard
                  key={tier.id}
                  tier={tier}
                  isAnnual={isAnnual}
                  isCurrentPlan={subscription.tier === tier.id}
                  isLight={isLight}
                  onSelect={handleChangePlan}
                  disabled={checkoutLoading}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Billing History */}
      {invoices.length > 0 && (
        <div className="mt-8">
          <h3
            className={`text-sm font-bold uppercase tracking-wide mb-3 ${
              isLight ? "text-gray-500" : "text-gray-400"
            }`}
          >
            Billing History
          </h3>
          <div
            className={`rounded-lg overflow-hidden border ${
              isLight ? "border-gray-200" : "border-gray-700"
            }`}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  className={
                    isLight ? "bg-gray-50" : "bg-gray-800"
                  }
                >
                  <th
                    className={`text-left px-4 py-2 font-medium ${
                      isLight ? "text-gray-600" : "text-gray-300"
                    }`}
                  >
                    Date
                  </th>
                  <th
                    className={`text-left px-4 py-2 font-medium ${
                      isLight ? "text-gray-600" : "text-gray-300"
                    }`}
                  >
                    Amount
                  </th>
                  <th
                    className={`text-left px-4 py-2 font-medium ${
                      isLight ? "text-gray-600" : "text-gray-300"
                    }`}
                  >
                    Status
                  </th>
                  <th
                    className={`text-right px-4 py-2 font-medium ${
                      isLight ? "text-gray-600" : "text-gray-300"
                    }`}
                  >
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`border-t ${
                      isLight ? "border-gray-200" : "border-gray-700"
                    }`}
                  >
                    <td
                      className={`px-4 py-2.5 ${
                        isLight ? "text-gray-700" : "text-gray-300"
                      }`}
                    >
                      {new Date(inv.date).toLocaleDateString()}
                    </td>
                    <td
                      className={`px-4 py-2.5 ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}
                    >
                      ${(inv.amount / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          inv.status === "paid"
                            ? isLight
                              ? "bg-green-100 text-green-700"
                              : "bg-green-900/30 text-green-400"
                            : isLight
                            ? "bg-amber-100 text-amber-700"
                            : "bg-amber-900/30 text-amber-400"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {inv.invoiceUrl && (
                        <a
                          href={inv.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs ${
                            isLight
                              ? "text-blue-600 hover:text-blue-700"
                              : "text-blue-400 hover:text-blue-300"
                          }`}
                        >
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Usage meters sub-component ── */

function UsageMeters({
  usage,
  isLight,
}: {
  usage: UsageData;
  isLight: boolean;
}) {
  const meters = [
    { label: "Photos", ...usage.photos },
    { label: "Videos", ...usage.videos },
    { label: "Custom Pages", ...usage.customPages },
  ];

  return (
    <div className="mt-6">
      <h3
        className={`text-sm font-bold uppercase tracking-wide mb-3 ${
          isLight ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Usage
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {meters.map((m) => {
          const pct = m.limit > 0 ? Math.min((m.used / m.limit) * 100, 100) : 0;
          const isHigh = pct > 80;
          return (
            <div
              key={m.label}
              className={`rounded-lg p-3 ${
                isLight
                  ? "bg-gray-50 border border-gray-200"
                  : "bg-gray-800 border border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium ${
                    isLight ? "text-gray-600" : "text-gray-300"
                  }`}
                >
                  {m.label}
                </span>
                <span
                  className={`text-xs ${
                    isHigh
                      ? "text-amber-500 font-medium"
                      : isLight
                      ? "text-gray-400"
                      : "text-gray-500"
                  }`}
                >
                  {m.used} / {m.limit}
                </span>
              </div>
              <div
                className={`h-2 rounded-full overflow-hidden ${
                  isLight ? "bg-gray-200" : "bg-gray-700"
                }`}
              >
                <div
                  className={`h-full rounded-full transition-all ${
                    isHigh
                      ? "bg-amber-500"
                      : isLight
                      ? "bg-blue-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
