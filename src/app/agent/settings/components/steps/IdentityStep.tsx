"use client";

import LogoUploadField from "../LogoUploadField";

import { Loader2 } from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}


export default function IdentityStep({
  formData,
  updateField,
  isLight,
  onSave,
  isSaving,
}: StepProps) {
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;

  const labelClass = `block text-sm font-medium mb-1.5 ${
    isLight ? "text-gray-700" : "text-gray-300"
  }`;

  // Default solo: every licensed agent has a brokerage, not every agent has a
  // team. See docs/agent-identity/README.md.
  const affiliation: "solo" | "team" = formData.agentProfile?.affiliation === "team" ? "team" : "solo";

  const handleSave = () => {
    onSave({
      name: formData.name,
      phone: formData.phone,
      licenseNumber: formData.licenseNumber,
      agentProfile: {
        siteName: formData.agentProfile?.siteName,
        cellPhone: formData.agentProfile?.cellPhone,
        affiliation,
        brokerage: formData.agentProfile?.brokerage,
        // Going solo must CLEAR the team, not just hide it: /api/agent-branding
        // suppresses team fields when affiliation !== "team", but a stale
        // teamName left in the document reappears the moment someone flips
        // back. Clear it at the source.
        ...(affiliation === "solo" ? { teamName: "" } : {}),
      },
    });
  };

  return (
    <div
      className={`rounded-xl border p-6 ${
        isLight
          ? "bg-white border-gray-200"
          : "bg-gray-900/60 border-gray-800"
      }`}
    >
      <h2
        className={`text-xl font-bold mb-1 ${
          isLight ? "text-gray-900" : "text-white"
        }`}
      >
        Identity &amp; Contact
      </h2>
      <p
        className={`text-sm mb-6 ${
          isLight ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Your basic info and how clients can reach you.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name */}
        <div>
          <label className={labelClass}>Full Name</label>
          <input
            type="text"
            value={formData.name || ""}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="John Doe"
            className={inputClass}
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={formData.email || ""}
            readOnly
            className={`${inputClass} opacity-60 cursor-not-allowed`}
          />
        </div>

        {/* Phone */}
        <div>
          <label className={labelClass}>Phone</label>
          <input
            type="tel"
            value={formData.phone || ""}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="(555) 123-4567"
            className={inputClass}
          />
        </div>

        {/* Cell Phone */}
        <div>
          <label className={labelClass}>Cell Phone</label>
          <input
            type="tel"
            value={formData.agentProfile?.cellPhone || ""}
            onChange={(e) =>
              updateField("agentProfile.cellPhone", e.target.value)
            }
            placeholder="(555) 987-6543"
            className={inputClass}
          />
        </div>

        {/* License Number */}
        <div>
          <label className={labelClass}>License Number</label>
          <input
            type="text"
            value={formData.licenseNumber || ""}
            onChange={(e) => updateField("licenseNumber", e.target.value)}
            placeholder="01234567"
            className={inputClass}
          />
        </div>

        {/* Site Name */}
        <div className="md:col-span-2">
          <label className={labelClass}>Site Name</label>
          <input
            type="text"
            value={formData.agentProfile?.siteName || ""}
            onChange={(e) => updateField("agentProfile.siteName", e.target.value)}
            placeholder={formData.name || "Your name"}
            className={inputClass}
          />
          <p className={`text-xs mt-1 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            Displayed on your chat page. Defaults to your name if left blank.
          </p>
        </div>

        {/* Affiliation — solo or team. Brokerage is required either way. */}
        <div className="md:col-span-2 pt-2">
          <label className={labelClass}>Affiliation</label>
          <div className="flex gap-3">
            {([
              { id: "solo", label: "Solo agent", desc: "You work under a brokerage, with no team" },
              { id: "team", label: "On a team", desc: "You work under a brokerage, as part of a team" },
            ] as const).map((opt) => {
              const active = affiliation === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateField("agentProfile.affiliation", opt.id)}
                  className={`flex-1 text-left px-4 py-3 rounded-lg border transition-colors ${
                    active
                      ? isLight
                        ? "bg-blue-50 border-blue-500 text-gray-900"
                        : "bg-emerald-600/15 border-emerald-500 text-white"
                      : isLight
                        ? "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
                  }`}
                >
                  <span className="block text-sm font-semibold">{opt.label}</span>
                  <span className={`block text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Team name — only meaningful when affiliation === "team". */}
        {affiliation === "team" && (
          <div className="md:col-span-2">
            <label className={labelClass}>Team Name</label>
            <input
              type="text"
              value={formData.agentProfile?.teamName || ""}
              onChange={(e) => updateField("agentProfile.teamName", e.target.value)}
              placeholder="Your team name"
              className={inputClass}
            />
          </div>
        )}

        {/* Brokerage — present for solo AND team. */}
        <div className="md:col-span-2 pt-2">
          <h3 className={`text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
            Brokerage
          </h3>
          <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
            Shown on your site and in the required agency treatment. Every licensed
            agent has a brokerage, whether or not they are on a team.
          </p>
        </div>

        <div>
          <label className={labelClass}>Brokerage Name</label>
          <input
            type="text"
            value={formData.agentProfile?.brokerage?.name || ""}
            onChange={(e) => updateField("agentProfile.brokerage.name", e.target.value)}
            placeholder="Your brokerage, as clients see it"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Legal Entity Name</label>
          <input
            type="text"
            value={formData.agentProfile?.brokerage?.legalName || ""}
            onChange={(e) => updateField("agentProfile.brokerage.legalName", e.target.value)}
            placeholder="Registered legal entity, e.g. Example Realty Group, Inc."
            className={inputClass}
          />
          <p className={`text-xs mt-1 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            Used in legal and compliance copy. Defaults to the brokerage name.
          </p>
        </div>

        <div>
          <label className={labelClass}>Brokerage License #</label>
          <input
            type="text"
            value={formData.agentProfile?.brokerage?.licenseNumber || ""}
            onChange={(e) => updateField("agentProfile.brokerage.licenseNumber", e.target.value)}
            placeholder="02022092"
            className={inputClass}
          />
          <p className={`text-xs mt-1 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            The brokerage&apos;s licence — not yours.
          </p>
        </div>

        <div>
          <label className={labelClass}>Brokerage Phone</label>
          <input
            type="tel"
            value={formData.agentProfile?.brokerage?.phone || ""}
            onChange={(e) => updateField("agentProfile.brokerage.phone", e.target.value)}
            placeholder="(555) 123-4567"
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Brokerage Address</label>
          <input
            type="text"
            value={formData.agentProfile?.brokerage?.address || ""}
            onChange={(e) => updateField("agentProfile.brokerage.address", e.target.value)}
            placeholder="Your brokerage's office address"
            className={inputClass}
          />
        </div>

        <LogoUploadField
          label="Brokerage Logo"
          hint="Shown on your hero banner and your landing-page footer. Upload your brokerage's mark — a PNG with a transparent background works best."
          lightValue={formData.agentProfile?.brokerage?.logo}
          darkValue={formData.agentProfile?.brokerage?.logoDark}
          isLight={isLight}
          onChange={(variant, url) =>
            updateField(
              variant === "light" ? "agentProfile.brokerage.logo" : "agentProfile.brokerage.logoDark",
              url
            )
          }
        />
      </div>

      {/* Save & Continue */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 ${
            isLight
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save &amp; Continue
        </button>
      </div>
    </div>
  );
}
