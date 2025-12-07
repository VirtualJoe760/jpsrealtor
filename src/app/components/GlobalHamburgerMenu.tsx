"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import EnhancedSidebar from "./EnhancedSidebar";
import { useTheme } from "@/app/contexts/ThemeContext";

export default function GlobalHamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const pathname = usePathname();
  const isMapPage = pathname === "/map";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use default (dark) theme colors until mounted to avoid hydration mismatch
  const effectiveIsLight = mounted ? isLight : false;

  return (
    <>
      {/* Top blur gradient overlay for mobile - hidden on map page */}
      {!isMapPage && (
        <div
          className={`md:hidden fixed top-0 left-0 right-0 h-20 z-40 pointer-events-none backdrop-blur-lg ${
            effectiveIsLight
              ? 'bg-gradient-to-b from-white/80 via-white/40 to-transparent'
              : 'bg-gradient-to-b from-black/60 via-black/30 to-transparent'
          }`}
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
          }}
        />
      )}

      {/* Hamburger Button - Top Left, Mobile Only */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 w-16 h-16 flex items-center justify-center active:scale-95 transition-transform rounded-xl"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        <div className="relative w-9 h-8 flex flex-col justify-center items-center">
          {/* Top Line */}
          <motion.span
            initial={{
              backgroundColor: effectiveIsLight ? "#1e40af" : "#10b981"
            }}
            animate={isOpen ? {
              rotate: 45,
              y: 0,
              backgroundColor: "#10b981" // emerald-500
            } : {
              rotate: 0,
              y: -10,
              backgroundColor: effectiveIsLight ? "#1e40af" : "#10b981" // blue-800 for light, emerald-500 for dark
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute w-9 h-[3px] rounded-full"
            style={{
              boxShadow: isOpen
                ? "0 0 14px rgba(16,185,129,0.9), 0 0 24px rgba(16,185,129,0.5)" // emerald glow when open
                : effectiveIsLight
                  ? "0 0 10px rgba(30,64,175,0.5)" // blue glow for light mode
                  : "0 0 10px rgba(16,185,129,0.5)" // emerald glow for dark mode
            }}
            suppressHydrationWarning
          />
          {/* Middle Line */}
          <motion.span
            animate={isOpen ? {
              opacity: 0,
              x: -20
            } : {
              opacity: 1,
              x: 0
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={`absolute w-9 h-[3px] rounded-full ${effectiveIsLight ? 'bg-blue-800' : 'bg-emerald-500'}`}
            style={{
              boxShadow: effectiveIsLight
                ? "0 0 10px rgba(30,64,175,0.5)" // blue glow for light mode
                : "0 0 10px rgba(16,185,129,0.5)" // emerald glow for dark mode
            }}
            suppressHydrationWarning
          />
          {/* Bottom Line */}
          <motion.span
            initial={{
              backgroundColor: effectiveIsLight ? "#1e40af" : "#10b981"
            }}
            animate={isOpen ? {
              rotate: -45,
              y: 0,
              backgroundColor: "#10b981" // emerald-500
            } : {
              rotate: 0,
              y: 10,
              backgroundColor: effectiveIsLight ? "#1e40af" : "#10b981" // blue-800 for light, emerald-500 for dark
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute w-9 h-[3px] rounded-full"
            style={{
              boxShadow: isOpen
                ? "0 0 14px rgba(16,185,129,0.9), 0 0 24px rgba(16,185,129,0.5)" // emerald glow when open
                : effectiveIsLight
                  ? "0 0 10px rgba(30,64,175,0.5)" // blue glow for light mode
                  : "0 0 10px rgba(16,185,129,0.5)" // emerald glow for dark mode
            }}
            suppressHydrationWarning
          />
        </div>
      </motion.button>

      {/* Overlay and Sidebar */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            {/* Backdrop - Mobile Only */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className={`md:hidden fixed inset-0 backdrop-blur-md z-40 ${
                effectiveIsLight ? 'bg-white/80' : 'bg-black/80'
              }`}
            />

            {/* Enhanced Sidebar - Mobile Only */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 0.8
              }}
              className="md:hidden fixed left-0 top-0 h-full z-50"
            >
              <EnhancedSidebar onClose={() => setIsOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
