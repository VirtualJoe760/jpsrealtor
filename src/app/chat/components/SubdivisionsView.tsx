"use client";

import { motion } from "framer-motion";
import { crossDissolve, fadeSlideIn } from "../utils/motion";
import { FolderOpen } from "lucide-react";

export default function SubdivisionsView() {
  return (
    <motion.div
      {...crossDissolve(0.6)}
      className="flex flex-col items-center justify-center h-full w-full"
    >
      <motion.div
        {...fadeSlideIn("up", 0.2, 0.6)}
        className="flex flex-col items-center gap-6"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
          <FolderOpen className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-light text-white mb-2">
            Sub Divisions
          </h2>
          <p className="text-neutral-400">Browse neighborhood communities</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
