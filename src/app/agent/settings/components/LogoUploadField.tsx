"use client";

// A light/dark pair of logo uploads.
//
// This replaces the hardcoded preset grids that used to live in BrandingStep
// and IdentityStep. Those listed specific agencies ("Obsidian Group | eXp",
// "eXp Realty") inside shared platform code, so every tenant on the platform
// was offered one agent's former brokerages and nobody could supply their own.
// That also broke the "no component hardcodes a brokerage" invariant in
// docs/ARCHITECTURE.md. Agents upload their own marks instead.
//
// Two variants are required, not optional: the site has a light/dark toggle,
// and one asset cannot serve both. Chrome-on-black artwork measures ~1.2:1
// contrast on white — invisible. The preview below renders each variant on the
// background it is actually for, so a wrong-way-round upload is obvious here
// rather than on the live site.

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";

type Variant = "light" | "dark";

export default function LogoUploadField({
  label,
  hint,
  lightValue,
  darkValue,
  onChange,
  isLight,
}: {
  label: string;
  hint?: string;
  /** Artwork for LIGHT backgrounds (dark ink). */
  lightValue?: string | null;
  /** Artwork for DARK backgrounds (light ink). */
  darkValue?: string | null;
  onChange: (variant: Variant, url: string | null) => void;
  isLight: boolean;
}) {
  const [busy, setBusy] = useState<Variant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = {
    light: useRef<HTMLInputElement>(null),
    dark: useRef<HTMLInputElement>(null),
  };

  const upload = async (variant: Variant, file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image.");
      return;
    }
    // Logos are small. A huge file here is almost always a photo by mistake.
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo must be under 5 MB.");
      return;
    }
    if (file.type === "image/jpeg") {
      // Not fatal — just the single most common cause of a black box in the nav.
      setError("Heads up: JPEGs have no transparency. A PNG with a transparent background looks right on both themes.");
    }
    setBusy(variant);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("type", "logo");
      body.append("variant", variant);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
      onChange(variant, data.url);
    } catch (e: any) {
      setError(e?.message || "Upload failed.");
    } finally {
      setBusy(null);
    }
  };

  const labelClass = `block text-sm font-medium mb-1.5 ${isLight ? "text-gray-700" : "text-gray-300"}`;

  const slot = (variant: Variant, value: string | null | undefined, caption: string, swatch: string) => (
    <div>
      <p className={`text-xs mb-1.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>{caption}</p>
      <div
        className={`relative flex h-24 items-center justify-center rounded-lg border-2 border-dashed ${
          isLight ? "border-gray-300" : "border-gray-600"
        }`}
        style={{ background: swatch }}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={`${caption} logo`} className="max-h-16 max-w-[85%] object-contain" />
            <button
              type="button"
              onClick={() => onChange(variant, null)}
              aria-label={`Remove ${caption} logo`}
              className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <span className="text-xs text-gray-400">No logo</span>
        )}
      </div>
      <input
        ref={inputs[variant]}
        type="file"
        accept="image/png,image/svg+xml,image/webp,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(variant, f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputs[variant].current?.click()}
        disabled={busy !== null}
        className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
          isLight
            ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            : "border-gray-600 bg-gray-800/60 text-gray-200 hover:bg-gray-700/60"
        }`}
      >
        {busy === variant ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {value ? "Replace" : "Upload"}
      </button>
    </div>
  );

  return (
    <div className="md:col-span-2">
      <label className={labelClass}>{label}</label>
      {hint && <p className={`text-xs mb-2 ${isLight ? "text-gray-500" : "text-gray-400"}`}>{hint}</p>}
      <div className="grid grid-cols-2 gap-3">
        {slot("light", lightValue, "Light mode (dark artwork)", "#ffffff")}
        {slot("dark", darkValue, "Dark mode (light artwork)", "#111827")}
      </div>
      {error && (
        <p className={`mt-2 text-xs ${error.startsWith("Heads up") ? "text-amber-500" : "text-red-500"}`}>{error}</p>
      )}
    </div>
  );
}
