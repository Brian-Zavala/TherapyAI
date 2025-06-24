"use client";

// Ultra-optimized mobile navigation for dashboard tabs
// React 19 compatible with performance optimizations

import { motion } from "framer-motion";
import { memo } from "react";

interface DashboardMobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const tabs = [
  {
    id: "overview",
    label: "Overview", 
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
  },
  {
    id: "progress",
    label: "Progress",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
  },
  {
    id: "communication", 
    label: "Comm",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
  },
  {
    id: "sessions",
    label: "Sessions", 
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
  }
];

function DashboardMobileNav({ activeTab, setActiveTab }: DashboardMobileNavProps) {
  return (
    <div className="sm:hidden mb-6">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-1 shadow-lg">
        <div className="flex space-x-0.5">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-1.5 py-2.5 rounded-lg font-medium flex-1 text-[10px] transition-all duration-300 min-w-0 ${
                activeTab === tab.id
                  ? "text-white shadow-lg"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center justify-center">
                <svg className="w-3 h-3 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                <span className="truncate font-semibold">{tab.label}</span>
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(DashboardMobileNav);