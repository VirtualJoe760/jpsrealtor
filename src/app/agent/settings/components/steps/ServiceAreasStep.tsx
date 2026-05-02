"use client";

import { useState } from "react";
import { Save, Loader2, X, Plus, MapPin, Sparkles } from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

interface Certification {
  name: string;
  issuedBy: string;
  year: string;
}

interface ServiceArea {
  name: string;
  type: "city" | "county" | "zip" | "custom";
}

const COMMON_SPECIALIZATIONS = [
  "Luxury Homes",
  "First-Time Buyers",
  "Investment Properties",
  "Relocation",
  "New Construction",
  "Condos & Townhomes",
  "Waterfront Properties",
  "Commercial Real Estate",
  "Land & Lots",
  "Senior Living",
  "Military/VA",
  "Short Sales & Foreclosures",
  "Property Management",
  "Vacation Homes",
  "Green/Eco-Friendly Homes",
  "Historic Homes",
  "Ranch & Farm Properties",
  "Multi-Family",
  "Estate Sales",
  "Golf Communities",
];

const COMMON_CERTIFICATIONS = [
  { name: "ABR - Accredited Buyer's Representative", issuedBy: "NAR" },
  { name: "CRS - Certified Residential Specialist", issuedBy: "RRC" },
  { name: "GRI - Graduate, REALTOR Institute", issuedBy: "NAR" },
  { name: "SRES - Seniors Real Estate Specialist", issuedBy: "NAR" },
  { name: "SRS - Seller Representative Specialist", issuedBy: "RRC" },
  { name: "CLHMS - Certified Luxury Home Marketing Specialist", issuedBy: "ILHM" },
  { name: "CNE - Certified Negotiation Expert", issuedBy: "AREN" },
  { name: "e-PRO", issuedBy: "NAR" },
  { name: "MRP - Military Relocation Professional", issuedBy: "NAR" },
  { name: "PSA - Pricing Strategy Advisor", issuedBy: "NAR" },
  { name: "RENE - Real Estate Negotiation Expert", issuedBy: "ABR" },
  { name: "C2EX - Commitment to Excellence", issuedBy: "NAR" },
];

const AREA_TYPES: { value: ServiceArea["type"]; label: string }[] = [
  { value: "city", label: "City" },
  { value: "county", label: "County" },
  { value: "zip", label: "ZIP Code" },
  { value: "custom", label: "Custom" },
];

export default function ServiceAreasStep({
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

  const chipClass = (active: boolean) =>
    `inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
      active
        ? isLight
          ? "bg-blue-100 text-blue-700 border border-blue-300"
          : "bg-emerald-950/50 text-emerald-300 border border-emerald-700"
        : isLight
        ? "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
        : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
    }`;

  const ap = formData.agentProfile || {};
  const serviceAreas: ServiceArea[] = ap.serviceAreas || [];
  const specializations: string[] = ap.specializations || [];
  const certifications: Certification[] = ap.certifications || [];
  const bio: string = ap.bio || "";

  // Service area state
  const [areaName, setAreaName] = useState("");
  const [areaType, setAreaType] = useState<ServiceArea["type"]>("city");

  // Specialization state
  const [specInput, setSpecInput] = useState("");

  // Certification state
  const [certName, setCertName] = useState("");
  const [certIssuedBy, setCertIssuedBy] = useState("");
  const [certYear, setCertYear] = useState("");

  // ---------- Service Areas ----------
  const addServiceArea = () => {
    const name = areaName.trim();
    if (!name || serviceAreas.some((a) => a.name.toLowerCase() === name.toLowerCase())) return;
    updateField("agentProfile.serviceAreas", [...serviceAreas, { name, type: areaType }]);
    setAreaName("");
  };

  const removeServiceArea = (index: number) => {
    updateField("agentProfile.serviceAreas", serviceAreas.filter((_, i) => i !== index));
  };

  const handleAreaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addServiceArea();
    }
  };

  // ---------- Specializations ----------
  const toggleSpecialization = (spec: string) => {
    if (specializations.includes(spec)) {
      updateField("agentProfile.specializations", specializations.filter((s) => s !== spec));
    } else {
      updateField("agentProfile.specializations", [...specializations, spec]);
    }
  };

  const addCustomSpecialization = () => {
    const value = specInput.trim();
    if (!value || specializations.includes(value)) return;
    updateField("agentProfile.specializations", [...specializations, value]);
    setSpecInput("");
  };

  const handleSpecKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomSpecialization();
    }
  };

  // ---------- Certifications ----------
  const addCertification = () => {
    if (!certName.trim()) return;
    const newCert: Certification = {
      name: certName.trim(),
      issuedBy: certIssuedBy.trim(),
      year: certYear.trim(),
    };
    updateField("agentProfile.certifications", [...certifications, newCert]);
    setCertName("");
    setCertIssuedBy("");
    setCertYear("");
  };

  const addCommonCertification = (cert: { name: string; issuedBy: string }) => {
    if (certifications.some((c) => c.name === cert.name)) return;
    updateField("agentProfile.certifications", [
      ...certifications,
      { name: cert.name, issuedBy: cert.issuedBy, year: "" },
    ]);
  };

  const removeCertification = (index: number) => {
    updateField("agentProfile.certifications", certifications.filter((_, i) => i !== index));
  };

  // ---------- Save ----------
  const handleSave = () => {
    onSave({
      agentProfile: {
        serviceAreas,
        specializations,
        certifications,
        bio,
      },
    });
  };

  return (
    <div
      className={`rounded-xl border p-6 ${
        isLight ? "bg-white border-gray-200" : "bg-gray-900/60 border-gray-800"
      }`}
    >
      <h2 className={`text-xl font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>
        Service Areas, Expertise &amp; Bio
      </h2>
      <p className={`text-sm mb-6 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
        Define where you work, your expertise, and a short bio for AI-generated content.
      </p>

      <div className="space-y-8">
        {/* ============ Service Areas ============ */}
        <div>
          <label className={labelClass}>
            <MapPin className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Service Areas
          </label>
          <p className={`text-xs mb-3 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            Add the cities, counties, or ZIP codes you serve. AI articles will reference these areas.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              onKeyDown={handleAreaKeyDown}
              placeholder="e.g. Portland, Bend, Clackamas County"
              className={inputClass}
            />
            <select
              value={areaType}
              onChange={(e) => setAreaType(e.target.value as ServiceArea["type"])}
              className={`w-32 px-3 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                isLight
                  ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                  : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
              }`}
            >
              {AREA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addServiceArea}
              disabled={!areaName.trim()}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                isLight
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {serviceAreas.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {serviceAreas.map((area, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                    isLight
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-emerald-950/40 text-emerald-300 border border-emerald-800"
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  {area.name}
                  <span className={`text-xs ${isLight ? "text-blue-400" : "text-emerald-500"}`}>
                    ({area.type})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeServiceArea(index)}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ============ Specializations ============ */}
        <div>
          <label className={labelClass}>Specializations</label>
          <p className={`text-xs mb-3 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            Select from common specializations or add your own.
          </p>

          {/* Common suggestions */}
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_SPECIALIZATIONS.map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => toggleSpecialization(spec)}
                className={chipClass(specializations.includes(spec))}
              >
                {specializations.includes(spec) ? (
                  <X className="w-3 h-3" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                {spec}
              </button>
            ))}
          </div>

          {/* Custom specialization input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={specInput}
              onChange={(e) => setSpecInput(e.target.value)}
              onKeyDown={handleSpecKeyDown}
              placeholder="Add a custom specialization"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addCustomSpecialization}
              disabled={!specInput.trim()}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                isLight
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Custom specs that aren't in the common list */}
          {specializations.filter((s) => !COMMON_SPECIALIZATIONS.includes(s)).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {specializations
                .filter((s) => !COMMON_SPECIALIZATIONS.includes(s))
                .map((spec) => (
                  <span
                    key={spec}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                      isLight
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-emerald-950/40 text-emerald-300 border border-emerald-800"
                    }`}
                  >
                    {spec}
                    <button
                      type="button"
                      onClick={() => toggleSpecialization(spec)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* ============ Certifications ============ */}
        <div>
          <label className={labelClass}>Certifications</label>
          <p className={`text-xs mb-3 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            Quick-add common certifications or enter your own.
          </p>

          {/* Quick-add common certs */}
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_CERTIFICATIONS.filter(
              (cc) => !certifications.some((c) => c.name === cc.name)
            ).map((cc) => (
              <button
                key={cc.name}
                type="button"
                onClick={() => addCommonCertification(cc)}
                className={chipClass(false)}
              >
                <Plus className="w-3 h-3" />
                {cc.name.split(" - ")[0]}
              </button>
            ))}
          </div>

          {/* Custom certification input */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={certName}
              onChange={(e) => setCertName(e.target.value)}
              placeholder="Certification name"
              className={inputClass}
            />
            <input
              type="text"
              value={certIssuedBy}
              onChange={(e) => setCertIssuedBy(e.target.value)}
              placeholder="Issued by"
              className={inputClass}
            />
            <input
              type="text"
              value={certYear}
              onChange={(e) => setCertYear(e.target.value)}
              placeholder="Year"
              className={`w-full sm:w-28 px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                isLight
                  ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                  : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
              }`}
            />
            <button
              type="button"
              onClick={addCertification}
              disabled={!certName.trim()}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-40 ${
                isLight
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              Add
            </button>
          </div>

          {/* Certification list */}
          {certifications.length > 0 && (
            <div className="mt-3 space-y-2">
              {certifications.map((cert, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    isLight
                      ? "bg-gray-50 border-gray-200"
                      : "bg-gray-800/50 border-gray-700"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm font-medium ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {cert.name}
                    </span>
                    {(cert.issuedBy || cert.year) && (
                      <span
                        className={`text-xs ml-2 ${
                          isLight ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {[cert.issuedBy, cert.year].filter(Boolean).join(" - ")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCertification(index)}
                    className={`ml-3 p-1 rounded hover:opacity-70 transition-opacity ${
                      isLight ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============ Agent Bio ============ */}
        <div>
          <label className={labelClass}>
            <Sparkles className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            AI Bio
          </label>
          <p className={`text-xs mb-3 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            A short bio about you that the AI will reference when generating articles, emails, and
            chat responses. Include your experience, personality, and what makes you unique.
          </p>
          <textarea
            value={bio}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                updateField("agentProfile.bio", e.target.value);
              }
            }}
            placeholder="e.g. I'm a 15-year veteran of the Oregon real estate market, specializing in helping families find their forever homes in the Portland metro area. I'm known for my patient, educational approach — I love helping first-time buyers understand every step of the process."
            rows={4}
            className={inputClass}
          />
          <p className={`text-xs mt-1.5 text-right ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            {bio.length}/500
          </p>
        </div>
      </div>

      {/* Save & Finish */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 ${
            isLight
              ? "bg-green-600 hover:bg-green-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save &amp; Finish
        </button>
      </div>
    </div>
  );
}
