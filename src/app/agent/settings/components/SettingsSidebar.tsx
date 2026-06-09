"use client";

import { useState, useCallback } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { toast } from "react-toastify";
import { STEPS, type SettingsStep } from "./SettingsStepIndicator";
import IdentityStep from "./steps/IdentityStep";
import BrandingStep from "./steps/BrandingStep";
import PhotosMediaStep from "./steps/PhotosMediaStep";
import ContentStoryStep from "./steps/ContentStoryStep";
import HighlightsStep from "./steps/HighlightsStep";
import SocialMediaStep from "./steps/SocialMediaStep";
import DomainSeoStep from "./steps/DomainSeoStep";
import ServiceAreasStep from "./steps/ServiceAreasStep";
import CalendarStep from "./steps/CalendarStep";
import GoogleBusinessStep from "./steps/GoogleBusinessStep";
import IntegrationsStep from "./steps/IntegrationsStep";
import AdAccountsSetup from "@/app/components/campaigns/AdAccountsSetup";

interface SettingsSidebarProps {
  initialData: any;
}

export default function SettingsSidebar({ initialData }: SettingsSidebarProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [activeSection, setActiveSection] = useState<SettingsStep>("identity");
  const [formData, setFormData] = useState<any>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  const updateField = useCallback((path: string, value: any) => {
    setFormData((prev: any) => {
      const keys = path.split(".");
      const updated = { ...prev };
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...(obj[keys[i]] || {}) };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  }, []);

  const saveStep = async (stepFields: Record<string, any>): Promise<void> => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepFields),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Saved");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const stepProps = {
    formData,
    updateField,
    isLight,
    onSave: saveStep,
    isSaving,
  };

  const renderPanel = () => {
    switch (activeSection) {
      case "identity":
        return <IdentityStep {...stepProps} />;
      case "branding":
        return <BrandingStep {...stepProps} />;
      case "photos":
        return <PhotosMediaStep {...stepProps} />;
      case "content":
        return <ContentStoryStep {...stepProps} />;
      case "highlights":
        return <HighlightsStep {...stepProps} />;
      case "social":
        return <SocialMediaStep {...stepProps} />;
      case "domain":
        return <DomainSeoStep {...stepProps} />;
      case "areas":
        return <ServiceAreasStep {...stepProps} />;
      case "calendar":
        return <CalendarStep {...stepProps} />;
      case "gbp":
        return <GoogleBusinessStep {...stepProps} />;
      case "integrations":
        return (
          <div className="space-y-6">
            <div>
              <h2 className={`text-2xl font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>Integrations</h2>
              <p className={`text-sm mt-1 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                Connect AI assistants and marketing accounts ChatRealty can act on for your campaigns.
              </p>
            </div>

            {/* AI Assistants — bring-your-own-key + desktop skill */}
            <IntegrationsStep {...stepProps} />

            {/* Ad accounts — Google / Meta / GBP */}
            <div className="pt-4">
              <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                Ad accounts
              </h3>
              <AdAccountsSetup />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Sidebar */}
      <nav
        className={`hidden md:block w-56 flex-shrink-0 rounded-xl border p-3 self-start sticky top-4 ${
          isLight
            ? "bg-white/80 border-gray-200"
            : "bg-gray-800/60 border-gray-700"
        }`}
      >
        <ul className="space-y-1">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = activeSection === step.id;

            return (
              <li key={step.id}>
                <button
                  onClick={() => setActiveSection(step.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                    isActive
                      ? isLight
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-blue-900/30 text-blue-300 border border-blue-800"
                      : isLight
                      ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive
                        ? isLight
                          ? "text-blue-600"
                          : "text-blue-400"
                        : ""
                    }`}
                  />
                  {step.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile section selector */}
      <div className="md:hidden w-full mb-4">
        <select
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value as SettingsStep)}
          className={`w-full px-4 py-3 rounded-lg border text-sm font-medium ${
            isLight
              ? "bg-white border-gray-300 text-gray-900"
              : "bg-gray-800 border-gray-700 text-white"
          }`}
        >
          {STEPS.map((step) => (
            <option key={step.id} value={step.id}>
              {step.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content Panel */}
      <div className="flex-1 min-w-0">{renderPanel()}</div>
    </div>
  );
}
