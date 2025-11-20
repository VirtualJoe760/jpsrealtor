"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import EnhancedSidebar from "./EnhancedSidebar";

export default function GlobalHamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Hamburger Button - Top Left, Mobile Only */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="hamburger"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              duration: 0.15,
              ease: "easeOut"
            }}
            onClick={() => setIsOpen(true)}
            className="md:hidden fixed top-4 left-4 z-50 w-12 h-12 rounded-xl bg-black/90 backdrop-blur-xl border border-neutral-800 flex items-center justify-center hover:bg-neutral-900 hover:border-neutral-700 active:scale-95 transition-all shadow-2xl"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <Menu className="w-6 h-6 text-neutral-300" strokeWidth={2} />
          </motion.button>
        )}
      </AnimatePresence>

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
              className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-40"
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
