"use client";

import { useEffect, useState, useRef } from "react";
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
  
  // Note: Real-time updates handled via React Query polling
  // SSE removed due to Upstash Redis limitations
  

  // Query for credit status with proper authentication check
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["credits-display"],
    queryFn: fetchCredits,
    refetchInterval: (data) => {
      // More frequent updates for low credits or during subscription changes
      const credits = (data as any)?.credits;
      if (!credits) return 5 * 60 * 1000; // 5 minutes default
      
      if (credits.percentageUsed > 90) return 30 * 1000; // 30 seconds if critical
      if (credits.percentageUsed > 80) return 2 * 60 * 1000; // 2 minutes if low
      return 5 * 60 * 1000; // 5 minutes normal
    },
    staleTime: 1 * 60 * 1000, // Data considered fresh for 1 minute (reduced for faster updates)
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
  
  // Listen for credit update events - Instant updates when credits change
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const handleCreditUpdate = () => {
      refetch();
    };
    
    // Listen for various events that should trigger credit updates
    window.addEventListener('creditUpdate', handleCreditUpdate);
    window.addEventListener('sessionEnd', handleCreditUpdate);
    window.addEventListener('sessionStarted', handleCreditUpdate);
    window.addEventListener('subscriptionChanged', handleCreditUpdate);
    window.addEventListener('creditPurchase', handleCreditUpdate);
    
    return () => {
      window.removeEventListener('creditUpdate', handleCreditUpdate);
      window.removeEventListener('sessionEnd', handleCreditUpdate);
      window.removeEventListener('sessionStarted', handleCreditUpdate);
      window.removeEventListener('subscriptionChanged', handleCreditUpdate);
      window.removeEventListener('creditPurchase', handleCreditUpdate);
    };
  }, [isAuthenticated, refetch]);
  
  // Hide widget while a session is live
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Track elapsed session minutes for real-time credit countdown
  // Accounts for paused time so credits don't drain while paused
  const [sessionElapsedMinutes, setSessionElapsedMinutes] = useState(0);
  const sessionStartRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef<number>(0);

  useEffect(() => {
    const handleSessionStarted = () => {
      setIsSessionActive(true);
      sessionStartRef.current = Date.now();
      totalPausedMsRef.current = 0;
      pausedAtRef.current = null;
      setSessionElapsedMinutes(0);
      // Update every 30 seconds
      sessionTimerRef.current = setInterval(() => {
        if (sessionStartRef.current && !pausedAtRef.current) {
          const wallTime = Date.now() - sessionStartRef.current;
          const activeTime = wallTime - totalPausedMsRef.current;
          setSessionElapsedMinutes(Math.floor(activeTime / 60000));
        }
      }, 30000);
    };

    const handleSessionEnd = () => {
      setIsSessionActive(false);
      sessionStartRef.current = null;
      pausedAtRef.current = null;
      totalPausedMsRef.current = 0;
      setSessionElapsedMinutes(0);
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };

    const handleSessionPaused = () => {
      pausedAtRef.current = Date.now();
    };

    const handleSessionResumed = () => {
      if (pausedAtRef.current) {
        totalPausedMsRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      // Recalculate immediately on resume
      if (sessionStartRef.current) {
        const wallTime = Date.now() - sessionStartRef.current;
        const activeTime = wallTime - totalPausedMsRef.current;
        setSessionElapsedMinutes(Math.floor(activeTime / 60000));
      }
    };

    window.addEventListener('sessionStarted', handleSessionStarted);
    window.addEventListener('sessionEnd', handleSessionEnd);
    window.addEventListener('sessionEnded', handleSessionEnd);
    window.addEventListener('sessionPaused', handleSessionPaused);
    window.addEventListener('sessionResumed', handleSessionResumed);

    return () => {
      window.removeEventListener('sessionStarted', handleSessionStarted);
      window.removeEventListener('sessionEnd', handleSessionEnd);
      window.removeEventListener('sessionEnded', handleSessionEnd);
      window.removeEventListener('sessionPaused', handleSessionPaused);
      window.removeEventListener('sessionResumed', handleSessionResumed);
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, []);

  // Poll for credit updates with exponential backoff after mount
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const checkForUpdates = async () => {
      try {
        const response = await fetch('/api/credits/check-update');
        if (response.ok) {
          const data = await response.json();
          if (data.hasUpdate) {
            refetch();
            return true; // Update found, stop polling
          }
        }
      } catch (error) {
        // Log for debugging but don't expose to user
        console.debug('[CreditDisplay] Update check failed:', error);
      }
      return false;
    };
    
    // Use exponential backoff: 5s, 10s, 20s, then stop
    const intervals = [5000, 10000, 20000];
    let currentInterval = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const scheduleNextCheck = () => {
      if (currentInterval < intervals.length) {
        timeoutId = setTimeout(async () => {
          const updateFound = await checkForUpdates();
          if (!updateFound) {
            currentInterval++;
            scheduleNextCheck();
          }
        }, intervals[currentInterval]);
      }
    };
    
    // Start the check sequence
    scheduleNextCheck();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAuthenticated, refetch]);
  


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
      <div className={`${position === "fixed" ? "fixed top-20 right-4 sm:top-24 sm:right-4 lg:top-20 lg:right-6 xl:top-20 xl:right-8 z-40" : ""} ${className}`}>
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
        className={`${position === "fixed" ? "fixed top-20 right-4 sm:top-24 sm:right-4 lg:top-20 lg:right-6 xl:top-20 xl:right-8 z-40" : ""} ${className}`}
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
  if (isSessionActive) return null;

  const { credits } = data;
  // Subtract elapsed session time from available credits for real-time display
  const displayAvailable = Math.max(0, credits.available - sessionElapsedMinutes);
  const displayUsed = credits.used + sessionElapsedMinutes;
  const displayPercentage = credits.total > 0 ? Math.round((displayUsed / credits.total) * 100) : 0;
  const isLowCredits = displayPercentage >= 80;
  const isOutOfCredits = displayAvailable <= 0 && !credits.isUnlimited;

  // Different positioning based on screen size to avoid navigation conflicts
  // Mobile: Below nav area (top-20) to avoid hamburger menu (z-50)
  // Tablet: Side position to avoid dropdown
  // Desktop: Top-right corner safe zone
  // z-40 ensures it's visible above most content but below modals (z-50)
  const positionClasses = position === "fixed"
    ? "fixed top-20 right-4 sm:top-24 sm:right-4 lg:top-20 lg:right-6 xl:top-20 xl:right-8 z-40 max-w-[calc(100vw-2rem)] sm:max-w-none"
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
      aria-label={`Credit status: ${displayAvailable} of ${credits.total} minutes remaining`}
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
          <div className="relative">
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
        </div>

        {/* Credit Amount */}
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-0.5">
            <span
              className={`text-sm sm:text-base font-semibold ${
                isOutOfCredits ? "text-red-400" : isLowCredits ? "text-yellow-400" : "text-white"
              }`}
            >
              {credits.isUnlimited ? "∞" : displayAvailable}
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
                    <span>Used: {displayUsed} min</span>
                    <span>{displayPercentage}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${displayPercentage}%` }}
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