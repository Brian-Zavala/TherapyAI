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
  
  // Debug logging
  useEffect(() => {
    console.log('[CreditDisplay] Component mounted');
    console.log('[CreditDisplay] Auth state:', { isAuthenticated, authLoading });
  }, [isAuthenticated, authLoading]);
  

  // Query for credit status with proper authentication check
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["credits-display"],
    queryFn: fetchCredits,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes (reduced from 30s)
    staleTime: 2 * 60 * 1000, // Data considered fresh for 2 minutes
    enabled: isAuthenticated && !authLoading, // Only fetch when authenticated
    refetchOnWindowFocus: true, // Update when user returns to tab
    refetchOnMount: true,
    retry: (failureCount, error: any) => {
      // Don't retry authentication errors
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
  });


  // Don't render until authentication is resolved, but show loading when authenticated
  if (authLoading) {
    return null; // Still loading authentication state
  }
  
  // Only render for authenticated users
  if (!isAuthenticated) {
    return null;
  }

  // Show loading state for authenticated users while data is loading
  if (isLoading) {
    return (
      <div className={`${position === "fixed" ? "fixed top-20 right-4 sm:top-24 sm:right-4 lg:top-4 lg:right-4 xl:top-4 xl:right-6 z-40" : ""} ${className}`}>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded"></div>
            <div className="w-16 h-4 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    console.error("Error fetching credits:", error);
    return (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${position === "fixed" ? "fixed top-20 right-4 sm:top-24 sm:right-4 lg:top-4 lg:right-4 xl:top-4 xl:right-6 z-40" : ""} ${className}`}
      >
        <div className="bg-red-500/20 backdrop-blur-lg border border-red-500/30 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2">
          <span className="text-xs sm:text-sm text-red-300">Unable to load credits</span>
          <button 
            onClick={() => refetch()} 
            className="text-xs underline text-red-300 hover:text-red-200 hover:no-underline"
          >
            Retry
          </button>
        </div>
      </motion.div>
    );
  }

  if (!data) return null;

  const { credits } = data;
  const isLowCredits = credits.percentageUsed >= 80;
  const isOutOfCredits = credits.available <= 0 && !credits.isUnlimited;

  // Different positioning based on screen size to avoid navigation conflicts
  // Mobile: Below nav area (top-20) to avoid hamburger menu (z-50)
  // Tablet: Side position to avoid dropdown
  // Desktop: Top-right corner safe zone
  // z-40 ensures it's visible above most content but below modals (z-50)
  const positionClasses = position === "fixed" 
    ? "fixed top-20 right-4 sm:top-24 sm:right-4 lg:top-4 lg:right-4 xl:top-4 xl:right-6 z-40 max-w-[calc(100vw-2rem)] sm:max-w-none"
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${positionClasses} ${className} pointer-events-auto`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="status"
      aria-label={`Credit status: ${credits.available} of ${credits.total} minutes remaining`}
      aria-live="polite"
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