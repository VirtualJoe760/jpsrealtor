"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { slidePanel, fadeSlideIn, staggerChildren } from "@/app/utils/chat/motion";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Map,
  FileText,
  LayoutDashboard,
  FolderOpen,
  History,
  Calendar,
  Settings
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const navigationItems = [
  { id: "new-chat", label: "New Chat", icon: MessageSquare },
  { id: "map-view", label: "Map View", icon: Map },
  { id: "articles", label: "Articles", icon: FileText },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "subdivisions", label: "Sub Divisions", icon: FolderOpen },
];

const goalItems = [
  { id: "real-estate-goals", label: "Real Estate Goals", color: "bg-purple-500" },
  { id: "coachella-properties", label: "Coachella Properties", color: "bg-cyan-500" },
];

const historyItems = [
  { id: "today", label: "Today" },
  { id: "next-overlay", label: "Next js Overlay Tutorial Te..." },
  { id: "diy-voicemail", label: "DIY Voicemail Drop Servic..." },
  { id: "cost-effective", label: "Cost-Effective Voicemail D..." },
  { id: "whale-watching", label: "Whale Watching: Wales, B..." },
  { id: "yesterday", label: "Yesterday" },
  { id: "real-estate-chatbot", label: "Real Estate Chatbot Fronti..." },
];

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Sidebar Container */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? "60px" : "240px",
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        className="relative h-full bg-neutral-900/95 backdrop-blur-xl border-r border-neutral-800/50 flex flex-col z-30"
      >
        {/* Header - Home Icon & Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800/50">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
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
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-neutral-800 rounded-md transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-neutral-400" />
            )}
          </button>
        </div>

        {/* Search */}
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="p-4"
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Ctrl+k"
                  className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-1">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                initial={false}
                whileHover={{ x: isCollapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  transition-all duration-200
                  ${
                    isActive
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}

          {/* Goals Section */}
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-6"
              >
                <div className="flex items-center justify-between px-3 mb-2">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Goals
                  </h3>
                  <button className="text-neutral-500 hover:text-neutral-300">
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {goalItems.map((goal) => (
                    <button
                      key={goal.id}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 transition-colors"
                    >
                      <div className={`w-3 h-3 rounded-full ${goal.color}`} />
                      <span className="truncate">{goal.label}</span>
                      <span className="ml-auto text-xs text-neutral-600">
                        See all
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History Section */}
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-6 pb-4"
              >
                <div className="flex items-center gap-2 px-3 mb-2">
                  <History className="w-4 h-4 text-neutral-500" />
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    History
                  </h3>
                </div>
                <div className="space-y-1">
                  {historyItems.map((item) => (
                    <button
                      key={item.id}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 transition-colors"
                    >
                      {item.id === "today" || item.id === "yesterday" ? (
                        <>
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">{item.label}</span>
                        </>
                      ) : (
                        <span className="truncate pl-6">{item.label}</span>
                      )}
                    </button>
                  ))}
                  <button className="w-full text-left px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-400 transition-colors">
                    See all
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Bottom Section - Settings & Profile */}
        <div className="border-t border-neutral-800/50 p-2">
          <motion.button
            whileHover={{ x: isCollapsed ? 0 : 4 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 transition-all"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 py-2 mt-2"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                  JS
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">Private</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  );
}
