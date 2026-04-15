"use client";

import { useState } from "react";
import { Save, Loader2, X, Plus } from "lucide-react";

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

  const ap = formData.agentProfile || {};
  const specializations: string[] = ap.specializations || [];
  const certifications: Certification[] = ap.certifications || [];

  // Local state for new specialization input
  const [specInput, setSpecInput] = useState("");

  // Local state for new certification inputs
  const [certName, setCertName] = useState("");
  const [certIssuedBy, setCertIssuedBy] = useState("");
  const [certYear, setCertYear] = useState("");

  const addSpecialization = () => {
    const value = specInput.trim();
    if (!value || specializations.includes(value)) return;
    updateField("agentProfile.specializations", [...specializations, value]);
    setSpecInput("");
  };

  const removeSpecialization = (index: number) => {
    updateField(
      "agentProfile.specializations",
      specializations.filter((_, i) => i !== index)
    );
  };

  const handleSpecKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSpecialization();
    }
  };

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

  const removeCertification = (index: number) => {
    updateField(
      "agentProfile.certifications",
      certifications.filter((_, i) => i !== index)
    );
  };

  const handleSave = () => {
    onSave({
      agentProfile: {
        specializations,
        certifications,
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
        Specializations &amp; Certifications
      </h2>
      <p
        className={`text-sm mb-6 ${
          isLight ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Highlight your expertise and professional credentials.
      </p>

      <div className="space-y-8">
        {/* Specializations */}
        <div>
          <label className={labelClass}>Specializations</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={specInput}
              onChange={(e) => setSpecInput(e.target.value)}
              onKeyDown={handleSpecKeyDown}
              placeholder="Type a specialization and press Enter"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addSpecialization}
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

          {/* Chips */}
          {specializations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {specializations.map((spec, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                    isLight
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-emerald-950/40 text-emerald-300 border border-emerald-800"
                  }`}
                >
                  {spec}
                  <button
                    type="button"
                    onClick={() => removeSpecialization(index)}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Certifications */}
        <div>
          <label className={labelClass}>Certifications</label>
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

          {/* Certification List */}
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

        {/* Placeholder for future features */}
        <div
          className={`rounded-lg border border-dashed p-4 text-center ${
            isLight
              ? "border-gray-300 text-gray-400"
              : "border-gray-700 text-gray-500"
          }`}
        >
          <p className="text-sm">
            Service areas and business hours coming soon.
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
