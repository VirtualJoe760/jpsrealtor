"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import GlobeLoader from "./GlobeLoader";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition component that creates smooth cross-dissolve transitions
 * between page navigations with a globe loading animation
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true); // Start with loading true for initial page load
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Handle initial page load
  useEffect(() => {
    if (isInitialLoad) {
      // Minimum 1.7 seconds for initial load to show full globe rotation
      const minLoadTime = 1700;
      const timer = setTimeout(() => {
        setIsLoading(false);
        setIsInitialLoad(false);
      }, minLoadTime);

      return () => clearTimeout(timer);
    }
  }, [isInitialLoad]);

  // Handle route changes
  useEffect(() => {
    // Skip if this is the initial load
    if (isInitialLoad) return;

    // Detect route change
    if (pathname !== prevPathname) {
      setIsLoading(true);

      // Minimum 1.7 seconds to complete at least one full globe rotation (360deg / 1.5 rad/s ≈ 1.7s)
      const minLoadTime = 1700;
      const startTime = Date.now();

      // Hide loader after minimum time
      const timer = setTimeout(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= minLoadTime) {
          setIsLoading(false);
          setPrevPathname(pathname);
        } else {
          // Wait for remaining time
          setTimeout(() => {
            setIsLoading(false);
            setPrevPathname(pathname);
          }, minLoadTime - elapsed);
        }
      }, minLoadTime);

      return () => clearTimeout(timer);
    }
  }, [pathname, prevPathname, isInitialLoad]);

  return (
    <>
      {/* Globe Loader Overlay - Full screen overlay that covers everything */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999]"
          >
            <GlobeLoader text="Loading page..." subtext="Just a moment" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content - Only animate in AFTER loader completes */}
      <AnimatePresence mode="wait" initial={false}>
        {!isLoading && (
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: 0.1
            }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
