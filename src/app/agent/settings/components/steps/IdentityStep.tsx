"use client";

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

  const handleSave = () => {
    onSave({
      name: formData.name,
      phone: formData.phone,
      licenseNumber: formData.licenseNumber,
      agentProfile: {
        siteName: formData.agentProfile?.siteName,
        cellPhone: formData.agentProfile?.cellPhone,
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
            placeholder="chatRealty"
            className={inputClass}
          />
          <p className={`text-xs mt-1 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            Displayed on your chat page. Defaults to &quot;chatRealty&quot; if left blank.
          </p>
        </div>
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
