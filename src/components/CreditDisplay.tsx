"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

interface CreditData {
  credits: {
    available: number;
    total: number;
    used: number;
    bonus: number;
    isUnlimited: boolean;
    percentageUsed: number;
    planType: string;
    maxSessionDuration: number;
  };
  billing: {
    periodStart: string | null;
    periodEnd: string | null;
    daysRemaining: number | null;
  };
}

async function fetchCredits(): Promise<CreditData> {
  const response = await fetch("/api/credits");
  if (!response.ok) {
    throw new Error("Failed to fetch credits");
  }
  return response.json();
}

interface CreditDisplayProps {
  className?: string;
  position?: "fixed" | "relative" | "absolute";
}

export default function CreditDisplay({ className = "", position = "fixed" }: CreditDisplayProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showTooltip, setShowTooltip] = useState(false);

  // Query for credit status
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["credits-display"],
    queryFn: fetchCredits,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
    enabled: isAuthenticated && !authLoading,
  });

  // Don't show if not authenticated or loading
  if (!isAuthenticated || authLoading || isLoading) {
    return null;
  }

  // Don't show if there's an error
  if (error) {
    console.error("Error fetching credits:", error);
    return null;
  }

  if (!data) return null;

  const { credits } = data;
  const isLowCredits = credits.percentageUsed >= 80;
  const isOutOfCredits = credits.available <= 0 && !credits.isUnlimited;

  // Different positioning based on screen size to avoid navigation conflicts
  // Mobile: Below nav area (top-20) to avoid hamburger menu
  // Tablet: Side position to avoid dropdown
  // Desktop: Top-right corner safe zone
  const positionClasses = position === "fixed" 
    ? "fixed top-20 right-4 sm:top-24 sm:right-4 lg:top-4 lg:right-4 xl:top-4 xl:right-6 z-30"
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${positionClasses} ${className} pointer-events-auto`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Credit Display Container */}
      <div
        className={`
          bg-white/10 backdrop-blur-lg border rounded-lg px-3 py-1.5 sm:px-4 sm:py-2
          flex items-center gap-2 cursor-pointer transition-all duration-200
          hover:bg-white/15 hover:border-white/30
          ${isOutOfCredits ? "border-red-500/50" : isLowCredits ? "border-yellow-500/50" : "border-white/20"}
        `}
      >
        {/* Credit Icon */}
        <div className="flex items-center">
          <svg
            className={`w-4 h-4 sm:w-5 sm:h-5 ${
              isOutOfCredits ? "text-red-400" : isLowCredits ? "text-yellow-400" : "text-green-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Credit Amount */}
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-0.5">
            <span
              className={`text-sm sm:text-base font-semibold ${
                isOutOfCredits ? "text-red-400" : isLowCredits ? "text-yellow-400" : "text-white"
              }`}
            >
              {credits.isUnlimited ? "∞" : credits.available}
            </span>
            {!credits.isUnlimited && (
              <span className="text-xs sm:text-sm text-white/60">
                /{credits.total}
              </span>
            )}
            <span className="text-xs sm:text-sm text-white/60 ml-1">min</span>
          </div>
          <span className="text-xs text-white/50 capitalize">{credits.planType}</span>
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-64 sm:w-72"
          >
            <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg p-3 sm:p-4 shadow-xl">
              {/* Plan Info */}
              <div className="mb-3">
                <h3 className="text-sm sm:text-base font-semibold text-white mb-1">
                  {credits.planType.charAt(0).toUpperCase() + credits.planType.slice(1)} Plan
                </h3>
                <p className="text-xs sm:text-sm text-white/70">
                  Max session: {credits.maxSessionDuration} minutes
                </p>
              </div>

              {/* Credit Usage Bar */}
              {!credits.isUnlimited && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs sm:text-sm text-white/70 mb-1">
                    <span>Used: {credits.used} min</span>
                    <span>{credits.percentageUsed}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${credits.percentageUsed}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        isOutOfCredits
                          ? "bg-red-500"
                          : isLowCredits
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Bonus Credits */}
              {credits.bonus > 0 && (
                <div className="mb-3 p-2 bg-purple-500/20 rounded">
                  <p className="text-xs sm:text-sm text-purple-300">
                    🎁 Bonus credits: {credits.bonus} min
                  </p>
                </div>
              )}

              {/* Billing Period */}
              {data.billing.daysRemaining !== null && (
                <div className="text-xs sm:text-sm text-white/60">
                  <p>Resets in {data.billing.daysRemaining} days</p>
                </div>
              )}

              {/* Low Credit Warning */}
              {isLowCredits && !isOutOfCredits && !credits.isUnlimited && (
                <div className="mt-3 p-2 bg-yellow-500/20 rounded">
                  <p className="text-xs sm:text-sm text-yellow-300">
                    ⚠️ Running low on credits
                  </p>
                </div>
              )}

              {/* Out of Credits Warning */}
              {isOutOfCredits && (
                <div className="mt-3 p-2 bg-red-500/20 rounded">
                  <p className="text-xs sm:text-sm text-red-300">
                    ❌ Out of credits - Upgrade plan
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}