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
  }

  const [sessionData, setSessionData] = useState<SessionDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalHours, setTotalHours] = useState(0);
  const [averageSessionLength, setAverageSessionLength] = useState(0);
  const [therapyType, setTherapyType] = useState("couple"); // 'couple', 'solo', or 'family'
  const [isSmallScreen, setIsSmallScreen] = useState(false);

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
      setIsSmallScreen(window.innerWidth < 432);
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
        className="min-h-[630px] sm:min-h-[580px] md:min-h-[600px] lg:min-h-[620px] flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/30 p-6 rounded-xl shadow-lg" // Added glass styling
      >
        <div className="flex flex-col items-center px-4">
          {/* Enhanced Spinner */}
          <svg
            className="animate-spin h-8 w-8 sm:h-10 sm:w-10 text-blue-600"
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
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="mt-4 text-white font-medium text-xs sm:text-sm text-center">
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
        className="min-h-[630px] sm:min-h-[580px] md:min-h-[600px] lg:min-h-[620px] flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/30 p-6 rounded-xl shadow-lg" // Added glass styling to match loading state
      >
        <div className="text-center p-4 sm:p-6 bg-white/90 border border-red-200 rounded-lg w-full max-w-[90%] sm:max-w-md shadow-md">
          <ExclamationTriangleIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-red-500 mb-3" />
          <p className="text-base sm:text-lg font-semibold text-red-800">
            Couldn&apos;t load session data
          </p>
          <p className="text-xs sm:text-sm mt-2 text-red-600">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fetchSessionData(therapyType)} // Add a retry button
            className="mt-3 sm:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            Try Again
          </motion.button>
        </div>
      </motion.div>
    );

  // --- Reusable Therapy Type Selector ---
  const TherapyTypeSelector = () => (
    <div className="flex justify-center mb-4 px-2 sm:px-0">
      {/* Updated to blue color scheme */}
      <div className="inline-flex p-1.5 bg-transparent rounded-lg shadow-sm w-full max-w-full sm:max-w-xs md:max-w-sm overflow-x-auto">
        {["couple", "solo", "family"].map((type) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setTherapyType(type)}
            className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors duration-200 ease-in-out flex-1 min-w-[60px] sm:min-w-[70px] ${
              therapyType === type
                ? "bg-blue-600 text-white shadow-md"
                : "text-blue-500/70 hover:bg-blue-600/10"
            }`}
            layout
          >
            {/* Capitalize first letter */}
            {type.charAt(0).toUpperCase() + type.slice(1)}
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
        className="min-h-[630px] sm:min-h-[580px] md:min-h-[600px] lg:min-h-[620px] flex flex-col mb-6 sm:mb-0 bg-white/15 backdrop-blur-sm border border-white/30 p-6 rounded-xl shadow-lg" // Added glass styling to match loading state
      >
        <TherapyTypeSelector />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center p-4 sm:p-6 bg-white/90 border border-blue-100 rounded-lg w-full max-w-[90%] sm:max-w-sm shadow-md">
            <DocumentChartBarIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-blue-500 mb-3 sm:mb-4" />
            <p className="text-base sm:text-lg font-medium text-blue-800">
              No {therapyType} sessions recorded yet
            </p>
            <p className="text-xs sm:text-sm mt-2 text-blue-600">
              Start logging your {therapyType} therapy sessions to visualize
              your progress and insights over time.
            </p>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="mt-4 sm:mt-5 px-4 sm:px-5 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition-all duration-150 ease-in-out shadow hover:shadow-md"
              onClick={() => (window.location.href = "/dashboard/therapy")} // Assuming this is the correct link
            >
              Log First Session
            </motion.button>
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

      return (
        <div className={`bg-white ${isSmallScreen ? 'p-3' : 'p-4'} shadow-xl rounded-lg border border-gray-200 ${isSmallScreen ? 'min-w-[200px]' : 'min-w-[250px]'}`}>
          <p className={`font-semibold text-blue-900 ${isSmallScreen ? 'mb-2' : 'mb-3'} border-b pb-2 ${isSmallScreen ? 'text-sm' : ''}`}>
            {monthData.month}
          </p>
          <div className={isSmallScreen ? "space-y-1.5" : "space-y-2"}>
            {/* Total Time */}
            <div className={`flex items-center justify-between ${isSmallScreen ? 'text-xs' : 'text-sm'}`}>
              <div className="flex items-center text-gray-700">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2 flex-shrink-0"></span>
                Total Time:
              </div>
              <span className="font-medium text-gray-800">
                {formatNumber(monthData.sessionTime)} mins
                <span className="text-xs text-blue-500 ml-1">
                  ({Math.round((monthData.sessionTime / 60) * 10) / 10} hrs)
                </span>
              </span>
            </div>

            {/* Session Count */}
            <div className={`flex items-center justify-between ${isSmallScreen ? 'text-xs' : 'text-sm'}`}>
              <div className="flex items-center text-gray-700">
                <span className="inline-block w-3 h-3 bg-teal-500 rounded-full mr-2 flex-shrink-0"></span>
                Sessions:
              </div>
              <span className="font-medium text-gray-800">
                {formatNumber(monthData.sessionCount)}
              </span>
            </div>

            {/* Average Session Length */}
            <div className={`flex items-center justify-between ${isSmallScreen ? 'text-xs' : 'text-sm'}`}>
              <div className="flex items-center text-gray-700">
                <span className="inline-block w-3 h-3 bg-violet-500 rounded-full mr-2 flex-shrink-0"></span>
                Avg. Length:
              </div>
              <span className="font-medium text-gray-800">
                {formatNumber(monthData.avgSessionLength)} mins
              </span>
            </div>

            {/* Growth Indicator */}
            {monthData.growth !== undefined && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <div className={`flex items-center justify-between ${isSmallScreen ? 'text-xs' : 'text-sm'}`}>
                  <div className="flex items-center text-gray-700">
                    <span className="inline-block w-3 h-3 bg-amber-400 rounded-full mr-2 flex-shrink-0"></span>
                    Monthly Time Growth:
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
                <p className={`${isSmallScreen ? 'text-[10px]' : 'text-xs'} text-gray-500 mt-1 text-right`}>
                  vs. previous month
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
      className="min-h-[630px] sm:min-h-[580px] md:min-h-[600px] lg:min-h-[620px] mb-4 sm:mb-0 flex flex-col p-6 w-full"
      style={{
        maxWidth: "100%",
        overflowX: "hidden",
        paddingLeft: isSmallScreen ? "12px" : undefined,
        paddingRight: isSmallScreen ? "12px" : undefined,
      }}
    >
      <TherapyTypeSelector />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <motion.div
          whileHover={{
            y: -3,
            boxShadow: "0 4px 10px rgba(59, 130, 246, 0.2)",
          }}
          className="px-3 sm:px-4 py-2 sm:py-3 bg-white/80 border border-blue-100 rounded-lg flex items-center gap-2 sm:gap-3 transition-all duration-150 ease-in-out shadow-sm"
        >
          <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-[10px] sm:text-xs text-blue-600 font-medium uppercase tracking-wide">
              Total Time
            </p>
            <p className="text-lg sm:text-xl font-bold text-blue-800">
              {totalHours}
              <span className="text-xs sm:text-sm font-medium text-blue-500 ml-1">
                hours
              </span>
            </p>
          </div>
        </motion.div>
        <motion.div
          whileHover={{
            y: -3,
            boxShadow: "0 4px 10px rgba(20, 184, 166, 0.2)",
          }}
          className="px-3 sm:px-4 py-2 sm:py-3 bg-white/80 border border-blue-100 rounded-lg flex items-center gap-2 sm:gap-3 transition-all duration-150 ease-in-out shadow-sm"
        >
          <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-[10px] sm:text-xs text-blue-600 font-medium uppercase tracking-wide">
              Overall Avg. Session
            </p>
            <p className="text-lg sm:text-xl font-bold text-blue-800">
              {averageSessionLength}
              <span className="text-xs sm:text-sm font-medium text-blue-500 ml-1">
                mins
              </span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Simple Chart Container - Single-level wrapper */}
      <div 
        className={`w-full bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30 ${isSmallScreen ? 'p-2' : 'p-4 sm:p-6'} mb-6`}
        style={{
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        {/* Just a single height container with proper centering */}
        <div 
          className={isSmallScreen ? "h-[400px] w-full" : "h-[450px] w-full"}
          style={{
            minWidth: 0,
            overflow: "visible",
          }}
        >
          <ResponsiveContainer width="100%" height="100%" debounce={150}>
            <ComposedChart
              data={sessionData}
              margin={{
                top: 10,
                right: isSmallScreen ? 20 : 40,
                left: isSmallScreen ? 30 : 40,
                bottom: 10
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
                    fill: "#9CA3AF",
                    fontSize: isSmallScreen ? 8 : 10,
                    fontWeight: 500,
                  }}
                  axisLine={{ stroke: "#374151", strokeWidth: 1 }}
                  tickLine={false}
                  padding={{ left: isSmallScreen ? 5 : 10, right: isSmallScreen ? 5 : 10 }}
                  interval={isSmallScreen ? "preserveEnd" : "preserveStartEnd"}
                  height={isSmallScreen ? 25 : 30}
                />

                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fill: "#9CA3AF", fontSize: isSmallScreen ? 8 : 10 }}
                  axisLine={{ stroke: "#374151" }}
                  tickLine={false}
                  domain={[0, "dataMax + 50"]}
                  width={isSmallScreen ? 30 : 40}
                  label={{
                    value: "Minutes",
                    angle: -90,
                    position: "insideLeft",
                    style: {
                      fill: "#9CA3AF",
                      fontSize: isSmallScreen ? 9 : 11,
                      fontWeight: 500,
                      textAnchor: "middle",
                    },
                    offset: isSmallScreen ? 3 : 5,
                  }}
                  tickFormatter={(value) => isSmallScreen ? Math.round(value).toString() : formatNumber(value)}
                  tickCount={isSmallScreen ? 4 : 5}
                />

                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#9CA3AF", fontSize: isSmallScreen ? 8 : 10 }}
                  axisLine={{ stroke: "#374151" }}
                  tickLine={false}
                  domain={[0, "dataMax + 5"]}
                  width={isSmallScreen ? 30 : 40}
                  label={{
                    value: "Sessions",
                    angle: 90,
                    position: "insideRight",
                    style: {
                      fill: "#9CA3AF",
                      fontSize: isSmallScreen ? 9 : 11,
                      fontWeight: 500,
                      textAnchor: "middle",
                    },
                    offset: isSmallScreen ? 3 : 5,
                  }}
                  tickFormatter={(value) => isSmallScreen ? Math.round(value).toString() : formatNumber(value)}
                  tickCount={isSmallScreen ? 3 : 4}
                />

                <Tooltip
                  content={
                    <CustomTooltip active={false} payload={[]} label="" />
                  }
                  cursor={{
                    fill: "rgba(219, 234, 254, 0.5)",
                  }} /* Blue-100 with opacity */
                  animationDuration={200}
                  animationEasing="ease-out"
                  contentStyle={{
                    backgroundColor: "rgba(31, 41, 55, 0.8)",
                    borderColor: "#4B5563",
                  }}
                  itemStyle={{ color: "#E5E7EB" }}
                  allowEscapeViewBox={{ x: true, y: true }}
                />

                <Legend
                  verticalAlign="bottom"
                  align="center"
                  height={isSmallScreen ? 25 : 30}
                  iconSize={isSmallScreen ? 6 : 8}
                  margin={{ top: 0, bottom: 0 }}
                  wrapperStyle={{
                    fontSize: isSmallScreen ? 8 : 10,
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

      {/* Insights Section */}
      <div className="mt-6 sm:mt-4 bg-white/80 rounded-lg p-3 sm:p-4 border border-blue-100 w-auto overflow-hidden shadow-md">
        <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-2">
          Session Insights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full">
          <div className="bg-white/90 rounded p-3 shadow-sm border border-blue-50">
            <h4 className="text-xs sm:text-sm font-medium text-blue-700 mb-1">
              Trends
            </h4>
            <p className="text-xs text-gray-600">
              {sessionData.length > 0 && totalHours > 0
                ? `You've spent ${totalHours} hours in therapy over ${
                    sessionData.filter((s) => s.sessionCount > 0).length
                  } active months. ${
                    sessionData.reduce(
                      (sum, month) => sum + month.sessionCount,
                      0
                    ) > 1
                      ? `Your average session length is ${averageSessionLength} minutes.`
                      : ""
                  }`
                : "Start booking regular sessions to see your therapy trends over time."}
            </p>
          </div>
          <div className="bg-white/90 rounded p-3 shadow-sm border border-blue-50">
            <h4 className="text-xs sm:text-sm font-medium text-blue-700 mb-1">
              Consistency
            </h4>
            <p className="text-xs text-gray-600">
              {sessionData.length > 0
                ? `Your current therapy type is ${therapyType}. ${
                    sessionData.filter((session) => session.sessionCount > 0)
                      .length > 2
                      ? `You've been consistent with ${sessionData.filter((session) => session.sessionCount > 0).length} active months.`
                      : "Regular sessions can lead to better outcomes."
                  }`
                : "Consistent therapy scheduling helps build momentum toward your goals."}
            </p>
          </div>
          {sessionData.length > 1 && (
            <div className="bg-white/90 rounded p-3 shadow-sm border border-blue-50 sm:col-span-2">
              <h4 className="text-xs sm:text-sm font-medium text-blue-700 mb-1">
                Progress Analysis
              </h4>
              <p className="text-xs text-gray-600">
                {(() => {
                  // Get recent months with sessions
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
                    return `With ${totalHours} hours across ${sessionData.reduce((sum, month) => sum + month.sessionCount, 0)} 
                       sessions, your time investment is significant. Your recent engagement is ${
                         trend === "increasing"
                           ? "growing well"
                           : trend === "consistent"
                             ? "steadily maintained"
                             : "just starting"
                       }.`;
                  } else {
                    return `Your therapy journey shows ${totalRecentSessions} recent sessions. 
                       ${trend === "increasing" ? "Your growing commitment" : "Continuing this pattern"} 
                       can lead to meaningful relationship improvements over 3-6 months.`;
                  }
                })()}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
