"use client";

import { Loader2 } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface LoadingGlobeProps {
  message?: string;
  size?: number;
}

export default function LoadingGlobe({
  message = "Loading...",
  size = 120
}: LoadingGlobeProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Animated Globe Icon */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer rotating ring */}
        <div className={`absolute inset-0 rounded-full border-4 ${
          isLight ? 'border-blue-200' : 'border-emerald-900'
        }`} style={{
          animation: 'spin 3s linear infinite'
        }} />

        {/* Middle pulsing ring */}
        <div className={`absolute inset-2 rounded-full ${
          isLight ? 'bg-blue-100' : 'bg-emerald-950'
        }`} style={{
          animation: 'pulse 2s ease-in-out infinite'
        }} />

        {/* Inner globe with gradient */}
        <div className={`absolute inset-4 rounded-full flex items-center justify-center ${
          isLight
            ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
            : 'bg-gradient-to-br from-emerald-500 to-teal-500'
        }`} style={{
          boxShadow: isLight
            ? '0 0 30px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.2)'
            : '0 0 30px rgba(16, 185, 129, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1)'
        }}>
          {/* Globe meridian lines */}
          <div className="absolute inset-0 rounded-full" style={{
            background: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent ${size * 0.08}px,
              rgba(255, 255, 255, 0.1) ${size * 0.08}px,
              rgba(255, 255, 255, 0.1) ${size * 0.09}px
            )`,
            animation: 'spin 8s linear infinite'
          }} />

          {/* Globe latitude lines */}
          <div className="absolute inset-0 rounded-full" style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent ${size * 0.08}px,
              rgba(255, 255, 255, 0.1) ${size * 0.08}px,
              rgba(255, 255, 255, 0.1) ${size * 0.09}px
            )`
          }} />

          {/* Center dot */}
          <div className="w-2 h-2 bg-white rounded-full shadow-lg" />
        </div>
      </div>

      {/* Loading Text */}
      <p className={`text-base font-medium ${
        isLight ? "text-gray-700" : "text-gray-300"
      }`}>
        {message}
      </p>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
