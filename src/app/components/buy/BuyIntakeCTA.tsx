"use client";

import { useState } from "react";
import Image from "next/image";
import { Phone, Calendar, Instagram, Facebook, Youtube, Check, Loader2 } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { AgentProfile } from "@/app/hooks/useAgentProfile";
import { formatPhone, toE164US, formatPrice, parsePrice } from "@/lib/format-input";
import { trackLead, trackEvent } from "@/lib/meta-pixel";
import { trackGenerateLead, trackClickToCall } from "@/lib/google-ads";

interface Props {
  agent: AgentProfile;
  cityName: string;
  cityId: string;
}

const PROPERTY_TYPES = ["Single Family", "Condo", "Townhouse", "Land", "Multi-Family"];
const TIMEFRAMES = ["ASAP", "1–3 months", "3–6 months", "6–12 months", "Just exploring"];

export default function BuyIntakeCTA({ agent, cityName, cityId }: Props) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    budgetMin: "",
    budgetMax: "",
    beds: "",
    baths: "",
    propertyType: "",
    timeframe: "",
    message: "",
    createAccount: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Theme-aware styles
  const wrapper = isLight
    ? "bg-white border border-gray-200 shadow-xl"
    : "bg-white/5 border border-white/10 backdrop-blur-xl";
  const heading = isLight ? "text-gray-900" : "text-white";
  const subtext = isLight ? "text-gray-600" : "text-gray-400";
  const label = isLight ? "text-gray-700" : "text-gray-300";
  const inputCls = isLight
    ? "w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0"
    : "w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0";

  const update = (k: keyof typeof form, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v as never }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/buy-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: toE164US(form.phone),
          cityName,
          cityId,
          budgetMin: parsePrice(form.budgetMin),
          budgetMax: parsePrice(form.budgetMax),
          beds: form.beds ? Number(form.beds) : undefined,
          baths: form.baths ? Number(form.baths) : undefined,
          propertyType: form.propertyType,
          timeframe: form.timeframe,
          message: form.message,
          createAccount: form.createAccount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submission failed");
      setSuccess(true);
      trackLead({ contactType: "buy_inquiry", address: cityName });
      trackGenerateLead({ source: "buy_inquiry" });
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`rounded-2xl overflow-hidden ${wrapper}`}>
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Agent panel */}
        <div className="lg:col-span-2 relative min-h-[280px] lg:min-h-full">
          {agent.headshot && (
            <Image
              src={agent.headshot}
              alt={agent.name}
              fill
              className="object-cover object-top"
            />
          )}
          <div
            className={`absolute inset-0 ${
              isLight
                ? "bg-gradient-to-t from-gray-900/85 via-gray-900/30 to-transparent"
                : "bg-gradient-to-t from-black/85 via-black/40 to-transparent"
            }`}
          />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
              Ready to find your home in {cityName}?
            </h2>
            <p className="text-gray-200 text-sm mb-4 leading-relaxed">
              {agent.name.split(" ")[0]} will personally guide you through every step.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <a
                suppressHydrationWarning
                href={`tel:${agent.phone.replace(/\D/g, "")}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${agent.brandColor}, ${agent.secondaryColor})` }}
                onClick={() => { trackEvent("Contact", { contactType: "phone_click" }); trackClickToCall({ phoneNumber: agent.phone, source: "buy_intake" }); }}
              >
                <Phone className="w-4 h-4" />
                {agent.phone}
              </a>
              <a
                href="/book-appointment"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white border border-white/30 bg-white/10 hover:bg-white/20"
              >
                <Calendar className="w-4 h-4" />
                Book
              </a>
            </div>
            <div className="flex gap-2">
              {agent.socialMedia.instagram && (
                <a href={agent.socialMedia.instagram} target="_blank" rel="noopener" className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {agent.socialMedia.facebook && (
                <a href={agent.socialMedia.facebook} target="_blank" rel="noopener" className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {agent.socialMedia.youtube && (
                <a href={agent.socialMedia.youtube} target="_blank" rel="noopener" className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white">
                  <Youtube className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Intake form */}
        <div className="lg:col-span-3 p-6 md:p-8">
          {success ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                style={{ background: agent.brandColor }}
              >
                <Check className="w-7 h-7 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${heading}`}>Thank you!</h3>
              <p className={`text-sm ${subtext} max-w-sm`}>
                {form.createAccount
                  ? `${agent.name.split(" ")[0]} will be in touch shortly. Check your inbox to verify your email and finish setting up your account.`
                  : `${agent.name.split(" ")[0]} will be in touch shortly.`}
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <h3 className={`text-lg font-bold ${heading}`}>Tell us what you&apos;re looking for</h3>
                <p className={`text-xs ${subtext}`}>The more we know, the better the matches.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className={inputCls}
                  style={{ ["--tw-ring-color" as any]: agent.brandColor }}
                />
                <input
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className={inputCls}
                  style={{ ["--tw-ring-color" as any]: agent.brandColor }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className={inputCls}
                  style={{ ["--tw-ring-color" as any]: agent.brandColor }}
                />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => update("phone", formatPhone(e.target.value))}
                  className={inputCls}
                  style={{ ["--tw-ring-color" as any]: agent.brandColor }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Budget min"
                  value={form.budgetMin}
                  onChange={(e) => update("budgetMin", formatPrice(e.target.value))}
                  className={inputCls}
                  style={{ ["--tw-ring-color" as any]: agent.brandColor }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Budget max"
                  value={form.budgetMax}
                  onChange={(e) => update("budgetMax", formatPrice(e.target.value))}
                  className={inputCls}
                  style={{ ["--tw-ring-color" as any]: agent.brandColor }}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input
                  type="number"
                  min="0"
                  placeholder="Beds"
                  value={form.beds}
                  onChange={(e) => update("beds", e.target.value)}
                  className={inputCls}
                  style={{ ["--tw-ring-color" as any]: agent.brandColor }}
                />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Baths"
                  value={form.baths}
                  onChange={(e) => update("baths", e.target.value)}
                  className={inputCls}
                  style={{ ["--tw-ring-color" as any]: agent.brandColor }}
                />
                <select
                  value={form.propertyType}
                  onChange={(e) => update("propertyType", e.target.value)}
                  className={inputCls}
                  style={{ ["--tw-ring-color" as any]: agent.brandColor }}
                >
                  <option value="">Type</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={form.timeframe}
                  onChange={(e) => update("timeframe", e.target.value)}
                  className={inputCls}
                  style={{ ["--tw-ring-color" as any]: agent.brandColor }}
                >
                  <option value="">Timeframe</option>
                  {TIMEFRAMES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <textarea
                rows={3}
                placeholder="Anything else? (must-haves, neighborhoods, lifestyle…)"
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                className={inputCls}
                style={{ ["--tw-ring-color" as any]: agent.brandColor }}
              />

              <label className={`flex items-start gap-2 text-xs ${label} cursor-pointer`}>
                <input
                  type="checkbox"
                  checked={form.createAccount}
                  onChange={(e) => update("createAccount", e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Create a free account so I can save your favorites and send matching listings.
                  We&apos;ll email you a link to verify and finish setup.
                </span>
              </label>

              {error && (
                <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all hover:scale-[1.01] disabled:opacity-60 disabled:hover:scale-100"
                style={{ background: `linear-gradient(135deg, ${agent.brandColor}, ${agent.secondaryColor})` }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Get personalized listings"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
