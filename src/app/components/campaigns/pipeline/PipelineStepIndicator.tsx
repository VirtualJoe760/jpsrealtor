'use client';

import { CheckIcon } from '@heroicons/react/24/solid';
import { useTheme } from '@/app/contexts/ThemeContext';

export type PipelineStep = 'contacts' | 'scripts' | 'review' | 'audio' | 'send';

interface PipelineStepIndicatorProps {
  currentStep: PipelineStep;
  completedSteps: PipelineStep[];
  onStepClick?: (step: PipelineStep) => void;
}

const STEPS: { id: PipelineStep; label: string; icon: string }[] = [
  { id: 'contacts', label: 'Contacts', icon: '👥' },
  { id: 'scripts', label: 'Scripts', icon: '📝' },
  { id: 'review', label: 'Review', icon: '✏️' },
  { id: 'audio', label: 'Audio', icon: '🎤' },
  { id: 'send', label: 'Send', icon: '📤' },
];

export default function PipelineStepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: PipelineStepIndicatorProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  const handleStepClick = (step: PipelineStep, index: number) => {
    // Only allow clicking on completed steps or steps before the current step
    const isClickable = index < currentIndex || completedSteps.includes(step);
    if (isClickable && onStepClick && step !== currentStep) {
      onStepClick(step);
    }
  };

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = index < currentIndex;
          const isClickable = (index < currentIndex || isCompleted) && step.id !== currentStep;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => handleStepClick(step.id as PipelineStep, index)}
                  disabled={!isClickable}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-200
                    ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? isLight
                          ? 'bg-blue-500 text-white ring-4 ring-blue-200'
                          : 'bg-blue-600 text-white ring-4 ring-blue-800'
                        : isPast
                        ? isLight
                          ? 'bg-gray-300 text-gray-600'
                          : 'bg-gray-600 text-gray-400'
                        : isLight
                        ? 'bg-gray-200 text-gray-400'
                        : 'bg-gray-700 text-gray-500'
                    }
                    ${isClickable ? 'cursor-pointer hover:scale-110 hover:shadow-lg' : 'cursor-default'}
                  `}
                  title={isClickable ? `Go to ${step.label}` : undefined}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-6 h-6" />
                  ) : (
                    <span className="text-xl">{step.icon}</span>
                  )}
                </button>
                <span
                  className={`
                    mt-2 text-sm font-medium
                    ${
                      isCurrent
                        ? isLight
                          ? 'text-blue-600'
                          : 'text-blue-400'
                        : isCompleted
                        ? 'text-green-600'
                        : isLight
                        ? 'text-gray-500'
                        : 'text-gray-400'
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-1 mx-4 relative" style={{ top: '-20px' }}>
                  <div
                    className={`
                      h-full rounded-full transition-all duration-300
                      ${
                        isPast || isCompleted
                          ? 'bg-green-500'
                          : isLight
                          ? 'bg-gray-200'
                          : 'bg-gray-700'
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
