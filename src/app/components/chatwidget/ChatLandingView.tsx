"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useTheme } from "@/app/contexts/ThemeContext";
import AnimatedChatInput from "./AnimatedChatInput";

interface ChatLandingViewProps {
  onSend: (message: string) => void;
  onMicClick: () => void;
  isStreaming: boolean;
  streamingMessage: string;
}

export default function ChatLandingView({
  onSend,
  onMicClick,
  isStreaming,
  streamingMessage,
}: ChatLandingViewProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const quickActions = ["Articles", "Map", "Dashboard", "Neighborhoods"];
  const actionMap: Record<string, string> = {
    Articles: "/insights",
    Map: "/map",
    Dashboard: "/dashboard",
    Neighborhoods: "/neighborhoods",
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
        className="w-full max-w-2xl md:max-w-4xl flex flex-col items-center gap-6 md:gap-8"
      >
        {/* Logo & Title */}
        <div className="flex items-center justify-center gap-3 md:gap-3">
          <motion.div
            initial={{ scale: 0, rotateY: -180 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.3 }}
            whileHover={{ scale: 1.1, rotateY: 15, rotateX: 5 }}
            style={{ transformStyle: "preserve-3d", perspective: 1000 }}
            className="w-20 h-20 md:w-24 md:h-24 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0"
          >
            <motion.div
              animate={{ rotateY: [0, 5, 0, -5, 0], rotateX: [0, 2, 0, -2, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <Image
                src={isLight ? "/images/brand/exp-Realty-Logo-black.png" : "/images/brand/EXP-white-square.png"}
                alt="eXp Realty"
                width={96}
                height={96}
                className={`object-contain ${isLight ? "drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"}`}
                priority
              />
            </motion.div>
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.4 }}
            className={`h-10 md:h-12 w-px ${
              isLight
                ? "bg-gradient-to-b from-transparent via-gray-400/50 to-transparent"
                : "bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"
            }`}
          />

          <motion.h1
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.5 }}
            whileHover={{ scale: 1.02, textShadow: "0 0 20px rgba(168,85,247,0.5)" }}
            style={{ transformStyle: "preserve-3d", perspective: 1000 }}
            className={`text-3xl md:text-6xl font-light tracking-wider ${isLight ? "text-gray-900" : "text-white"}`}
          >
            <motion.span
              animate={{
                textShadow: isLight
                  ? ["0 0 10px rgba(59,130,246,0.2)", "0 0 20px rgba(59,130,246,0.3)", "0 0 10px rgba(59,130,246,0.2)"]
                  : ["0 0 10px rgba(168,85,247,0.3)", "0 0 20px rgba(168,85,247,0.5)", "0 0 10px rgba(168,85,247,0.3)"],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              JPSREALTOR
            </motion.span>
          </motion.h1>
        </div>

        {/* Chat Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full max-w-[700px]"
        >
          <AnimatedChatInput
            mode="landing"
            onSend={onSend}
            onMicClick={onMicClick}
            onMinimizedClick={() => {}}
            isStreaming={isStreaming}
            streamingText={streamingMessage}
          />
        </motion.div>

        {/* Quick Action Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="hidden md:flex flex-wrap gap-3 justify-center max-w-2xl"
        >
          {quickActions.map((action, index) => (
            <motion.button
              key={action}
              onClick={() => (window.location.href = actionMap[action])}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 15, delay: 0.8 + index * 0.1 }}
              whileHover={{ scale: 1.08, y: -4, boxShadow: "0 10px 30px rgba(168, 85, 247, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              className={`px-6 py-2.5 backdrop-blur-md rounded-full text-sm transition-colors duration-300 shadow-lg cursor-pointer ${
                isLight
                  ? "bg-white/80 border border-gray-300 text-gray-700 hover:bg-white hover:text-gray-900"
                  : "bg-neutral-800/50 border border-neutral-700/50 text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-purple-500/50"
              }`}
            >
              {action}
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
