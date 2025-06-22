// src/components/dashboard/SessionTimeChart.tsx
"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Rectangle,
} from "recharts";
import { motion } from "framer-motion";
import {
  ClockIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline"; // Example icons
import { useRealTimeMetrics } from "@/hooks/useDashboardMetrics";

// Helper function for number formatting (optional, but nice for tooltips)
const formatNumber = (num: number) => num.toLocaleString();

export default function SessionTimeChart() {
  // Define session data type
  interface SessionDataItem {
    month: string;
    monthFormatted: string;
    sessionTime: number;
    sessionCount: number;
    avgSessionLength: number;
    growth: number;
    date?: string; // Add date property for calculations
  }

  const [sessionData, setSessionData] = useState<SessionDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalHours, setTotalHours] = useState(0);
  const [averageSessionLength, setAverageSessionLength] = useState(0);
  const [therapyType, setTherapyType] = useState("couple"); // 'couple', 'solo', or 'family'
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isMediumScreen, setIsMediumScreen] = useState(false);
  
  // Real-time session tracking
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [liveSessionDuration, setLiveSessionDuration] = useState(0); // in minutes
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [showLiveIndicator, setShowLiveIndicator] = useState(false);

  // Real-time metrics integration
  const {
    isConnected: metricsConnected,
    currentMetrics,
    error: metricsError
  } = useRealTimeMetrics({
    autoConnect: true,
    onSessionUpdate: (status, sessionId, data) => {
      console.log(`📊 SESSION TIME: Session ${sessionId} status: ${status}`);
      
      if (status === 'active') {
        setActiveSessionId(sessionId);
        setSessionStartTime(data?.startTime ? new Date(data.startTime) : new Date());
        setShowLiveIndicator(true);
        console.log(`⏱️ LIVE SESSION: Started tracking session ${sessionId}`);
      } else if (status === 'completed') {
        console.log(`⏱️ LIVE SESSION: Completed session ${sessionId} - Duration: ${data?.duration || 0} seconds`);
        setActiveSessionId(null);
        setLiveSessionDuration(0);
        setSessionStartTime(null);
        setShowLiveIndicator(false);
        
        // Refresh session data after completion
        setTimeout(() => {
          fetchSessionData(therapyType);
        }, 2000);
      }
    },
    onError: (error) => {
      console.error('📊 SESSION TIME: Real-time error:', error);
    }
  });

  // Live session duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeSessionId && sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000 / 60); // minutes
        setLiveSessionDuration(elapsed);
      }, 1000); // Update every second
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSessionId, sessionStartTime]);

  const fetchSessionData = async (type = "couple") => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const response = await fetch(`/api/dashboard/session-time?type=${type}`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch session time data (Status: ${response.status})`
        );
      }

      const data = await response.json();

      // Calculate summary statistics
      let totalMinutes = 0;
      let totalSessions = 0;

      data.forEach((item: { sessionTime: number; sessionCount: number }) => {
        totalMinutes += item.sessionTime;
        totalSessions += item.sessionCount;
      });

      setTotalHours(Math.round((totalMinutes / 60) * 10) / 10); // Round to 1 decimal place
      setAverageSessionLength(
        totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0
      );

      // Enhance data for charting and tooltips
      const enhancedData = data.map(
        (
          item: { sessionTime: number; sessionCount: number; month: string },
          index: number,
          arr: { sessionTime: number }[]
        ) => {
          const prevValue = index > 0 ? arr[index - 1].sessionTime : 0;
          const growthRate =
            prevValue === 0 && item.sessionTime > 0
              ? 100 // If first month has data, show 100% growth from 0
              : prevValue === 0 && item.sessionTime === 0
                ? 0 // If both are zero, growth is 0
                : prevValue === 0
                  ? 0 // Should not happen if prevValue is 0 and item.sessionTime > 0, handled above
                  : Math.round((item.sessionTime / prevValue) * 100 - 100);

          const avgSessionLen =
            item.sessionCount > 0
              ? Math.round(item.sessionTime / item.sessionCount)
              : 0;

          return {
            ...item,
            monthFormatted: item.month.substring(0, 3), // First 3 letters of month
            growth: growthRate, // Indicates % change from previous month's total time
            avgSessionLength: avgSessionLen, // Average length of each session this month
          };
        }
      );

      setSessionData(enhancedData);
    } catch (err) {
      console.error(`Error fetching ${type} session time data:`, err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData(therapyType);
  }, [therapyType]);

  // Track screen size for responsive adjustments
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640);
      setIsMediumScreen(window.innerWidth >= 640 && window.innerWidth < 1024);
    };

    // Initial check
    checkScreenSize();

    // Add resize listener
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // --- Loading State ---
  if (loading)
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-[520px] flex items-center justify-center bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl"
      >
        <div className="flex flex-col items-center px-4">
          {/* Enhanced Spinner with pulse animation */}
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ 
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <svg
              className="animate-spin h-10 w-10 sm:h-12 sm:w-12 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl animate-pulse"></div>
          </motion.div>
          <p className="mt-4 text-white font-medium text-sm sm:text-base text-center">
            Loading your therapy insights...
          </p>
        </div>
      </motion.div>
    );

  // --- Error State ---
  if (error)
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-[520px] flex items-center justify-center bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl"
      >
        <div className="text-center p-6 sm:p-8 w-full max-w-[90%] sm:max-w-md">
          <motion.div
            animate={{ 
              y: [0, -10, 0],
            }}
            transition={{ 
              repeat: Infinity,
              duration: 3,
              ease: "easeInOut"
            }}
          >
            <ExclamationTriangleIcon className="w-14 h-14 sm:w-16 sm:h-16 mx-auto text-amber-400 mb-4" />
          </motion.div>
          <p className="text-lg sm:text-xl font-semibold text-white mb-2">
            Couldn't load session data
          </p>
          <p className="text-sm sm:text-base text-white/80 mb-6">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fetchSessionData(therapyType)}
            className="px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-sm sm:text-base font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-blue-500/30"
          >
            <span className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </span>
          </motion.button>
        </div>
      </motion.div>
    );

  // --- Reusable Therapy Type Selector ---
  const TherapyTypeSelector = () => (
    <div className="flex justify-center mb-4 px-2 sm:px-0">
      <div className="inline-flex p-1 bg-blue-900/30 backdrop-blur-sm rounded-lg shadow-lg border border-blue-400/20 w-full max-w-full sm:max-w-xs md:max-w-sm overflow-x-auto">
        {["couple", "solo", "family"].map((type) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTherapyType(type)}
            className={`relative px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 ease-in-out flex-1 min-w-[60px] sm:min-w-[80px] ${
              therapyType === type
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-blue-300 hover:text-white hover:bg-blue-800/30"
            }`}
            layout
          >
            {therapyType === type && (
              <motion.div
                layoutId="activeTherapy"
                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-md"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center">
              {type === "couple" && (
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              )}
              {type === "solo" && (
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
              {type === "family" && (
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              )}
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );

  // --- No Data State ---
  if (sessionData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-[520px] flex flex-col mb-6 sm:mb-0 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl p-6" 
      >
        <div className="flex items-center mb-6">
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/30 flex items-center justify-center text-white mr-3 shadow-lg"
          >
            <DocumentChartBarIcon className="h-7 w-7" />
          </motion.div>
          <h2 className="text-xl font-semibold text-white">
            Therapy Insights
          </h2>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center p-6 sm:p-8 w-full max-w-[90%] sm:max-w-md">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              {/* Decorative elements */}
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ 
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut"
                  }}
                  className="w-24 h-24 bg-blue-400/20 rounded-full blur-2xl"
                />
              </div>
              
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <svg className="w-16 h-16 mx-auto mb-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </motion.div>
              
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Welcome to Your Journey
              </h3>
              <p className="text-sm sm:text-base text-white/90 mb-8 leading-relaxed max-w-sm mx-auto">
                Begin tracking your therapy sessions to unlock valuable insights about your progress and growth over time.
              </p>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="relative px-8 sm:px-10 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-sm sm:text-base font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-blue-500/30 overflow-hidden group"
                onClick={() => (window.location.href = "/dashboard/therapy")}
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Start Your First Session
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  // --- Custom Tooltip Component ---
  interface TooltipProps {
    active?: boolean;
    payload?: Array<any>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      // Find the full data point for extra info like growth, avgSessionLength etc.
      const monthData = sessionData.find(
        (item) => item.monthFormatted === label
      );
      if (!monthData) return null; // Should always find one if tooltip is active

      // Calculate additional insights
      // Find historical average session length
      const allPreviousMonths = sessionData.filter(
        (item) => item.date && monthData.date && new Date(item.date) <= new Date(monthData.date) && item.sessionCount > 0
      );
      let historicalAvg = 0;
      if (allPreviousMonths.length > 0) {
        const totalTime = allPreviousMonths.reduce((sum, item) => sum + item.sessionTime, 0);
        const totalSessions = allPreviousMonths.reduce((sum, item) => sum + item.sessionCount, 0);
        historicalAvg = totalSessions > 0 ? Math.round(totalTime / totalSessions) : 0;
      }

      // Calculate longer-term trend
      const threeMonthsAgo = sessionData.filter(
        (item) => {
          if (!item.date || !monthData.date) return false;
          const currentDate = new Date(monthData.date);
          const itemDate = new Date(item.date);
          const monthsDiff = (currentDate.getFullYear() - itemDate.getFullYear()) * 12 + 
                            (currentDate.getMonth() - itemDate.getMonth());
          return monthsDiff >= 0 && monthsDiff <= 3;
        }
      );
      
      let longTermTrend = 0;
      if (threeMonthsAgo.length >= 2) {
        const oldestTime = threeMonthsAgo[0].sessionTime;
        const newestTime = threeMonthsAgo[threeMonthsAgo.length - 1].sessionTime;
        longTermTrend = oldestTime > 0 ? Math.round((newestTime / oldestTime - 1) * 100) : 0;
      }
      
      // Find index of current month in session data
      const currentMonthIndex = sessionData.findIndex(item => item.monthFormatted === label);
      const hasPreviousMonth = currentMonthIndex > 0;
      const previousMonth = hasPreviousMonth ? sessionData[currentMonthIndex - 1] : null;
      
      // Determine overall session commitment based on consecutive months with sessions
      let commitmentLevel = "Starting";
      let consecutiveMonths = 0;
      
      // Calculate consecutive months with sessions
      if (currentMonthIndex >= 0) {
        let i = currentMonthIndex;
        while (i >= 0 && sessionData[i].sessionCount > 0) {
          consecutiveMonths++;
          i--;
        }
        
        if (consecutiveMonths >= 6) {
          commitmentLevel = "Excellent";
        } else if (consecutiveMonths >= 4) {
          commitmentLevel = "Strong";
        } else if (consecutiveMonths >= 2) {
          commitmentLevel = "Building";
        }
      }
      
      // Calculate session time efficiency (% of recommended time)
      // Assuming recommended is about 4 hours (240 minutes) per month
      const recommendedMonthlyTime = 240;
      const efficiencyPercentage = Math.min(100, Math.round((monthData.sessionTime / recommendedMonthlyTime) * 100));

      return (
        <div
          className={`bg-white ${isSmallScreen ? "p-2" : "p-4"} shadow-xl rounded-lg border border-gray-200 ${isSmallScreen ? "min-w-[180px] max-w-[220px]" : "min-w-[300px] max-w-[350px]"}`}
        >
          <div className="flex justify-between items-center">
            <p
              className={`font-semibold text-blue-900 ${isSmallScreen ? "mb-1.5" : "mb-2"} ${isSmallScreen ? "text-xs" : "text-sm"}`}
            >
              {monthData.month}
            </p>
            <div className="flex items-center">
              <span className={`inline-flex items-center justify-center ${efficiencyPercentage >= 75 ? 'bg-green-100 text-green-800' : efficiencyPercentage >= 50 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'} text-[8px] font-medium px-1.5 py-0.5 rounded-full`}>
                {efficiencyPercentage}% of target
              </span>
            </div>
          </div>
          
          <div className="border-b border-gray-200 mb-2"></div>
          
          <div className={isSmallScreen ? "space-y-1" : "space-y-2"}>
            {/* Primary Stats Section */}
            <div className="bg-blue-50/60 p-2 rounded-md">
              {/* Total Time */}
              <div
                className={`flex items-center justify-between ${isSmallScreen ? "text-[10px]" : "text-sm"}`}
              >
                <div className="flex items-center text-gray-700">
                  <span className={`inline-block ${isSmallScreen ? "w-2 h-2" : "w-3 h-3"} bg-blue-500 rounded-full ${isSmallScreen ? "mr-1.5" : "mr-2"} flex-shrink-0`}></span>
                  Total Time:
                </div>
                <span className="font-medium text-gray-800">
                  {formatNumber(monthData.sessionTime)} mins
                  <span className={`${isSmallScreen ? "text-[9px]" : "text-xs"} text-blue-500 ml-1`}>
                    ({Math.round((monthData.sessionTime / 60) * 10) / 10} hrs)
                  </span>
                </span>
              </div>

              {/* Session Count */}
              <div
                className={`flex items-center justify-between mt-1 ${isSmallScreen ? "text-[10px]" : "text-sm"}`}
              >
                <div className="flex items-center text-gray-700">
                  <span className={`inline-block ${isSmallScreen ? "w-2 h-2" : "w-3 h-3"} bg-teal-500 rounded-full ${isSmallScreen ? "mr-1.5" : "mr-2"} flex-shrink-0`}></span>
                  Sessions:
                </div>
                <span className="font-medium text-gray-800">
                  {formatNumber(monthData.sessionCount)}
                </span>
              </div>

              {/* Average Session Length */}
              <div
                className={`flex items-center justify-between mt-1 ${isSmallScreen ? "text-[10px]" : "text-sm"}`}
              >
                <div className="flex items-center text-gray-700">
                  <span className={`inline-block ${isSmallScreen ? "w-2 h-2" : "w-3 h-3"} bg-green-500 rounded-full ${isSmallScreen ? "mr-1.5" : "mr-2"} flex-shrink-0`}></span>
                  Avg. Length:
                </div>
                <span className="font-medium text-gray-800">
                  {formatNumber(monthData.avgSessionLength)} mins
                  
                  {/* Historical comparison */}
                  {historicalAvg > 0 && (
                    <span className={`${isSmallScreen ? "ml-1 text-[8px]" : "ml-2 text-[10px]"}  ${monthData.avgSessionLength > historicalAvg ? "text-green-600" : monthData.avgSessionLength < historicalAvg ? "text-red-600" : "text-gray-600"}`}>
                      {monthData.avgSessionLength > historicalAvg ? "↑" : monthData.avgSessionLength < historicalAvg ? "↓" : "="} 
                      vs avg: {historicalAvg}m
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Growth Section */}
            <div className="bg-gray-50 p-2 rounded-md">
              {/* Monthly Growth */}
              {monthData.growth !== undefined && (
                <div
                  className={`flex items-center justify-between ${isSmallScreen ? "text-[10px]" : "text-sm"}`}
                >
                  <div className="flex items-center text-gray-700">
                    <span className={`inline-block ${isSmallScreen ? "w-2 h-2" : "w-3 h-3"} bg-amber-400 rounded-full ${isSmallScreen ? "mr-1.5" : "mr-2"} flex-shrink-0`}></span>
                    Monthly Change:
                  </div>
                  <span
                    className={`font-semibold ${
                      monthData.growth > 0
                        ? "text-green-600"
                        : monthData.growth < 0
                          ? "text-red-600"
                          : "text-gray-600"
                    }`}
                  >
                    {monthData.growth >= 0 ? "+" : ""}
                    {formatNumber(monthData.growth)}%
                  </span>
                </div>
              )}

              {/* Long Term Trend (3-month) */}
              {longTermTrend !== 0 && (
                <div
                  className={`flex items-center justify-between mt-1 ${isSmallScreen ? "text-[10px]" : "text-sm"}`}
                >
                  <div className="flex items-center text-gray-700">
                    <span className={`inline-block ${isSmallScreen ? "w-2 h-2" : "w-3 h-3"} bg-purple-400 rounded-full ${isSmallScreen ? "mr-1.5" : "mr-2"} flex-shrink-0`}></span>
                    3-Month Trend:
                  </div>
                  <span
                    className={`font-semibold ${
                      longTermTrend > 0
                        ? "text-green-600"
                        : longTermTrend < 0
                          ? "text-red-600"
                          : "text-gray-600"
                    }`}
                  >
                    {longTermTrend >= 0 ? "+" : ""}
                    {formatNumber(longTermTrend)}%
                  </span>
                </div>
              )}
              
              {/* Consistency Indicator */}
              <div
                className={`flex items-center justify-between mt-1 ${isSmallScreen ? "text-[10px]" : "text-sm"}`}
              >
                <div className="flex items-center text-gray-700">
                  <span className={`inline-block ${isSmallScreen ? "w-2 h-2" : "w-3 h-3"} bg-indigo-400 rounded-full ${isSmallScreen ? "mr-1.5" : "mr-2"} flex-shrink-0`}></span>
                  Consistency:
                </div>
                <span className="font-medium flex items-center">
                  <span className={`${commitmentLevel === "Excellent" ? "text-green-600" : commitmentLevel === "Strong" ? "text-blue-600" : commitmentLevel === "Building" ? "text-amber-600" : "text-gray-600"}`}>
                    {commitmentLevel}
                  </span>
                  <span className="text-gray-500 ml-1 text-[8px]">
                    ({consecutiveMonths} {consecutiveMonths === 1 ? "month" : "months"})
                  </span>
                </span>
              </div>
            </div>
            
            {/* Insight Section - Only show for non-small screens */}
            {!isSmallScreen && (
              <div className="mt-1 pt-1 border-t border-gray-200">
                <p className="text-[10px] text-gray-600 italic">
                  {monthData.sessionCount === 0 ? (
                    "No sessions recorded this month. Consider scheduling to maintain progress."
                  ) : monthData.growth > 10 ? (
                    "Significant increase in therapy time this month, great commitment!"
                  ) : consecutiveMonths >= 3 ? (
                    `Strong consistency with ${consecutiveMonths} consecutive months of sessions.`
                  ) : monthData.avgSessionLength > 50 ? (
                    "Your longer sessions may allow for deeper therapeutic work."
                  ) : (
                    "Regular sessions help build momentum in your therapy journey."
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col p-6 w-full h-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl"
      style={{
        maxWidth: "100%",
        overflowX: "hidden",
        paddingLeft: isSmallScreen ? "12px" : undefined,
        paddingRight: isSmallScreen ? "12px" : undefined,
      }}
    >
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-green-500/30 flex items-center justify-center text-white mr-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white">
          Session Time Overview
        </h2>
      </div>

      {/* Real-Time Session Indicators */}
      <div className="flex justify-end mb-3">
        <div className="flex space-x-2 items-center">
          {/* WebSocket Connection Status */}
          {metricsConnected && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/80 text-white shadow-sm">
              <span className="w-2 h-2 mr-1.5 bg-blue-300 rounded-full animate-pulse"></span>
              Real-time
            </span>
          )}
          
          {/* Live Session Indicator */}
          {activeSessionId && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/80 text-white shadow-sm"
            >
              <span className="w-2 h-2 mr-1.5 bg-green-300 rounded-full animate-bounce"></span>
              Live Session ({liveSessionDuration}m)
            </motion.span>
          )}
          
          {/* Connection Error Indicator */}
          {metricsError && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/80 text-white shadow-sm">
              <span className="w-2 h-2 mr-1.5 bg-red-300 rounded-full"></span>
              Connection Error
            </span>
          )}
        </div>
      </div>

      {sessionData.length > 0 && <TherapyTypeSelector />}

      {/* Enhanced Summary Stats with better visibility */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <motion.div
          whileHover={{
            y: -3,
            boxShadow: "0 8px 20px rgba(59, 130, 246, 0.25)",
          }}
          className="relative px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-br from-blue-500/90 to-blue-600/90 backdrop-blur-sm rounded-xl flex items-center gap-3 sm:gap-4 transition-all duration-200 ease-out shadow-lg border border-blue-400/20 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
            <ClockIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-xs sm:text-sm text-white/90 font-semibold uppercase tracking-wider">
              Total Time
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {activeSessionId ? 
                Math.round((totalHours + (liveSessionDuration / 60)) * 10) / 10 : 
                totalHours
              }
              <span className="text-sm sm:text-base font-medium text-white/80 ml-1">
                hours
              </span>
              {activeSessionId && (
                <span className="text-xs text-green-300 ml-1 animate-pulse">
                  (+{liveSessionDuration}m live)
                </span>
              )}
            </p>
          </div>
        </motion.div>
        <motion.div
          whileHover={{
            y: -3,
            boxShadow: "0 8px 20px rgba(16, 185, 129, 0.25)",
          }}
          className="relative px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 backdrop-blur-sm rounded-xl flex items-center gap-3 sm:gap-4 transition-all duration-200 ease-out shadow-lg border border-emerald-400/20 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
            <UsersIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-xs sm:text-sm text-white/90 font-semibold uppercase tracking-wider">
              Avg. Session
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {averageSessionLength}
              <span className="text-sm sm:text-base font-medium text-white/80 ml-1">
                mins
              </span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Simple Chart Container - Single-level wrapper */}
      <div
        className={`w-full ${isSmallScreen ? "p-1.5" : "p-4 sm:p-6"} mb-4 sm:mb-6`}
        style={{
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        {/* Just a single height container with proper centering */}
        <div
          className={isSmallScreen ? "h-[380px] w-full" : "h-[450px] w-full"}
          style={{
            minWidth: 0,
            overflow: "visible",
          }}
        >
          <ResponsiveContainer width="100%" height="100%" debounce={150}>
            <ComposedChart
              data={sessionData}
              margin={{
                top: isSmallScreen ? 5 : 10,
                right: isSmallScreen ? 15 : 40,
                left: isSmallScreen ? 20 : 40,
                bottom: isSmallScreen ? 5 : 10,
              }}
              barGap={isSmallScreen ? 2 : 4}
            >
              <defs>
                <linearGradient
                  id="sessionTimeGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9} />{" "}
                  {/* Blue-500 */}
                  <stop
                    offset="95%"
                    stopColor="#60A5FA"
                    stopOpacity={0.5}
                  />{" "}
                  {/* Blue-400 */}
                </linearGradient>
                <linearGradient
                  id="sessionCountGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#0284C7" stopOpacity={0.8} />{" "}
                  {/* Sky-700 */}
                  <stop
                    offset="95%"
                    stopColor="#38BDF8"
                    stopOpacity={0.4}
                  />{" "}
                  {/* Sky-400 */}
                </linearGradient>
                {/* New Gradient for Avg Session Length */}
                <linearGradient
                  id="avgLengthGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.5} />{" "}
                  {/* Blue-600 */}
                  <stop
                    offset="95%"
                    stopColor="#93C5FD"
                    stopOpacity={0.2}
                  />{" "}
                  {/* Blue-300 */}
                </linearGradient>
              </defs>

              <XAxis
                dataKey="monthFormatted"
                tick={{
                  fill: "#E5E7EB",
                  fontSize: isSmallScreen ? 9 : isMediumScreen ? 11 : 12,
                  fontWeight: 600,
                }}
                axisLine={{ stroke: "#60A5FA", strokeWidth: 2 }}
                tickLine={{ stroke: "#60A5FA", strokeWidth: 1 }}
                padding={{
                  left: isSmallScreen ? 5 : 15,
                  right: isSmallScreen ? 5 : 15,
                }}
                interval={isSmallScreen ? "preserveEnd" : "preserveStartEnd"}
                height={isSmallScreen ? 25 : 35}
              />

              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ 
                  fill: "#E5E7EB", 
                  fontSize: isSmallScreen ? 9 : isMediumScreen ? 11 : 12,
                  fontWeight: 600
                }}
                axisLine={{ stroke: "#60A5FA", strokeWidth: 2 }}
                tickLine={{ stroke: "#60A5FA", strokeWidth: 1 }}
                domain={[0, "dataMax + 50"]}
                width={isSmallScreen ? 35 : isMediumScreen ? 45 : 55}
                label={{
                  value: isSmallScreen ? "Min" : "Minutes",
                  angle: -90,
                  position: "insideLeft",
                  style: {
                    fill: "#DBEAFE",
                    fontSize: isSmallScreen ? 10 : isMediumScreen ? 12 : 14,
                    fontWeight: 700,
                    textAnchor: "middle",
                  },
                  offset: isSmallScreen ? 5 : 10,
                }}
                tickFormatter={(value) =>
                  isSmallScreen
                    ? Math.round(value).toString()
                    : formatNumber(value)
                }
                tickCount={isSmallScreen ? 4 : 6}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ 
                  fill: "#E5E7EB", 
                  fontSize: isSmallScreen ? 9 : isMediumScreen ? 11 : 12,
                  fontWeight: 600
                }}
                axisLine={{ stroke: "#34D399", strokeWidth: 2 }}
                tickLine={{ stroke: "#34D399", strokeWidth: 1 }}
                domain={[0, "dataMax + 5"]}
                width={isSmallScreen ? 35 : isMediumScreen ? 45 : 55}
                label={{
                  value: isSmallScreen ? "Sess" : "Sessions",
                  angle: 90,
                  position: "insideRight",
                  style: {
                    fill: "#A7F3D0",
                    fontSize: isSmallScreen ? 10 : isMediumScreen ? 12 : 14,
                    fontWeight: 700,
                    textAnchor: "middle",
                  },
                  offset: isSmallScreen ? 5 : 10,
                }}
                tickFormatter={(value) =>
                  isSmallScreen
                    ? Math.round(value).toString()
                    : formatNumber(value)
                }
                tickCount={isSmallScreen ? 3 : 5}
              />

              <Tooltip
                content={<CustomTooltip active={false} payload={[]} label="" />}
                cursor={{
                  fill: "rgba(219, 234, 254, 0.5)",
                }} /* Blue-100 with opacity */
                animationDuration={200}
                animationEasing="ease-out"
                contentStyle={{
                  backgroundColor: "rgba(31, 41, 55, 0.8)",
                  borderColor: "#4B5563",
                  overflow: 'visible',
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
                }}
                itemStyle={{ color: "#E5E7EB" }}
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ 
                  zIndex: 99999,
                  position: 'absolute',
                  left: isSmallScreen ? '-10px' : 'auto',
                  transform: isSmallScreen ? 'translateX(10px)' : 'none',
                  marginTop: isSmallScreen ? '5px' : '0',
                  pointerEvents: 'none',
                  overflow: 'visible'
                }}
              />

              <Legend
                verticalAlign="bottom"
                align="center"
                height={isSmallScreen ? 20 : 30}
                iconSize={isSmallScreen ? 5 : 8}
                margin={{ top: 0, bottom: 0 }}
                wrapperStyle={{
                  fontSize: isSmallScreen ? 7 : 10,
                  paddingTop: isSmallScreen ? '2px' : '5px',
                  paddingBottom: isSmallScreen ? '2px' : '5px'
                }}
              />

              {/* Session Time Bar */}
              <Bar
                yAxisId="left"
                dataKey="sessionTime"
                name="Total Time (mins)"
                fill="url(#sessionTimeGradient)"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
                animationEasing="ease-out"
                isAnimationActive={true}
                minPointSize={2}
                activeBar={
                  <Rectangle fill="#2563EB" opacity={0.9} />
                } /* Blue-600 */
              />

              {/* Session Count Bar */}
              <Bar
                yAxisId="right"
                dataKey="sessionCount"
                name="Sessions"
                fill="url(#sessionCountGradient)"
                radius={[4, 4, 0, 0]}
                opacity={0.9}
                animationDuration={1000}
                animationEasing="ease-out"
                animationBegin={200}
                isAnimationActive={true}
                minPointSize={2}
                activeBar={
                  <Rectangle fill="#0284C7" opacity={0.9} />
                } /* Sky-600 */
              />

              {/* Average Session Length Line/Area */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="avgSessionLength"
                name="Avg. Length (mins)"
                stroke="#1D4ED8" /* Blue-700 */
                strokeWidth={2.5}
                fillOpacity={0.3}
                fill="url(#avgLengthGradient)"
                activeDot={{
                  r: 6,
                  stroke: "#2563EB",
                  strokeWidth: 2,
                  fill: "#DBEAFE",
                }} /* Blue-600, Blue-100 */
                animationDuration={1200} // Longer duration for area
                animationBegin={400} // Stagger start further
                isAnimationActive={true}
                connectNulls={true} // Connect line over months with no data
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart annotation */}
      <div className="flex justify-center mt-2 sm:mt-3">
        <p className="text-[9px] sm:text-xs text-white italic text-center px-2">
          Hover over the chart elements for detailed insights.
        </p>
      </div>

      {/* Enhanced Insights Section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6 sm:mt-8 bg-gradient-to-br from-blue-900/40 to-blue-800/30 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-blue-400/20 shadow-2xl"
      >
        <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400/30 to-blue-500/30 flex items-center justify-center mr-3"
          >
            <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </motion.div>
          AI-Powered Session Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-blue-200/30 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              <h4 className="text-sm sm:text-base font-bold text-blue-900">
                Therapy Trends
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              {sessionData.length > 0 && totalHours > 0
                ? `You've invested ${totalHours} hours across ${
                    sessionData.filter((s) => s.sessionCount > 0).length
                  } active months. ${
                    sessionData.reduce(
                      (sum, month) => sum + month.sessionCount,
                      0
                    ) > 1
                      ? `Your average session runs ${averageSessionLength} minutes, ${
                          averageSessionLength > 45 
                            ? "allowing for deep therapeutic work" 
                            : "perfect for focused discussions"
                        }.`
                      : ""
                  }`
                : "Start your therapy journey to unlock personalized insights and track your progress over time."}
            </p>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-emerald-200/30 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
              <h4 className="text-sm sm:text-base font-bold text-emerald-900">
                Consistency Score
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              {sessionData.length > 0
                ? `Currently in ${therapyType} therapy mode. ${
                    sessionData.filter((session) => session.sessionCount > 0)
                      .length > 2
                      ? `You've maintained ${sessionData.filter((session) => session.sessionCount > 0).length} active months - ${
                          sessionData.filter((session) => session.sessionCount > 0).length >= 6
                            ? "Outstanding commitment! 🌟"
                            : sessionData.filter((session) => session.sessionCount > 0).length >= 3
                              ? "Great consistency! 💪"
                              : "Building momentum! 🚀"
                        }`
                      : "Regular sessions build stronger therapeutic relationships."
                  }`
                : "Consistent therapy scheduling is key to achieving your relationship goals."}
            </p>
          </motion.div>
          
          {sessionData.length > 1 && (
            <motion.div 
              whileHover={{ scale: 1.01, y: -2 }}
              className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 shadow-lg border border-indigo-200/30 md:col-span-2 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center mb-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></div>
                <h4 className="text-sm sm:text-base font-bold text-indigo-900">
                  Progress Analysis
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                {(() => {
                  const recentMonths = sessionData
                    .slice(-3)
                    .filter((s) => s.sessionCount > 0);
                  const totalRecentSessions = recentMonths.reduce(
                    (total, month) => total + month.sessionCount,
                    0
                  );
                  const trend =
                    recentMonths.length >= 2
                      ? recentMonths[recentMonths.length - 1].sessionTime >
                        recentMonths[0].sessionTime
                        ? "increasing"
                        : "consistent"
                      : "beginning";

                  if (totalHours > 5) {
                    return (
                      <>
                        With <span className="font-bold text-indigo-700">{totalHours} hours</span> across{" "}
                        <span className="font-bold text-indigo-700">
                          {sessionData.reduce((sum, month) => sum + month.sessionCount, 0)} sessions
                        </span>, 
                        your commitment is remarkable. Your recent engagement is{" "}
                        <span className={`font-bold ${
                          trend === "increasing" ? "text-green-700" : 
                          trend === "consistent" ? "text-blue-700" : "text-amber-700"
                        }`}>
                          {trend === "increasing" ? "growing excellently" : 
                           trend === "consistent" ? "steadily maintained" : "just beginning"}
                        </span>. 
                        Keep this momentum for transformative results! 🎯
                      </>
                    );
                  } else {
                    return (
                      <>
                        Your therapy journey includes{" "}
                        <span className="font-bold text-indigo-700">{totalRecentSessions} recent sessions</span>.{" "}
                        {trend === "increasing" ? "Your growing dedication" : "Maintaining this pattern"}{" "}
                        can lead to <span className="font-bold text-green-700">meaningful breakthroughs</span>{" "}
                        within 3-6 months. Every session is a step forward! 🌱
                      </>
                    );
                  }
                })()}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
