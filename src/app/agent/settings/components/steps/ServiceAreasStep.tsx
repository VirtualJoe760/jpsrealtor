"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Save, Loader2, X, Plus, MapPin, Sparkles } from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

interface ServiceArea {
  name: string;
  type: "city" | "county" | "zip" | "custom";
}

interface CitySuggestion {
  name: string;
  county?: string;
  region?: string;
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
  const bio: string = ap.bio || "";

  // Service area state
  const [areaInput, setAreaInput] = useState("");
  const [areaType, setAreaType] = useState<ServiceArea["type"]>("city");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Specialization state
  const [specInput, setSpecInput] = useState("");

  // ---------- City Autocomplete ----------
  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cities/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.cities || []);
          setShowSuggestions(true);
          setActiveSuggestion(-1);
        }
      } catch {}
    }, 200);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addArea = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || serviceAreas.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) return;
    updateField("agentProfile.serviceAreas", [...serviceAreas, { name: trimmed, type: areaType }]);
  };

  const handleAreaInputChange = (value: string) => {
    // Check for comma — add everything before the comma as an area
    if (value.includes(",")) {
      const parts = value.split(",");
      // Add all complete parts (before last comma)
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i].trim();
        if (part) addArea(part);
      }
      // Keep the part after the last comma as the current input
      const remaining = parts[parts.length - 1];
      setAreaInput(remaining);
      fetchSuggestions(remaining.trim());
    } else {
      setAreaInput(value);
      fetchSuggestions(value.trim());
    }
  };

  const selectSuggestion = (city: CitySuggestion) => {
    addArea(city.name);
    setAreaInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleAreaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (showSuggestions && activeSuggestion >= 0 && suggestions[activeSuggestion]) {
        selectSuggestion(suggestions[activeSuggestion]);
      } else if (areaInput.trim()) {
        addArea(areaInput.trim());
        setAreaInput("");
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else if (e.key === "ArrowDown" && showSuggestions) {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && showSuggestions) {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const removeServiceArea = (index: number) => {
    updateField("agentProfile.serviceAreas", serviceAreas.filter((_, i) => i !== index));
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

  // ---------- Save ----------
  const handleSave = () => {
    // Flush any remaining text in the area input
    if (areaInput.trim()) {
      addArea(areaInput.trim());
      setAreaInput("");
    }
    onSave({
      agentProfile: {
        serviceAreas,
        specializations,
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
            Start typing a city name to search. Press comma or Enter to add. AI articles will reference these areas.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={areaInput}
                onChange={(e) => handleAreaInputChange(e.target.value)}
                onKeyDown={handleAreaKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder="Type a city name..."
                className={inputClass}
              />
              {/* Autocomplete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className={`absolute z-50 left-0 right-0 mt-1 rounded-lg border shadow-lg max-h-60 overflow-y-auto ${
                    isLight
                      ? "bg-white border-gray-200"
                      : "bg-gray-800 border-gray-700"
                  }`}
                >
                  {suggestions.map((city, i) => (
                    <button
                      key={`${city.name}-${i}`}
                      type="button"
                      onClick={() => selectSuggestion(city)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        i === activeSuggestion
                          ? isLight
                            ? "bg-blue-50 text-blue-700"
                            : "bg-emerald-900/30 text-emerald-300"
                          : isLight
                          ? "text-gray-900 hover:bg-gray-50"
                          : "text-white hover:bg-gray-700"
                      }`}
                    >
                      <span className="font-medium">{city.name}</span>
                      {city.county && (
                        <span className={`ml-2 text-xs ${isLight ? "text-gray-400" : "text-gray-500"}`}>
                          {city.county}{city.region ? ` · ${city.region}` : ""}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select
              value={areaType}
              onChange={(e) => setAreaType(e.target.value as ServiceArea["type"])}
              className={`w-28 px-3 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                isLight
                  ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                  : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
              }`}
            >
              {AREA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
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
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 bg-green-600 hover:bg-green-700"
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
