"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface GlobalLoaderProps {
  message?: string;
  submessage?: string;
}

export default function GlobalLoader({
  message = "Loading",
  submessage = "Preparing your experience"
}: GlobalLoaderProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [dots, setDots] = useState(".");

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "." : prev + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-colors duration-300 ${
        isLight
          ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
          : 'bg-gradient-to-br from-gray-900 via-black to-purple-900/20'
      }`}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Spinning Globe */}
        <div className="relative w-32 h-32">
          {/* Outer glow ring */}
          <div className={`absolute inset-0 rounded-full blur-xl opacity-30 ${
            isLight ? 'bg-blue-400' : 'bg-emerald-400'
          }`} />

          {/* Main globe */}
          <div className={`absolute inset-0 rounded-full border-4 ${
            isLight
              ? 'border-blue-200 bg-gradient-to-br from-blue-100 to-blue-50'
              : 'border-emerald-800 bg-gradient-to-br from-gray-800 to-black'
          }`}>
            {/* Latitude lines */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={`lat-${i}`}
                  className={`absolute left-0 right-0 h-[2px] ${
                    isLight ? 'bg-blue-300/40' : 'bg-emerald-500/20'
                  }`}
                  style={{ top: `${20 + i * 15}%` }}
                />
              ))}
            </div>

            {/* Spinning longitude lines */}
            <div className="absolute inset-0 rounded-full animate-spin-slow">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={`long-${i}`}
                  className={`absolute top-0 bottom-0 w-[2px] left-1/2 -translate-x-1/2 ${
                    isLight ? 'bg-blue-300/40' : 'bg-emerald-500/20'
                  }`}
                  style={{ transform: `translateX(-50%) rotateY(${i * 45}deg)` }}
                />
              ))}
            </div>

            {/* Center dot (represents location) */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${
              isLight ? 'bg-blue-500' : 'bg-emerald-400'
            } shadow-lg animate-pulse`} />

            {/* Rotating highlight */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${
              isLight
                ? 'from-blue-400/30 to-transparent'
                : 'from-emerald-400/20 to-transparent'
            } animate-spin`} />
          </div>

          {/* Orbiting dots */}
          <div className="absolute inset-0 animate-spin">
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${
              isLight ? 'bg-blue-500' : 'bg-emerald-400'
            } shadow-lg`} />
          </div>
          <div className="absolute inset-0 animate-spin-reverse">
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${
              isLight ? 'bg-purple-500' : 'bg-purple-400'
            } shadow-lg`} />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-2">
          <h2 className={`text-2xl font-bold ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            {message}{dots}
          </h2>
          <p className={`text-sm ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            {submessage}
          </p>
        </div>

        {/* Brand name */}
        <div className={`text-xs font-semibold tracking-wider ${
          isLight ? 'text-gray-500' : 'text-gray-500'
        }`}>
          JPSREALTOR.COM
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .animate-spin-reverse {
          animation: spin-reverse 6s linear infinite;
        }
      `}</style>
    </div>
  );
}
