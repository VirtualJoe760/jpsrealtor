"use client";

import { motion } from "framer-motion";
import { crossDissolve } from "../utils/motion";
import DashboardPage from "@/app/dashboard/page";

export default function DashboardViewIntegrated() {
  return (
    <motion.div
      {...crossDissolve(0.6)}
      className="h-full w-full relative"
      onAnimationComplete={() => {
        // Force resize after transition
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 50);
      }}
    >
      <DashboardPage />
    </motion.div>
  );
}
