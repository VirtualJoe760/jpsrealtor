"use client";

import { useEffect, useState } from "react";
import StarsCanvas from "./StarsCanvas";
import { useTheme } from "@/app/contexts/ThemeContext";

interface SpaticalBackgroundProps {
  children?: React.ReactNode;
  showGradient?: boolean;
  className?: string;
}

/**
 * Reusable Spatial (starfield) background component - Now theme-aware!
 * Switches between Black Space (stars) and Light Gradient themes
 *
 * Usage:
 * <SpaticalBackground>
 *   <YourPageContent />
 * </SpaticalBackground>
 */
export default function SpaticalBackground({
  children,
  showGradient = true,
  className = ""
}: SpaticalBackgroundProps) {
  const { currentTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isLightMode = currentTheme === "lightgradient";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use default (dark) theme until mounted to avoid hydration mismatch
  const effectiveIsLight = mounted ? isLightMode : false;

  return (
    <div className={`relative ${effectiveIsLight ? 'bg-white' : 'bg-black'} ${className}`} suppressHydrationWarning>
      {/* Theme-aware Background */}
      <div className="fixed inset-0 z-0" suppressHydrationWarning>
        {effectiveIsLight ? (
          // Light gradient theme - soft blue/white gradients
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent" />
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />
          </>
        ) : (
          // Black space theme - stars and deep space
          <StarsCanvas />
        )}
      </div>

      {/* Optional gradient overlay for depth */}
      {showGradient && (
        <div className={`fixed inset-0 pointer-events-none z-[1] ${
          effectiveIsLight
            ? 'bg-gradient-to-br from-blue-100/20 via-transparent to-purple-100/20'
            : 'bg-gradient-to-br from-purple-900/5 via-transparent to-pink-900/5'
        }`} suppressHydrationWarning />
      )}

      {/* Main Content - Above background, positioned relative for stacking context */}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
}
