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
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
          onClick={() => setIsOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-xl border border-emerald-500/30 flex items-center justify-center hover:from-emerald-500/30 hover:to-cyan-500/30 hover:border-emerald-500/50 active:scale-95 transition-all shadow-2xl shadow-emerald-500/20"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <Menu className="w-6 h-6 text-emerald-400" strokeWidth={2.5} />
        </motion.button>
      )}

      {/* Overlay and Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop - Mobile Only */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Enhanced Sidebar - Mobile Only */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
