"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/app/contexts/ThemeContext";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, SkipForward, Save } from "lucide-react";
import SettingsStepIndicator, {
  STEPS,
  type SettingsStep,
} from "./SettingsStepIndicator";
import IdentityStep from "./steps/IdentityStep";
import BrandingStep from "./steps/BrandingStep";
import PhotosMediaStep from "./steps/PhotosMediaStep";
import ContentStoryStep from "./steps/ContentStoryStep";
import SocialMediaStep from "./steps/SocialMediaStep";
import DomainSeoStep from "./steps/DomainSeoStep";
import ServiceAreasStep from "./steps/ServiceAreasStep";
import GoogleBusinessStep from "./steps/GoogleBusinessStep";
import BillingStep from "./steps/BillingStep";

interface SettingsWizardProps {
  initialData: any;
  isOnboarding?: boolean;
}

export default function SettingsWizard({
  initialData,
  isOnboarding = false,
}: SettingsWizardProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [currentStep, setCurrentStep] = useState<SettingsStep>("identity");
  const [completedSteps, setCompletedSteps] = useState<SettingsStep[]>([]);
  const [formData, setFormData] = useState<any>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

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

  const saveStep = async (stepFields: Record<string, any>) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepFields),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Saved");
      return true;
    } catch {
      toast.error("Failed to save. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps((prev) => [...prev, currentStep]);
      }
      setDirection(1);
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const goToStep = (step: SettingsStep) => {
    const targetIndex = STEPS.findIndex((s) => s.id === step);
    setDirection(targetIndex > currentIndex ? 1 : -1);
    setCurrentStep(step);
  };

  const handleSaveAndContinue = async (stepFields: Record<string, any>) => {
    const success = await saveStep(stepFields);
    if (success) goNext();
  };

  const stepProps = {
    formData,
    updateField,
    isLight,
    onSave: handleSaveAndContinue,
    isSaving,
  };

  const renderStep = () => {
    switch (currentStep) {
      case "identity":
        return <IdentityStep {...stepProps} />;
      case "branding":
        return <BrandingStep {...stepProps} />;
      case "photos":
        return <PhotosMediaStep {...stepProps} />;
      case "content":
        return <ContentStoryStep {...stepProps} />;
      case "social":
        return <SocialMediaStep {...stepProps} />;
      case "domain":
        return <DomainSeoStep {...stepProps} />;
      case "areas":
        return <ServiceAreasStep {...stepProps} />;
      case "gbp":
        return <GoogleBusinessStep {...stepProps} />;
      case "billing":
        return <BillingStep {...stepProps} />;
    }
  };

  const isLastStep = currentIndex === STEPS.length - 1;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Onboarding welcome banner */}
      {isOnboarding && (
        <div
          className={`rounded-xl p-4 mb-6 text-center ${
            isLight
              ? "bg-blue-50 border border-blue-200"
              : "bg-blue-950/30 border border-blue-800"
          }`}
        >
          <h2
            className={`text-lg font-bold ${
              isLight ? "text-blue-800" : "text-blue-300"
            }`}
          >
            Welcome! Let&apos;s set up your agent profile.
          </h2>
          <p
            className={`text-sm mt-1 ${
              isLight ? "text-blue-600" : "text-blue-400"
            }`}
          >
            Complete each step to customize your website branding and presence.
          </p>
        </div>
      )}

      {/* Step Indicator */}
      <SettingsStepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      {/* Step Content */}
      <div className="mt-6 min-h-[400px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pb-8">
        <button
          onClick={goBack}
          disabled={currentIndex === 0}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 ${
            isLight
              ? "text-gray-600 hover:bg-gray-100"
              : "text-gray-400 hover:bg-gray-800"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex gap-3">
          {!isLastStep && (
            <button
              onClick={goNext}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isLight
                  ? "text-gray-500 hover:bg-gray-100"
                  : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              Skip
              <SkipForward className="w-4 h-4" />
            </button>
          )}

          {isLastStep ? (
            <button
              onClick={() => {
                if (!completedSteps.includes(currentStep)) {
                  setCompletedSteps((prev) => [...prev, currentStep]);
                }
                toast.success("Profile setup complete!");
                localStorage.setItem("agent_settings_visited", "true");
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-colors ${
                isLight
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              <Save className="w-4 h-4" />
              Finish Setup
            </button>
          ) : (
            <button
              onClick={goNext}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-colors ${
                isLight
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
