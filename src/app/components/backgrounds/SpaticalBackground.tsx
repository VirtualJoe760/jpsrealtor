"use client";

import StarsCanvas from "./StarsCanvas";

interface SpaticalBackgroundProps {
  children: React.ReactNode;
  showGradient?: boolean;
  className?: string;
}

/**
 * Reusable Spatical (starfield) background component
 * Can be used across multiple pages like /chat, /dashboard, /admin-dashboard, etc.
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
  return (
    <div className={`relative bg-black ${className}`}>
      {/* Persistent Starfield Background - Behind everything */}
      <div className="fixed inset-0 z-0">
        <StarsCanvas />
      </div>

      {/* Optional gradient overlay for depth */}
      {showGradient && (
        <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-purple-900/5 via-transparent to-pink-900/5 z-[1]" />
      )}

      {/* Main Content - Above stars and gradient, positioned relative for stacking context */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
