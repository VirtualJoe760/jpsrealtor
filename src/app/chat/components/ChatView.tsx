"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { crossDissolve, fadeSlideIn } from "../utils/motion";
import StarsCanvas from "./StarsCanvas";

export default function ChatView() {
  return (
    <motion.div
      {...crossDissolve(0.6)}
      className="flex flex-col items-center justify-center h-full w-full relative"
    >
      {/* Floating Stars Background */}
      <StarsCanvas />

      {/* Center Content */}
      <div className="flex flex-col items-center justify-center flex-1 max-w-4xl px-8 relative z-10">
        {/* Logo & Brand */}
        <motion.div
          {...fadeSlideIn("up", 0.2, 0.6)}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <h1 className="text-5xl font-light tracking-wider text-white">
            JPSREALTOR
          </h1>
        </motion.div>

        {/* Input Field */}
        <motion.div
          {...fadeSlideIn("up", 0.4, 0.6)}
          className="w-full max-w-2xl"
        >
          <div className="relative group">
            <input
              type="text"
              placeholder="Where do you want to see Real Estate?"
              className="w-full bg-neutral-900/50 backdrop-blur-xl border border-neutral-700/50 rounded-2xl px-6 py-4 text-base text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white hover:bg-neutral-200 transition-colors">
              <Mic className="w-5 h-5 text-black" />
            </button>
          </div>
        </motion.div>

        {/* Quick Action Pills */}
        <motion.div
          {...fadeSlideIn("up", 0.6, 0.6)}
          className="flex flex-wrap gap-3 mt-8 justify-center"
        >
          {["Articles", "Map View", "Dashboard", "Subdivisions"].map(
            (action, index) => (
              <motion.button
                key={action}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2.5 bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-full text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-200"
              >
                {action}
              </motion.button>
            )
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
