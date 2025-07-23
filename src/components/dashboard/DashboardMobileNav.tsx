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
    id: "insights",
    label: "AI Insights",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
  },
  {
    id: "progress",
    label: "Progress",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
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