"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
import { useTheme } from "@/app/contexts/ThemeContext";
import {
  UserCircle,
  Palette,
  Camera,
  FileText,
  Share2,
  Globe,
  MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SettingsStep =
  | "identity"
  | "branding"
  | "photos"
  | "content"
  | "social"
  | "domain"
  | "areas";

interface SettingsStepIndicatorProps {
  currentStep: SettingsStep;
  completedSteps: SettingsStep[];
  onStepClick?: (step: SettingsStep) => void;
}

const STEPS: { id: SettingsStep; label: string; icon: LucideIcon }[] = [
  { id: "identity", label: "Identity", icon: UserCircle },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "content", label: "Content", icon: FileText },
  { id: "social", label: "Social", icon: Share2 },
  { id: "domain", label: "Domain & SEO", icon: Globe },
  { id: "areas", label: "Service Areas", icon: MapPin },
];

export { STEPS };

export default function SettingsStepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: SettingsStepIndicatorProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full py-4 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[640px]">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = index < currentIndex;
          const isClickable =
            (index < currentIndex || isCompleted) && step.id !== currentStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => {
                    if (isClickable && onStepClick) onStepClick(step.id);
                  }}
                  disabled={!isClickable}
                  className={`
                    w-11 h-11 rounded-full flex items-center justify-center
                    transition-all duration-200
                    ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? isLight
                          ? "bg-blue-500 text-white ring-4 ring-blue-200"
                          : "bg-blue-600 text-white ring-4 ring-blue-800"
                        : isPast
                        ? isLight
                          ? "bg-gray-300 text-gray-600"
                          : "bg-gray-600 text-gray-400"
                        : isLight
                        ? "bg-gray-200 text-gray-400"
                        : "bg-gray-700 text-gray-500"
                    }
                    ${
                      isClickable
                        ? "cursor-pointer hover:scale-110 hover:shadow-lg"
                        : "cursor-default"
                    }
                  `}
                  title={isClickable ? `Go to ${step.label}` : undefined}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </button>
                <span
                  className={`
                    mt-1.5 text-xs font-medium whitespace-nowrap
                    ${
                      isCurrent
                        ? isLight
                          ? "text-blue-600"
                          : "text-blue-400"
                        : isCompleted
                        ? "text-green-600"
                        : isLight
                        ? "text-gray-500"
                        : "text-gray-400"
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-3 relative"
                  style={{ top: "-12px" }}
                >
                  <div
                    className={`
                      h-full rounded-full transition-all duration-300
                      ${
                        isPast || isCompleted
                          ? "bg-green-500"
                          : isLight
                          ? "bg-gray-200"
                          : "bg-gray-700"
                      }
                    `}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
