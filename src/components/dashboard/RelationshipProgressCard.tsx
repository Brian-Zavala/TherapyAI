"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  AreaChart,
} from "recharts";
import { motion } from "framer-motion";

// Define types for better clarity (optional but recommended)
type DataPoint = {
  name: string;
  closeness: number;
  communication: number;
  amt: number;
  notes?: string;
  insight?: string;
  sessionId?: string;
  date?: string;
  sessionNumber?: number;
  qualityScore?: number;
  trends?: { closeness: number; communication: number };
};

type ChartMetrics = {
  overallChange: {
    closeness: number;
    communication: number;
  };
  averages: {
    closeness: number;
    communication: number;
    quality: number;
  };
  recentProgress: {
    closeness: number;
    communication: number;
  };
} | null;

export default function RelationshipProgressCard() {
  // --- State Hooks ---
  const [therapyType, setTherapyType] = useState("couple");
  const [timeframe, setTimeframe] = useState("all"); // 'week', 'month', 'all'
  const [data, setData] = useState<DataPoint[]>([]); // Use the type
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"loading" | "api" | "sample">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null); // Type the error
  const [chartType, setChartType] = useState<"line" | "area" | "composed">(
    "line"
  );
  const [chartMetrics, setChartMetrics] = useState<ChartMetrics>(null); // Moved UP
  const [isSmallScreen, setIsSmallScreen] = useState(false); // Track small screen size

  // --- Helper Functions & Callbacks (Defined using useCallback/useMemo) ---

  // Function to navigate to session transcript if available
  const viewSessionTranscript = useCallback((sessionId?: string) => {
    // Changed to useCallback
    if (sessionId) {
      console.log("Navigating to session transcript:", sessionId);
      // Use window.location for navigation
      // Consider using Next.js router.push for SPA navigation if available
      if (typeof window !== "undefined") {
        window.location.href = `/dashboard/sessions?session=${sessionId}`;
      }
    }
  }, []); // Empty dependency array

  // Calculate chart metrics
  const getChartMetrics = useCallback(
    (dataArr: DataPoint[]): ChartMetrics | null => {
      // Added type safety
      if (!dataArr || !dataArr.length) return null;

      const firstEntry = dataArr[0];
      const lastEntry = dataArr[dataArr.length - 1];

      return {
        overallChange: {
          closeness: Math.round(lastEntry.closeness - firstEntry.closeness), // Rounding for cleaner display
          communication: Math.round(
            lastEntry.communication - firstEntry.communication
          ),
        },
        averages: {
          closeness: Math.round(
            dataArr.reduce((sum, item) => sum + item.closeness, 0) /
              dataArr.length
          ),
          communication: Math.round(
            dataArr.reduce((sum, item) => sum + item.communication, 0) /
              dataArr.length
          ),
          quality: Math.round(
            dataArr.reduce(
              (sum, item) =>
                sum +
                (item.qualityScore ||
                  Math.round((item.closeness + item.communication) / 2)),
              0
            ) / dataArr.length
          ),
        },
        recentProgress:
          dataArr.length > 1
            ? {
                closeness: Math.round(
                  lastEntry.closeness - dataArr[dataArr.length - 2].closeness
                ), // Rounding
                communication: Math.round(
                  lastEntry.communication -
                    dataArr[dataArr.length - 2].communication
                ),
              }
            : { closeness: 0, communication: 0 },
      };
    },
    []
  ); // Empty dependency array

  // --- Effect Hooks ---

  // Track screen size for responsive design
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 432);
    };

    // Check initial size
    checkScreenSize();

    // Add resize listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch real data from API, fallback to mock data if needed
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setDataSource("loading");
      console.log(
        `Workspaceing data for ${therapyType} therapy, timeframe: ${timeframe}`
      );

      try {
        // Fetch data from the API with timeframe parameter
        const response = await fetch(
          `/api/dashboard/relationship-progress?type=${therapyType}&timeframe=${timeframe}`
        );

        if (!response.ok) {
          // Provide more context on API failure
          let errorBody = `Status: ${response.status}`;
          try {
            const text = await response.text();
            errorBody += `, Body: ${text.substring(0, 100)}`; // Log first 100 chars
          } catch (parseError) {}
          throw new Error(`API error: ${errorBody}`);
        }

        const apiData = await response.json();
        console.log("API returned data:", apiData);

        // Check if we got valid data
        if (
          Array.isArray(apiData) &&
          apiData.length > 0 &&
          apiData[0].hasOwnProperty("closeness") &&
          apiData[0].hasOwnProperty("communication")
        ) {
          // Transform API data to match our chart format
          const formattedData: DataPoint[] = apiData.map((item) => ({
            name: item.week || item.date || `Entry ${item.sessionNumber || ""}`, // Fallback for name
            closeness: Number(item.closeness) || 0, // Ensure number
            communication: Number(item.communication) || 0, // Ensure number
            amt: 100,
            // Keep additional fields for tooltip/details
            notes: item.notes,
            insight: item.insight,
            sessionId: item.sessionId,
            date: item.date,
            sessionNumber: item.sessionNumber,
            qualityScore: item.qualityScore
              ? Number(item.qualityScore)
              : Math.round(
                  (Number(item.closeness || 0) +
                    Number(item.communication || 0)) /
                    2
                ), // Ensure number and calculate
            trends: item.trends || { closeness: 0, communication: 0 },
          }));

          setData(formattedData);
          setDataSource("api");
          console.log("Using real data from API");
        } else {
          // If API returned invalid/empty data, show empty state
          console.log(
            "API returned invalid or empty data, showing empty state"
          );
          setData([]);
          setDataSource("api");
          setError("No relationship data found for the selected timeframe.");
        }
      } catch (error: any) {
        // Catch specific type if possible, otherwise 'any' or 'unknown'
        console.error("Error fetching relationship progress data:", error);
        // On error, show empty state
        console.log("Error fetching data, showing empty state");
        setData([]);
        setDataSource("api");
        setError(`Error loading data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [therapyType, timeframe]); // Removed unused dependency

  // Calculate metrics from data - Moved UP, effect depends on data and getChartMetrics
  useEffect(() => {
    if (data && data.length > 0) {
      setChartMetrics(getChartMetrics(data));
    } else {
      setChartMetrics(null);
    }
  }, [data, getChartMetrics]); // Dependencies are data and the memoized function

  // --- Memoized UI Components & Values ---

  const TimeframeSelector = useMemo(() => {
    return () => (
      <div className="flex justify-center mb-2 mt-1">
        <div className="inline-flex p-1 bg-blue-600/90 rounded-lg shadow-md text-xs backdrop-blur-sm border border-white/20">
          <button
            onClick={() => setTimeframe("week")}
            className={`px-2 py-1.5 text-xs font-medium rounded-md ${
              timeframe === "week"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeframe("month")}
            className={`px-2 py-1.5 text-xs font-medium rounded-md ${
              timeframe === "month"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeframe("all")}
            className={`px-2 py-1.5 text-xs font-medium rounded-md ${
              timeframe === "all"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            All Time
          </button>
        </div>
      </div>
    );
  }, [timeframe]); // Depends on timeframe state

  const ChartTypeSelector = useMemo(() => {
    return () => (
      <div className="flex justify-center mt-1 mb-2">
        <div className="inline-flex p-1 bg-blue-600/90 rounded-lg shadow-md text-xs backdrop-blur-sm border border-white/20">
          <button
            onClick={() => setChartType("line")}
            className={`px-2 py-1.5 text-xs font-medium rounded-md ${
              chartType === "line"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType("area")}
            className={`px-2 py-1.5 text-xs font-medium rounded-md ${
              chartType === "area"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Area
          </button>
          <button
            onClick={() => setChartType("composed")}
            className={`px-2 py-1.5 text-xs font-medium rounded-md ${
              chartType === "composed"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Combined
          </button>
        </div>
      </div>
    );
  }, [chartType]); // Depends on chartType state

  const TherapyTypeSelector = useMemo(() => {
    return () => (
      <div className="flex justify-center mb-2">
        <div className="inline-flex p-1 bg-blue-600/90 rounded-lg shadow-md backdrop-blur-sm border border-white/20">
          <button
            onClick={() => setTherapyType("couple")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              therapyType === "couple"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Couple
          </button>
          <button
            onClick={() => setTherapyType("family")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              therapyType === "family"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Family
          </button>
        </div>
      </div>
    );
  }, [therapyType]); // Depends on therapyType state

  // Enhanced tooltip for the chart - using memo to avoid hooks error
  const CustomTooltip = useMemo(() => {
    // The component returned here is memoized based on dependencies below
    return ({ active, payload, label }: any): JSX.Element | null => {
      // Consider adding more specific types for payload
      if (active && payload && payload.length) {
        // Ensure payload[0] and its payload exist before accessing
        const dataPoint: DataPoint | undefined = payload[0]?.payload;

        if (!dataPoint) return null; // Guard clause

        // Default quality score calculation if needed
        const qualityScore =
          dataPoint.qualityScore ??
          Math.round((dataPoint.closeness + dataPoint.communication) / 2);

        return (
          <div className="bg-white p-4 shadow-md rounded-md border border-gray-200 max-w-[280px] text-xs">
            {" "}
            {/* Adjusted max-width and font size */}
            <p className="font-semibold text-gray-800 mb-2">{label}</p>
            {/* Show session number if available */}
            {dataPoint.sessionNumber != null && ( // Check for null/undefined explicitly
              <p className="text-xs text-gray-500 mb-1">
                Session #{dataPoint.sessionNumber}
              </p>
            )}
            <div className="space-y-1.5">
              {" "}
              {/* Reduced space */}
              <p className="flex items-center justify-between">
                <span className="flex items-center text-gray-700">
                  <span className="inline-block w-2.5 h-2.5 bg-purple-500 rounded-full mr-1.5"></span>
                  Closeness:
                </span>
                <span className="font-medium text-gray-900">
                  {payload[0]?.value ?? "N/A"}/100
                </span>
              </p>
              {payload[1] && ( // Check if second payload item exists
                <p className="flex items-center justify-between">
                  <span className="flex items-center text-gray-700">
                    <span className="inline-block w-2.5 h-2.5 bg-pink-500 rounded-full mr-1.5"></span>
                    Communication:
                  </span>
                  <span className="font-medium text-gray-900">
                    {payload[1]?.value ?? "N/A"}/100
                  </span>
                </p>
              )}
              {chartType === "composed" && ( // No need to check payload length here, just use calculated score
                <p className="flex items-center justify-between">
                  <span className="flex items-center text-gray-700">
                    <span className="inline-block w-2.5 h-2.5 bg-emerald-400 rounded-full mr-1.5"></span>
                    Overall Quality:
                  </span>
                  <span className="font-medium text-gray-900">
                    {qualityScore}/100
                  </span>
                </p>
              )}
            </div>
            {/* Show insight if available */}
            {dataPoint.insight && (
              <div className="mt-2 pt-1.5 border-t border-gray-100">
                <p className="text-xs italic text-gray-600">
                  {dataPoint.insight}
                </p>
              </div>
            )}
            {/* Show notes if available */}
            {dataPoint.notes &&
              dataPoint.notes !== "Sample data for demonstration" && (
                <div className="mt-2 pt-1.5 border-t border-gray-100">
                  <p className="text-xs text-gray-500 line-clamp-3">
                    {/* Allow more lines */}
                    <span className="font-medium text-gray-600">
                      Notes:
                    </span>{" "}
                    {dataPoint.notes}
                  </p>
                </div>
              )}
            {/* Link to session transcript if available */}
            {dataPoint.sessionId && (
              <button
                onClick={() => dataPoint.sessionId && viewSessionTranscript(dataPoint.sessionId)}
                className="mt-2 pt-1.5 border-t border-gray-100 w-full text-left text-xs flex items-center text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                disabled={!dataPoint.sessionId} // Disable if no ID
              >
                <svg
                  className="w-3 h-3 mr-1 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                View Session Transcript
              </button>
            )}
          </div>
        );
      }
      return null;
    };
  }, [chartType, viewSessionTranscript]); // Depends on chartType and the memoized function

  // Chart title based on therapy type
  const chartTitle = useMemo(
    () =>
      // Memoize chart title calculation
      therapyType === "couple"
        ? "Relationship Progress"
        : "Family Relationship Progress",
    [therapyType]
  );

  // Render chart based on selected type
  const renderChart = useMemo(() => {
    const commonProps = {
      data: data,
      margin: { 
        top: isSmallScreen ? 10 : 15, 
        right: isSmallScreen ? 20 : 40, 
        left: isSmallScreen ? 30 : 40, 
        bottom: isSmallScreen ? 20 : 30 
      },
      className: "mx-auto"
    };
    const xAxis = (
      <XAxis
        dataKey="name"
        tick={{ fontSize: 11, fill: "#9CA3AF" }}
        tickMargin={10}
        height={40}
        interval="preserveStartEnd"
        stroke="#9CA3AF"
      />
    );
    const yAxis = (
      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9CA3AF" }} width={40} stroke="#9CA3AF" tickMargin={10} />
    );
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="#374151" />;
    const tooltip = (
      <Tooltip 
        content={CustomTooltip} 
        contentStyle={{
          backgroundColor: "rgba(31, 41, 55, 0.8)",
          borderColor: "#4B5563"
        }}
        itemStyle={{ color: "#E5E7EB" }} 
        allowEscapeViewBox={{ x: true, y: true }}
      />
    ); // Ensure tooltip is above other elements
    const legend = <Legend 
      verticalAlign="bottom" 
      height={40} 
      iconSize={10} 
      align="center"
    />;
    const refLine = (
      <ReferenceLine
        y={50}
        stroke="#ddd"
        strokeDasharray="3 3"
        label={{
          value: "Mid",
          position: "insideLeft",
          fontSize: 10,
          fill: "#aaa",
        }}
      />
    );

    const lineProps = {
      type: "monotone",
      strokeWidth: 2.5,
      dot: { r: 3, strokeWidth: 1 }, // Slightly smaller dot
      activeDot: { r: 6, strokeWidth: 2 },
      isAnimationActive: true, // Consider setting to false if performance is an issue
      animationDuration: 800, // Slightly faster animation
    } as const;

    const areaProps = {
      type: "monotone",
      fillOpacity: 0.4,
      strokeWidth: 2,
      activeDot: { r: 6 },
      isAnimationActive: true,
      animationDuration: 800,
    } as const;

    if (chartType === "line") {
      return (
        <LineChart {...commonProps}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {legend}
          {refLine}
          <Line
            {...lineProps}
            dataKey="closeness"
            stroke="#8B5CF6"
            name="Closeness"
          />
          <Line
            {...lineProps}
            dataKey="communication"
            stroke="#EC4899"
            name="Communication"
            animationBegin={200}
          />
        </LineChart>
      );
    } else if (chartType === "area") {
      return (
        <AreaChart {...commonProps}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {legend}
          {/* Ensure definitions for gradients if using them */}
          <defs>
            <linearGradient id="colorCloseness" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorCommunication" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EC4899" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#EC4899" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <Area
            {...areaProps}
            dataKey="closeness"
            stroke="#8B5CF6"
            fill="url(#colorCloseness)"
            name="Closeness"
          />
          <Area
            {...areaProps}
            dataKey="communication"
            stroke="#EC4899"
            fill="url(#colorCommunication)"
            name="Communication"
          />
        </AreaChart>
      );
    } else if (chartType === "composed") {
      // Calculate qualityScore directly here if not reliably in data
      const composedData = data.map((d) => ({
        ...d,
        qualityScore:
          d.qualityScore ?? Math.round((d.closeness + d.communication) / 2),
      }));

      return (
        <ComposedChart {...commonProps} data={composedData}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {legend}
          {refLine}
          <defs>
            <linearGradient id="colorQuality" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <Area
            {...areaProps}
            dataKey="qualityScore"
            stroke="#10b981"
            fill="url(#colorQuality)"
            name="Overall Quality"
            animationDuration={600} // Different duration maybe
          />
          <Line
            {...lineProps}
            dataKey="closeness"
            stroke="#8B5CF6"
            name="Closeness"
            animationBegin={100}
          />
          <Line
            {...lineProps}
            dataKey="communication"
            stroke="#EC4899"
            name="Communication"
            animationBegin={300}
          />
        </ComposedChart>
      );
    }
    return null; // Should not happen with current logic, but good practice
  }, [chartType, data, CustomTooltip, isSmallScreen]); // Added CustomTooltip and isSmallScreen as dependencies

  // --- Conditional Rendering (Loading State) ---
  // Now this check happens AFTER all hooks have been called
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-purple-600">
            Loading relationship progress data...
          </p>
        </div>
      </div>
    );
  }

  // --- Helper Component for Metrics ---
  const ProgressIndicator = ({
    value,
    label,
    bgColor,
    textColor,
  }: {
    value: number;
    label: string;
    bgColor: string;
    textColor: string;
  }) => (
    <div className={`${bgColor} p-3 rounded-lg flex-1`}>
      <p className={`text-xs ${textColor} font-semibold mb-1`}>{label}</p>{" "}
      {/* Added margin bottom */}
      <div className="flex items-baseline">
        <p className={`text-xl md:text-2xl font-bold ${textColor}`}>
          {value > 0 ? `+${value}` : value} {/* Always show sign */}
        </p>
        {/* Simplified points display */}
        <span
          className={`ml-1.5 text-xs font-medium ${value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-500"}`}
        >
          pts change
        </span>
      </div>
    </div>
  );

  // --- Final Render ---
  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-center sm:justify-end sm:items-center mb- rounded-lg p-3">
        <div className="flex space-x-2 mb-2 sm:mb-0 items-center">
          {" "}
          {/* Added items-center */}
          {dataSource === "api" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/80 text-white shadow-sm">
              <span className="w-2 h-2 mr-1.5 bg-green-300 rounded-full animate-pulse"></span>{" "}
              {/* Added pulse */}
              Live Data
            </span>
          )}
          {dataSource === "sample" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/80 text-white shadow-sm">
              <span className="w-2 h-2 mr-1.5 bg-amber-300 rounded-full"></span>
              Sample Data
            </span>
          )}
          {dataSource === "loading" && ( // Added loading indicator here too
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/80 text-white shadow-sm">
              <svg
                className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white"
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
              Loading...
            </span>
          )}
        </div>
      </div>

      {/* Controls section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        {" "}
        {/* Adjusted margin */}
        <div className="md:col-span-1">
          <TherapyTypeSelector />
        </div>
        <div className="md:col-span-1">
          <TimeframeSelector />
        </div>
        <div className="md:col-span-1">
          <ChartTypeSelector />
        </div>
      </div>

      {/* Error message if present */}
      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs mb-3"
          role="alert"
        >
          <span className="font-medium">Warning:</span> {error}
        </div>
      )}

      {/* Chart container with responsive height and proper centering */}
      {data.length > 0 ? (
        <motion.div 
          className="w-full max-w-[900px] mx-auto bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30 p-3 sm:p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={`${isSmallScreen ? 'h-[380px]' : 'h-[420px]'} w-full overflow-hidden relative`}>
            <ResponsiveContainer width="100%" height="100%" debounce={150}>
              {renderChart}
            </ResponsiveContainer>
          </div>
        </motion.div>
      ) : (
        // Display message when no data is available (after loading finishes)
        !loading && (
          <div className="w-full h-[250px] sm:h-[300px] md:h-[340px] flex items-center justify-center text-center border border-dashed border-white/50 rounded-md bg-white/60 shadow-md">
            <div>
              <svg
                className="mx-auto h-12 w-12 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m-1.5-6.354a7.5 7.5 0 11-10.606 0M12 6v1m0 9v1m-4.243-3.757l.707-.707M15.536 8.464l.707.707M6.757 17.243l-.707.707M17.243 6.757l-.707-.707"
                />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-blue-800">
                No Data Available
              </h3>
              <p className="mt-1 text-sm text-blue-600">
                {error
                  ? "Could not load relationship data."
                  : "There is no relationship data for the selected timeframe."}
              </p>
            </div>
          </div>
        )
      )}

      {/* Enhanced metrics display */}
      {/* Only show metrics if data is present and metrics are calculated */}
      {data.length > 0 && chartMetrics && (
        <div className="mt-4 bg-blue-700/50 p-4 rounded-lg shadow-md">
          <h4 className="text-xs text-white uppercase tracking-wider mb-2 font-bold">
            Therapy Progress Metrics ({timeframe})
          </h4>{" "}
          {/* Added timeframe context */}
          {/* Upper metrics row: Averages */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div className="bg-white/80 shadow-md p-3 rounded-lg text-center">
              {" "}
              {/* Centered text */}
              <p className="text-xs text-blue-700 font-semibold mb-0.5">
                Avg Closeness
              </p>{" "}
              {/* Shortened label */}
              <p className="text-2xl font-bold text-blue-800">
                {chartMetrics.averages.closeness}
                <span className="text-xs font-normal text-blue-600">/100</span>
              </p>
            </div>
            <div className="bg-white/80 shadow-md p-3 rounded-lg text-center">
              <p className="text-xs text-pink-700 font-semibold mb-0.5">
                Avg Communication
              </p>
              <p className="text-2xl font-bold text-pink-800">
                {chartMetrics.averages.communication}
                <span className="text-xs font-normal text-pink-600">/100</span>
              </p>
            </div>
            <div className="bg-white/80 shadow-md p-3 rounded-lg col-span-2 md:col-span-1 mt-2 md:mt-0 text-center">
              <p className="text-xs text-emerald-700 font-semibold mb-0.5">
                Avg Relationship Quality
              </p>
              <p className="text-2xl font-bold text-emerald-800">
                {chartMetrics.averages.quality}
                <span className="text-xs font-normal text-emerald-600">
                  /100
                </span>
              </p>
            </div>
          </div>
          {/* Lower metrics row: Progress indicators */}
          <h4 className="text-xs text-white uppercase tracking-wider mt-4 mb-2 font-bold bg-blue-800/60 p-2 rounded-lg">
            Overall Change ({timeframe})
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {" "}
            {/* Removed mt-2, added above heading */}
            <ProgressIndicator
              value={chartMetrics.overallChange.closeness}
              label="Closeness Change"
              bgColor="bg-white/80 shadow-md"
              textColor="text-blue-800"
            />
            <ProgressIndicator
              value={chartMetrics.overallChange.communication}
              label="Communication Change"
              bgColor="bg-white/80 shadow-md"
              textColor="text-pink-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}
