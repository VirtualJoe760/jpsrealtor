"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import Image from "next/image";
import { useTheme } from "@/app/contexts/ThemeContext";

export default function ChatWidget() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    console.log("Sending message:", message);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
        className="w-full max-w-2xl md:max-w-4xl flex flex-col items-center gap-6 md:gap-8 px-4"
      >
        {/* Logo & Brand */}
        <div className="flex items-center justify-center gap-3">
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
                className={`object-contain ${
                  isLight
                    ? "drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    : "drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                }`}
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

          {/* Brand Text */}
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
                  ? [
                      "0 0 10px rgba(59,130,246,0.2)",
                      "0 0 20px rgba(59,130,246,0.3)",
                      "0 0 10px rgba(59,130,246,0.2)",
                    ]
                  : [
                      "0 0 10px rgba(168,85,247,0.3)",
                      "0 0 20px rgba(168,85,247,0.5)",
                      "0 0 10px rgba(168,85,247,0.3)",
                    ],
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
          <div
            className={`relative rounded-2xl backdrop-blur-md shadow-lg transition-all duration-300 ${
              isLight
                ? "bg-white/80 border border-gray-300"
                : "bg-neutral-800/50 border border-neutral-700/50"
            }`}
            style={{
              backdropFilter: "blur(10px) saturate(150%)",
              WebkitBackdropFilter: "blur(10px) saturate(150%)",
            }}
          >
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about real estate..."
              className={`w-full px-6 py-4 pr-14 bg-transparent outline-none rounded-2xl text-base ${
                isLight ? "text-gray-900 placeholder-gray-500" : "text-white placeholder-gray-400"
              }`}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all duration-200 ${
                message.trim()
                  ? isLight
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                    : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl"
                  : isLight
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
