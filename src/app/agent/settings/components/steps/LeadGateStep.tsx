"use client";

// Registration gate on this agent's listing posts (open houses + listing
// landing pages).
//
// This is the tenant-level default. A post can override it in the CMS, but
// only if it deliberately opts out — so changing the setting here moves every
// post that has not.
//
// What this does NOT control is what an unregistered visitor can see. The
// server sends them the teaser payload whichever mode is picked
// (src/lib/listings/listing-post-teaser.ts), so this is purely how soon the
// wall appears. That is why an aggressive setting is a conversion trade-off
// and never a data-exposure one.

import { Save, Loader2, Lock, Zap, Clock, MousePointerClick, Unlock } from "lucide-react";
import { PLATFORM_DEFAULT_LEAD_GATE, type LeadGateMode } from "@/lib/listings/lead-gate";
import ImageUploadField from "../shared/ImageUploadField";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

const MODES: {
  id: LeadGateMode;
  label: string;
  icon: typeof Zap;
  blurb: string;
}[] = [
  {
    id: "immediate",
    label: "Right away",
    icon: Zap,
    blurb: "The wall appears as soon as the page loads. Highest capture rate, highest bounce.",
  },
  {
    id: "delay",
    label: "After a few seconds",
    icon: Clock,
    blurb: "They read first, then the wall appears. The usual choice.",
  },
  {
    id: "scroll",
    label: "After they scroll",
    icon: MousePointerClick,
    blurb: "The wall waits until they have worked through part of the page.",
  },
  {
    id: "off",
    label: "No wall",
    icon: Unlock,
    blurb: "Nothing is hidden and nothing interrupts. The registration form still sits on the page.",
  },
];

export default function LeadGateStep({ formData, updateField, isLight, onSave, isSaving }: StepProps) {
  const gate = formData.agentProfile?.leadGate || {};

  // An absent field means "use the platform default" — there is one source of
  // truth for those (lead-gate.ts) and the schema deliberately stores no
  // defaults of its own.
  const enabled = gate.enabled !== false;
  const mode: LeadGateMode = gate.mode || PLATFORM_DEFAULT_LEAD_GATE.mode;
  const delaySeconds = Number.isFinite(Number(gate.delaySeconds))
    ? Number(gate.delaySeconds)
    : PLATFORM_DEFAULT_LEAD_GATE.delaySeconds;
  const scrollPercent = Number.isFinite(Number(gate.scrollPercent))
    ? Number(gate.scrollPercent)
    : PLATFORM_DEFAULT_LEAD_GATE.scrollPercent;
  const allowReturning = gate.allowReturning !== false;
  const bannerUrl = formData.agentProfile?.leadGateBannerUrl || "";

  const card = `rounded-xl border p-5 ${
    isLight ? "bg-white border-gray-200" : "bg-neutral-900/60 border-neutral-800"
  }`;
  const label = `block text-sm font-medium mb-1.5 ${isLight ? "text-gray-700" : "text-gray-300"}`;
  const muted = isLight ? "text-gray-500" : "text-gray-400";

  const summary = !enabled || mode === "off"
    ? "Visitors see the whole post. The registration form is still there, but nothing is held back."
    : mode === "immediate"
    ? "Visitors must register before they can read the post."
    : mode === "delay"
    ? `Visitors can read for ${delaySeconds} second${delaySeconds === 1 ? "" : "s"}, then must register to continue.`
    : `Visitors can read until they are ${scrollPercent}% down the page, then must register to continue.`;

  const handleSave = () => {
    onSave({
      agentProfile: {
        leadGate: { enabled, mode, delaySeconds, scrollPercent, allowReturning },
        leadGateBannerUrl: bannerUrl,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-xl font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>Lead capture</h2>
        <p className={`text-sm ${muted}`}>
          How soon visitors to your open house and listing pages have to register before they can see the rest —
          the photos, the map, recent sales nearby, and the gate code for an open house.
        </p>
      </div>

      <div className={card}>
        <ImageUploadField
          label="Registration gate banner"
          fieldPath="agentProfile.leadGateBannerUrl"
          folder="jpsrealtor/lead-gate-banners"
          value={bannerUrl}
          isLight={isLight}
          saveOnUpload={false}
          helpText="Optional. Shown on all your listing registration gates. Save changes to apply."
          onUploaded={(url) => updateField("agentProfile.leadGateBannerUrl", url)}
        />
      </div>

      {/* Master switch */}
      <div className={card}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => updateField("agentProfile.leadGate.enabled", e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
          />
          <span>
            <span className={`flex items-center gap-2 text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
              <Lock className="h-4 w-4" aria-hidden="true" />
              Ask visitors to register
            </span>
            <span className={`mt-1 block text-xs ${muted}`}>
              Turn this off and your listing posts are fully public.
            </span>
          </span>
        </label>
      </div>

      {enabled && (
        <>
          {/* Mode */}
          <fieldset className={card}>
            <legend className={`${label} px-1`}>When should the wall appear?</legend>
            <div className="space-y-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                const active = mode === m.id;
                return (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                      active
                        ? isLight
                          ? "border-blue-400 bg-blue-50"
                          : "border-emerald-500/50 bg-emerald-500/10"
                        : isLight
                        ? "border-gray-200 hover:bg-gray-50"
                        : "border-neutral-800 hover:bg-neutral-800/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="leadGateMode"
                      value={m.id}
                      checked={active}
                      onChange={() => updateField("agentProfile.leadGate.mode", m.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-emerald-500"
                    />
                    <span className="min-w-0">
                      <span className={`flex items-center gap-2 text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {m.label}
                      </span>
                      <span className={`mt-0.5 block text-xs ${muted}`}>{m.blurb}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {mode === "delay" && (
            <div className={card}>
              <label htmlFor="lg-delay" className={label}>
                Seconds of reading first
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="lg-delay"
                  type="range"
                  min={0}
                  max={120}
                  step={5}
                  value={delaySeconds}
                  onChange={(e) => updateField("agentProfile.leadGate.delaySeconds", Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className={`w-16 text-right text-sm font-semibold tabular-nums ${isLight ? "text-gray-900" : "text-white"}`}>
                  {delaySeconds}s
                </span>
              </div>
              <p className={`mt-2 text-xs ${muted}`}>
                0 is the same as &ldquo;right away&rdquo;. Around 20 seconds is long enough to see the photos and the
                price, which is what makes registering feel worth it.
              </p>
            </div>
          )}

          {mode === "scroll" && (
            <div className={card}>
              <label htmlFor="lg-scroll" className={label}>
                How far down the page
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="lg-scroll"
                  type="range"
                  min={5}
                  max={95}
                  step={5}
                  value={scrollPercent}
                  onChange={(e) => updateField("agentProfile.leadGate.scrollPercent", Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className={`w-16 text-right text-sm font-semibold tabular-nums ${isLight ? "text-gray-900" : "text-white"}`}>
                  {scrollPercent}%
                </span>
              </div>
            </div>
          )}

          {/* Returning contacts */}
          <div className={card}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowReturning}
                onChange={(e) => updateField("agentProfile.leadGate.allowReturning", e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
              />
              <span>
                <span className={`block text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                  Don&rsquo;t ask people already in my CRM
                </span>
                <span className={`mt-1 block text-xs ${muted}`}>
                  Someone who registered for one of your homes goes straight through on the next one. Turn this off and
                  they register again for every post.
                </span>
              </span>
            </label>
          </div>
        </>
      )}

      {/* Plain-language summary */}
      <div
        className={`rounded-xl border p-4 text-sm ${
          isLight ? "border-blue-200 bg-blue-50 text-blue-900" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        }`}
      >
        <strong className="font-semibold">On your listing posts: </strong>
        {summary}
      </div>

      <p className={`text-xs ${muted}`}>
        Any single post can override this from the CMS when you set it up. Posts you have not changed follow whatever you
        pick here.
      </p>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {isSaving ? "Saving…" : "Save lead capture"}
      </button>
    </div>
  );
}
