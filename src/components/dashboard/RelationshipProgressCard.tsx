"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { createPortal } from "react-dom";

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
  // --- Refs ---
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  
  // Dropdown click outside handler removed
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640);
      setIsLargeScreen(window.innerWidth >= 1024);
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
            "API returned empty data, showing empty state"
          );
          setData([]);
          setDataSource("api");
          // Don't set error for empty data, just show the empty state
          setError(null);
        }
      } catch (error: any) {
        // Catch specific type if possible, otherwise 'any' or 'unknown'
        console.error("Error fetching relationship progress data:", error);
        // On error, show empty state
        console.log("Error fetching data, showing empty state");
        setData([]);
        setDataSource("api");
        // Only set error for actual failures, not empty data
        if (error.message && !error.message.includes("No relationship data")) {
          setError(`Error loading data: ${error.message}`);
        } else {
          setError(null);
        }
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

  // --- Custom Portal Tooltip Component ---
interface PortalTooltipProps {
  active?: boolean;
  payload?: Array<any>;
  label?: string;
  x?: number;
  y?: number;
  chartType: string;
  isSmallScreen: boolean;
  viewSessionTranscript: (sessionId?: string) => void;
  offset?: number; // Add offset parameter to determine arrow placement
  onHoverChange?: (isHovering: boolean) => void; // Callback for hover state changes
}

// Component to render tooltip with portal
const PortalTooltip = ({ active, payload, label, x, y, chartType, isSmallScreen, viewSessionTranscript, offset = 30, onHoverChange }: PortalTooltipProps) => {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const [isHovering, setIsHovering] = useState(false); // Track if user is hovering on tooltip
  
  // Create refs to store timeouts
  const hoverInTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverOutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle mouse events on the tooltip with enhanced stability
  const handleMouseEnter = useCallback(() => {
    // Clear any pending "leave" timeout
    if (hoverOutTimeoutRef.current) {
      clearTimeout(hoverOutTimeoutRef.current);
      hoverOutTimeoutRef.current = null;
    }
    
    // Set hover state immediately
    if (!isHovering) {
      setIsHovering(true);
    }
  }, [isHovering]);
  
  const handleMouseLeave = useCallback(() => {
    // Use a longer delay for mouse leave to ensure stability
    // This prevents flickering when the mouse moves between elements
    if (hoverOutTimeoutRef.current) {
      clearTimeout(hoverOutTimeoutRef.current);
    }
    
    hoverOutTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
      hoverOutTimeoutRef.current = null;
    }, 300); // Longer timeout for more stability
  }, []);
  
  // Effect to notify parent component about hover state changes
  useEffect(() => {
    if (onHoverChange) {
      onHoverChange(isHovering);
    }
    
    // Add debug visual indication for hover state
    if (tooltipRef.current) {
      if (isHovering) {
        console.log("Tooltip is being hovered");
      } else {
        console.log("Tooltip is NOT being hovered");
      }
    }
    
    // Clean up function
    return () => {
      // Clear all timeouts when the effect reruns or component unmounts
      if (hoverInTimeoutRef.current) {
        clearTimeout(hoverInTimeoutRef.current);
        hoverInTimeoutRef.current = null;
      }
      
      if (hoverOutTimeoutRef.current) {
        clearTimeout(hoverOutTimeoutRef.current);
        hoverOutTimeoutRef.current = null;
      }
    };
  }, [isHovering, onHoverChange]);
  
  // Calculate actual tooltip position - directly below the point
  const tooltipX = x;
  const tooltipY = y;
  
  // Initialize portal container
  useEffect(() => {
    // We need to append to the body for proper positioning outside containers
    let element = document.getElementById('chart-tooltip-container');
    
    if (!element) {
      element = document.createElement('div');
      element.id = 'chart-tooltip-container';
      element.style.position = 'absolute'; // Use absolute position in the portal to prevent scroll issues
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = '100vw';
      element.style.height = '100vh';
      element.style.pointerEvents = 'none'; // Container is non-interactive
      element.style.zIndex = '9999999'; // Extremely high z-index
      element.style.overflow = 'visible'; // Ensure content can overflow the container
      
      // Append to body for positioning outside all containers
      document.body.appendChild(element);
    }
    setPortalElement(element);
    
    // Cleanup
    return () => {
      if (element && element.childNodes.length === 0) {
        try {
          document.body.removeChild(element);
        } catch (e) {
          console.error('Error removing tooltip container:', e);
        }
      }
    };
  }, []);
  
  // Don't render anything if no portal element or inactive
  if (!active || !payload || payload.length === 0 || !portalElement || !x || !y) {
    return null;
  }
  
  // Ensure payload[0] and its payload exist before accessing
  const dataPoint = payload[0]?.payload;
  if (!dataPoint) return null;
  
  // Default quality score calculation if needed
  const qualityScore = dataPoint.qualityScore ?? Math.round((dataPoint.closeness + dataPoint.communication) / 2);
  
  // Calculate viewport-aware positioning to handle scrolling and screen boundaries
  const viewport = document.documentElement;
  const viewportWidth = viewport.clientWidth;
  const viewportHeight = viewport.clientHeight;
  
  // Calculate position to keep tooltip fully in view, accounting for scroll
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;
  
  // Use client coordinates (viewport-relative) for tooltip positioning
  const posX = tooltipX;
  const posY = Math.min(
    // Default position
    tooltipY - scrollY,
    // Don't let it go off the bottom of the screen
    viewportHeight - (isSmallScreen ? 200 : 300)
  );
  
  // Create tooltip content
  const tooltipContent = (
    <div 
      ref={tooltipRef}
      className={`bg-white ${isSmallScreen ? 'p-3' : 'p-4'} shadow-2xl rounded-md border border-gray-200 ${isSmallScreen ? 'max-w-[240px]' : 'max-w-[280px]'} ${isSmallScreen ? 'text-[10px]' : 'text-xs'} ${isHovering ? 'tooltip-active' : ''}`}
      onMouseOver={handleMouseEnter}
      onMouseOut={handleMouseLeave}
      style={{
        position: 'fixed', // Fixed to viewport to avoid scroll issues
        left: posX,
        top: posY + 35, // Push it down a bit from the point
        transform: isHovering ? 'translate(-50%, -3px)' : 'translate(-50%, 0)', // Center and lift on hover
        pointerEvents: 'auto', // Allow interaction with tooltip
        boxShadow: isHovering ? '0 12px 40px rgba(59, 130, 246, 0.8)' : '0 8px 32px rgba(0, 0, 0, 0.5)', // Stronger highlight when hovering
        zIndex: 9999999,
        border: isHovering ? '3px solid #60A5FA' : '2px solid #3B82F6', // Thicker border on hover
        transition: 'all 0.2s ease', // Smooth transition for all properties
        cursor: 'pointer',  // Show pointer cursor when hovering over tooltip
        opacity: isHovering ? 1 : 0.95, // Slightly increase opacity on hover
        maxHeight: '450px', // Limit max height with a fixed value
        overflowY: 'auto', // Allow scrolling in the tooltip if needed
        willChange: 'transform', // Optimize for animations
        transformOrigin: 'top center' // Set transform origin
      }}
    >
      {offset > 0 ? (
        // Arrow at top for tooltip below point
        <div 
          className="w-5 h-5 absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2 rotate-45 z-50"
          style={{
            backgroundColor: isHovering ? '#60A5FA' : '#3B82F6',
            borderLeft: isHovering ? '3px solid #60A5FA' : '2px solid #3B82F6',
            borderTop: isHovering ? '3px solid #60A5FA' : '2px solid #3B82F6',
            boxShadow: isHovering ? '0 4px 12px -2px rgba(59, 130, 246, 0.8)' : 'none',
            transition: 'all 0.2s ease'
          }}
        ></div>
      ) : (
        // Arrow at bottom for tooltip above point
        <div 
          className="w-5 h-5 absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 z-50"
          style={{
            backgroundColor: isHovering ? '#60A5FA' : '#3B82F6',
            borderRight: isHovering ? '3px solid #60A5FA' : '2px solid #3B82F6',
            borderBottom: isHovering ? '3px solid #60A5FA' : '2px solid #3B82F6',
            boxShadow: isHovering ? '0 4px 12px -2px rgba(59, 130, 246, 0.8)' : 'none',
            transition: 'all 0.2s ease'
          }}
        ></div>
      )}
      <div className="flex justify-between items-center">
        <p className={`font-semibold text-gray-800 ${isSmallScreen ? 'mb-1.5' : 'mb-2'}`}>{label}</p>
        <span 
          className={`inline-flex items-center justify-center ${isSmallScreen ? 'w-3 h-3' : 'w-4 h-4'} rounded-full bg-blue-100 transition-colors duration-300 ${isHovering ? 'bg-blue-500' : ''}`} 
          title={isHovering ? "Tooltip is in interactive mode" : "Hover to interact"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className={`${isSmallScreen ? 'w-2 h-2' : 'w-2.5 h-2.5'} ${isHovering ? 'text-white' : 'text-blue-500'}`}
          >
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </span>
      </div>
      {/* Show session number if available */}
      {dataPoint.sessionNumber != null && (
        <p className={`${isSmallScreen ? 'text-[9px]' : 'text-xs'} text-gray-500 ${isSmallScreen ? 'mb-0.5' : 'mb-1'}`}>
          Session #{dataPoint.sessionNumber}
        </p>
      )}
      <div className={`${isSmallScreen ? 'space-y-1' : 'space-y-1.5'}`}>
        <p className="flex items-center justify-between">
          <span className="flex items-center text-gray-700">
            <span className={`inline-block ${isSmallScreen ? 'w-2 h-2' : 'w-2.5 h-2.5'} bg-blue-500 rounded-full ${isSmallScreen ? 'mr-1' : 'mr-1.5'}`}></span>
            Closeness:
          </span>
          <span className="font-medium text-gray-900">
            {payload[0]?.value ?? "N/A"}/100
          </span>
        </p>
        {payload[1] && (
          <p className="flex items-center justify-between">
            <span className="flex items-center text-gray-700">
              <span className={`inline-block ${isSmallScreen ? 'w-2 h-2' : 'w-2.5 h-2.5'} bg-emerald-500 rounded-full ${isSmallScreen ? 'mr-1' : 'mr-1.5'}`}></span>
              Communication:
            </span>
            <span className="font-medium text-gray-900">
              {payload[1]?.value ?? "N/A"}/100
            </span>
          </p>
        )}
        {chartType === "composed" && (
          <p className="flex items-center justify-between">
            <span className="flex items-center text-gray-700">
              <span className={`inline-block ${isSmallScreen ? 'w-2 h-2' : 'w-2.5 h-2.5'} bg-indigo-500 rounded-full ${isSmallScreen ? 'mr-1' : 'mr-1.5'}`}></span>
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
        <div className={`${isSmallScreen ? 'mt-1.5 pt-1' : 'mt-2 pt-1.5'} border-t border-gray-100`}>
          <p className={`${isSmallScreen ? 'text-[9px]' : 'text-xs'} italic text-gray-600`}>
            {dataPoint.insight}
          </p>
        </div>
      )}
      {/* Show notes if available */}
      {dataPoint.notes && dataPoint.notes !== "Sample data for demonstration" && (
        <div className={`${isSmallScreen ? 'mt-1.5 pt-1' : 'mt-2 pt-1.5'} border-t border-gray-100`}>
          <p className={`${isSmallScreen ? 'text-[9px]' : 'text-xs'} text-gray-500 line-clamp-3`}>
            <span className="font-medium text-gray-600">Notes:</span>{" "}
            {dataPoint.notes}
          </p>
        </div>
      )}
      {/* Link to session transcript if available */}
      {dataPoint.sessionId && (
        <div className={`${isSmallScreen ? 'mt-2 pt-1.5' : 'mt-3 pt-2'} border-t border-gray-200 w-full`}>
          <motion.button
            onClick={() => dataPoint.sessionId && viewSessionTranscript(dataPoint.sessionId)}
            className={`w-full text-center ${isSmallScreen ? 'text-[9px]' : 'text-xs'} flex items-center justify-center text-white bg-indigo-600 hover:bg-indigo-700 font-medium disabled:opacity-50 rounded-md py-2.5 transition-all duration-200`}
            disabled={!dataPoint.sessionId}
            onMouseOver={handleMouseEnter} 
            onMouseOut={handleMouseLeave}
            style={{ 
              pointerEvents: 'auto',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1)'
            }}
            whileHover={{ 
              y: -2, 
              boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3), 0 4px 6px -2px rgba(79, 70, 229, 0.2)'
            }}
            whileTap={{ scale: 0.98 }}
          >
            <svg
              className={`${isSmallScreen ? 'w-3 h-3' : 'w-3.5 h-3.5'} mr-1.5 flex-shrink-0`}
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
          </motion.button>
          <div 
            className={`text-center mt-1 flex items-center justify-center ${isHovering ? 'animate-pulse' : ''}`}
            onMouseOver={handleMouseEnter}
            onMouseOut={handleMouseLeave}
          >
            <p className={`text-[8px] ${isHovering ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
              {isHovering ? "✨ Click to view detailed conversation ✨" : "Click to view detailed conversation"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
  
  return createPortal(tooltipContent, portalElement);
};

// --- Memoized UI Components & Values ---

  const TimeframeSelector = useMemo(() => {
    return () => (
      <div className="flex justify-center mb-0">
        <div className="inline-flex p-0.5 bg-blue-600/90 rounded-lg shadow-md backdrop-blur-sm border border-white/20 w-full">
          <button
            onClick={() => setTimeframe("week")}
            className={`px-1 py-0.5 text-[10px] md:text-xs font-medium rounded-md flex-1 ${
              timeframe === "week"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeframe("month")}
            className={`px-1 py-0.5 text-[10px] md:text-xs font-medium rounded-md flex-1 ${
              timeframe === "month"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeframe("all")}
            className={`px-1 py-0.5 text-[10px] md:text-xs font-medium rounded-md flex-1 ${
              timeframe === "all"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            All
          </button>
        </div>
      </div>
    );
  }, [timeframe]); // Depends on timeframe state

  const ChartTypeSelector = useMemo(() => {
    return () => (
      <div className="flex justify-center mb-0">
        <div className="inline-flex p-0.5 bg-blue-600/90 rounded-lg shadow-md backdrop-blur-sm border border-white/20 w-full">
          <button
            onClick={() => setChartType("line")}
            className={`px-1 py-0.5 text-[10px] md:text-xs font-medium rounded-md flex-1 ${
              chartType === "line"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType("area")}
            className={`px-1 py-0.5 text-[10px] md:text-xs font-medium rounded-md flex-1 ${
              chartType === "area"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Area
          </button>
          <button
            onClick={() => setChartType("composed")}
            className={`px-1 py-0.5 text-[10px] md:text-xs font-medium rounded-md flex-1 ${
              chartType === "composed"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Combo
          </button>
        </div>
      </div>
    );
  }, [chartType]); // Depends on chartType state
  
  // ViewTypeSelector has been removed

  const TherapyTypeSelector = useMemo(() => {
    return () => (
      <div className="flex justify-center mb-0">
        <div className="inline-flex p-0.5 bg-blue-600/90 rounded-lg shadow-md backdrop-blur-sm border border-white/20 w-full">
          <button
            onClick={() => setTherapyType("couple")}
            className={`px-1 py-0.5 text-[10px] md:text-sm font-medium rounded-md flex-1 ${
              therapyType === "couple"
                ? "bg-blue-800 text-white"
                : "text-white hover:bg-blue-500/80"
            }`}
          >
            Couple
          </button>
          <button
            onClick={() => setTherapyType("family")}
            className={`px-1 py-0.5 text-[10px] md:text-sm font-medium rounded-md flex-1 ${
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

  // Enhanced tooltip for the chart - now just returns null as we use portal-based tooltip
  const CustomTooltip = useMemo(() => {
    return (): null => null;
  }, []);

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
  // State to track tooltip data
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    active: boolean;
    payload: any[];
    label: string;
    offset: number;
    timestamp: number; // Add timestamp to track when tooltip was activated
  } | null>(null);
  
  // State to track if user is hovering over the tooltip
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const tooltipHoverDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clean up any tooltips when component unmounts
  useEffect(() => {
    return () => {
      // Clear all timeout refs on unmount
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }
      
      if (tooltipHoverDebounceRef.current) {
        clearTimeout(tooltipHoverDebounceRef.current);
        tooltipHoverDebounceRef.current = null;
      }
    };
  }, []);
  
  // Completely revised chart event handler for tooltip
  const handleMouseMove = useCallback((e: any) => {
    if (e.isTooltipActive && e.activeCoordinate && e.activePayload) {
      // Find all relevant containers
      const chartWrapper = document.querySelector('.recharts-wrapper');
      const chartContainer = document.querySelector('.relationship-chart-container');
      const metricsCard = document.querySelector('.relationship-metrics-card');
      
      if (!chartWrapper) return;
      
      // Get dimensions of all relevant elements
      const chartWrapperRect = chartWrapper.getBoundingClientRect();
      const chartContainerRect = chartContainer ? chartContainer.getBoundingClientRect() : null;
      const metricsCardRect = metricsCard ? metricsCard.getBoundingClientRect() : null;
      
      // Get scroll position for fixed positioning
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      
      // Use the isLargeScreen state we're tracking
      
      // Basic coordinate calculation from chart data point
      let pointX = chartWrapperRect.left + e.activeCoordinate.x;
      
      // For large screens, adjust X position to ensure tooltip stays over relationship container
      if (isLargeScreen && chartContainerRect) {
        // On large screens, we want to ensure the tooltip stays within the relationship progress container
        // and doesn't overlap with other elements on the left side
        
        // First, set the minimum X position to keep it away from the left side of the screen
        const minX = chartContainerRect.left + 150; 
        
        // Then set the maximum X position to keep it within the right boundary with some padding
        const maxX = chartContainerRect.right - 150;
        
        // Override the pointX with position that ensures it stays within acceptable bounds
        // For very small charts, default to center if min > max
        if (minX < maxX) {
          pointX = Math.max(minX, Math.min(maxX, pointX));
        } else {
          // If container is too small, center the tooltip
          pointX = (chartContainerRect.left + chartContainerRect.right) / 2;
        }
      }
      
      // Calculate Y position:
      // 1. Start with data point Y position
      let pointY = chartWrapperRect.top + e.activeCoordinate.y;
      
      // 2. Add a base offset below the point
      let offset = 30;
      
      // 3. Calculate better position based on containers and screen size
      if (metricsCardRect) {
        // If metrics card exists, calculate ideal position
        // First check if the data point is in the bottom part of the chart
        const isInBottomHalf = e.activeCoordinate.y > (chartWrapperRect.height / 2);
        
        if (isInBottomHalf) {
          // For points in bottom half, make tooltip appear above point
          offset = -80; // Move tooltip above the point
        } else {
          // For points in top half, make sure tooltip appears below point
          // but doesn't overlap with metrics card
          const distanceToMetricsCard = metricsCardRect.top - (pointY + 120); // Account for tooltip height
          
          if (distanceToMetricsCard < 0) {
            // If tooltip would overlap metrics card, position it above the point
            offset = -80;
          } else {
            // Otherwise keep it below the point with good spacing
            offset = 60;
          }
        }
      } else {
        // Without metrics card, use standard offset
        offset = 50;
      }
      
      // Final screen coordinates with scroll adjustment
      const screenX = pointX;
      const screenY = pointY + offset;
      
      // Clear any existing timeouts when moving to a new point
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }
      
      // Set the tooltip data with calculated coordinates and current timestamp
      setTooltipData({
        x: screenX,
        y: screenY,
        active: true,
        payload: e.activePayload || [],
        label: e.activeLabel || '',
        offset: offset,
        timestamp: Date.now() // Record time when tooltip was activated
      });
    } else {
      // When mouse leaves the point, don't immediately close the tooltip
      
      // If user is hovering the tooltip, don't close it
      if (isTooltipHovered) {
        return;
      }
      
      // Clear any existing timeout and set a new one to ensure tooltip stays open for at least 2 seconds
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      
      if (tooltipData) {
        // Always keep tooltip open for exactly 2 seconds from now, regardless of how long it's been open
        tooltipTimeoutRef.current = setTimeout(() => {
          // Double check that we're not hovering before closing
          if (!isTooltipHovered) {
            setTooltipData(null);
          }
          tooltipTimeoutRef.current = null;
        }, 2000);
      } else {
        setTooltipData(null);
      }
    }
  }, [isLargeScreen, tooltipData, isTooltipHovered]); // Add isTooltipHovered to dependencies

  const renderChart = useMemo(() => {
    const commonProps = {
      data: data,
      margin: { 
        top: isSmallScreen ? 8 : 15, 
        right: isSmallScreen ? 15 : 40, 
        left: isSmallScreen ? 25 : 40, 
        bottom: isSmallScreen ? 15 : 30 
      },
      className: "mx-auto",
      onMouseMove: handleMouseMove,
      onMouseLeave: (e) => {
        // Trigger the tooltip persistent display using the same logic as in handleMouseMove
        // Don't immediately close the tooltip
        if (isTooltipHovered) {
          return;
        }
        
        // Clear any existing timeout and set a new one
        if (tooltipTimeoutRef.current) {
          clearTimeout(tooltipTimeoutRef.current);
        }
        
        if (tooltipData) {
          // Keep tooltip open for exactly 2 seconds from now
          tooltipTimeoutRef.current = setTimeout(() => {
            // Double check that we're not hovering before closing
            if (!isTooltipHovered) {
              setTooltipData(null);
            }
            tooltipTimeoutRef.current = null;
          }, 2000);
        } else {
          setTooltipData(null);
        }
      }
    };
    const xAxis = (
      <XAxis
        dataKey="name"
        tick={{ fontSize: isSmallScreen ? 9 : 11, fill: "#9CA3AF" }}
        tickMargin={isSmallScreen ? 8 : 10}
        height={isSmallScreen ? 30 : 40}
        interval={isSmallScreen ? "preserveEnd" : "preserveStartEnd"}
        stroke="#9CA3AF"
      />
    );
    const yAxis = (
      <YAxis 
        domain={[0, 100]} 
        tick={{ fontSize: isSmallScreen ? 9 : 11, fill: "#9CA3AF" }} 
        width={isSmallScreen ? 30 : 40} 
        stroke="#9CA3AF" 
        tickMargin={isSmallScreen ? 8 : 10} 
        tickCount={isSmallScreen ? 5 : 6}
      />
    );
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="#374151" />;
    const tooltip = (
      <Tooltip 
        content={() => null} // Empty content as we're using our custom portal tooltip
        cursor={{ fill: 'rgba(219, 234, 254, 0.3)' }}
      />
    );
    const legend = <Legend 
      verticalAlign="bottom" 
      height={isSmallScreen ? 30 : 40} 
      iconSize={isSmallScreen ? 8 : 10} 
      align="center"
      wrapperStyle={{
        fontSize: isSmallScreen ? '10px' : '12px',
        paddingTop: isSmallScreen ? '5px' : '10px'
      }}
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
            stroke="#3B82F6" /* Blue-500 */
            name="Closeness"
            strokeWidth={3}
          />
          <Line
            {...lineProps}
            dataKey="communication"
            stroke="#10B981" /* Emerald-500 */
            name="Communication"
            strokeWidth={3}
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
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} /> {/* Blue-500 */}
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorCommunication" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} /> {/* Emerald-500 */}
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <Area
            {...areaProps}
            dataKey="closeness"
            stroke="#3B82F6" /* Blue-500 */
            fill="url(#colorCloseness)"
            name="Closeness"
            strokeWidth={2.5}
          />
          <Area
            {...areaProps}
            dataKey="communication"
            stroke="#10B981" /* Emerald-500 */
            fill="url(#colorCommunication)"
            name="Communication"
            strokeWidth={2.5}
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
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.5} /> {/* Indigo-500 */}
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <Area
            {...areaProps}
            dataKey="qualityScore"
            stroke="#6366F1" /* Indigo-500 */
            fill="url(#colorQuality)"
            name="Overall Quality"
            strokeWidth={2}
            animationDuration={600} // Different duration maybe
          />
          <Line
            {...lineProps}
            dataKey="closeness"
            stroke="#3B82F6" /* Blue-500 */
            name="Closeness"
            strokeWidth={3}
            animationBegin={100}
          />
          <Line
            {...lineProps}
            dataKey="communication"
            stroke="#10B981" /* Emerald-500 */
            name="Communication"
            strokeWidth={3}
            animationBegin={300}
          />
        </ComposedChart>
      );
    }
    return null; // Should not happen with current logic, but good practice
  }, [chartType, data, isSmallScreen, handleMouseMove]); // Updated dependencies

  // --- Conditional Rendering (Loading State) ---
  // Now this check happens AFTER all hooks have been called
  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl p-6 w-full h-full overflow-hidden">
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
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">
            Relationship Progress
          </h2>
        </div>
        <div className="min-h-[600px] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-8 w-8 sm:h-10 sm:w-10 text-white/80"
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
    dotColor = "bg-blue-500",
  }: {
    value: number;
    label: string;
    bgColor: string;
    textColor: string;
    dotColor?: string;
  }) => (
    <motion.div 
      whileHover={{ y: -2, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.07)" }}
      className={`${bgColor} p-3 rounded-lg flex-1 border border-blue-100/30 transition-all duration-200`}
    >
      <div className="flex items-center mb-1.5">
        <span className={`inline-block w-2.5 h-2.5 ${dotColor} rounded-full mr-1.5`}></span>
        <p className={`text-xs ${textColor} font-semibold`}>{label}</p>
      </div>
      <div className="flex items-baseline">
        <p className={`text-xl md:text-2xl font-bold ${textColor}`}>
          {value > 0 ? `+${value}` : value}
        </p>
        <span
          className={`ml-1.5 text-xs font-medium ${value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-500"}`}
        >
          pts change
        </span>
      </div>
    </motion.div>
  );

  // --- Final Render ---
  return (
    <div className={`bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl p-6 w-full h-full ${data.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'}`}>
      {/* Render portal tooltip when active */}
      {tooltipData && tooltipData.active && (
        <PortalTooltip
          active={tooltipData.active}
          payload={tooltipData.payload}
          label={tooltipData.label}
          x={tooltipData.x}
          y={tooltipData.y}
          chartType={chartType}
          isSmallScreen={isSmallScreen}
          viewSessionTranscript={viewSessionTranscript}
          offset={tooltipData.offset}
          onHoverChange={(hovered) => {
            // Use a stable hover state mechanism to prevent flickering
            if (hovered) {
              // Immediately set hover state to true
              if (!isTooltipHovered) {
                console.log("Tooltip hover state changed to true");
                setIsTooltipHovered(true);
              }
              
              // Always clear closing timeouts when hovering
              if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current);
                tooltipTimeoutRef.current = null;
              }
              
              if (tooltipHoverDebounceRef.current) {
                clearTimeout(tooltipHoverDebounceRef.current);
                tooltipHoverDebounceRef.current = null;
              }
            } else {
              // Only trigger the "hover off" state if there's no active timeout
              if (!tooltipHoverDebounceRef.current && isTooltipHovered) {
                // Use a longer delay to prevent flicker during hover state transitions
                tooltipHoverDebounceRef.current = setTimeout(() => {
                  console.log("Tooltip hover state changed to false (debounced)");
                  setIsTooltipHovered(false);
                  tooltipHoverDebounceRef.current = null;
                }, 350); // Longer timeout for better stability
              }
            }
          }}
        />
      )}
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
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white">
          Relationship Progress
        </h2>
      </div>
      <div className="flex flex-col sm:flex-row justify-center sm:justify-end sm:items-center mb-3 rounded-lg">
        <div className="flex space-x-2 mb-2 sm:mb-0 items-center">
          {" "}
          {/* Added items-center */}
          {dataSource === "api" && data.length > 0 && (
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

      {/* View toggle button removed */}
      
      {/* Always show therapy type selector to allow users to switch between types */}
      <div className="mb-4">
        {/* All controls in one scrollable container on mobile and grid on desktop */}
        <div className="flex md:grid md:grid-cols-3 md:gap-2 overflow-x-auto pb-2 scrollbar-hide space-x-1 md:space-x-0">
          <div className="flex-shrink-0 md:col-span-1 min-w-[100px] md:min-w-0">
            <TherapyTypeSelector />
          </div>
          
          {/* Other controls only shown when data is available */}
          {data.length > 0 && (
            <>
              <div className="flex-shrink-0 md:col-span-1 min-w-[110px] md:min-w-0">
                <TimeframeSelector />
              </div>
              <div className="flex-shrink-0 md:col-span-1 min-w-[100px] md:min-w-0">
                <ChartTypeSelector />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error message for actual errors */}
      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs mb-3"
          role="alert"
        >
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Chart container with responsive height and proper centering */}
      {data.length > 0 ? (
        <motion.div 
          className="relationship-chart-container w-full mx-auto bg-white/20 backdrop-blur-md rounded-xl shadow-xl border border-white/30 p-3 sm:p-6 min-h-[520px] hover:bg-white/25 transition-all duration-300 max-w-[900px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ position: 'relative', zIndex: 5 }}
        >
          <div 
            className={`${isSmallScreen ? 'h-[380px]' : 'h-[480px]'} w-full relative`} 
            style={{ overflow: 'visible', position: 'relative', zIndex: 1 }}
          >
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              {renderChart}
            </ResponsiveContainer>
          </div>
          
          {/* View type indicator removed */}
        </motion.div>
      ) : (
        // Display message when no data is available (after loading finishes)
        !loading && (
          <div className="w-full h-full flex items-center justify-center text-center -mt-5">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="max-w-md flex flex-col items-center text-center"
            >
              <h3 className="text-xl font-semibold text-white mb-2">
                {therapyType === "couple" ? "Relationship" : "Family"} Progress Awaits
              </h3>
              <p className="text-sm text-white/80 mb-4 px-4">
                {error
                  ? "Could not load relationship data at this time."
                  : `Start your ${therapyType} therapy journey to track meaningful progress and insights.`}
              </p>
              {timeframe !== "all" && !error && (
                <p className="text-xs text-white/60 mb-4">
                  Try changing the timeframe to "All Time" to see more data.
                </p>
              )}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2.5 bg-white/20 text-white rounded-full text-sm font-medium hover:bg-white/30 transition-all duration-300 backdrop-blur-sm border border-white/30"
                onClick={() => (window.location.href = "/dashboard/therapy")}
              >
                Begin {therapyType === "couple" ? "Relationship" : "Family"} Session
              </motion.button>
            </motion.div>
          </div>
        )
      )}

      {/* Enhanced metrics display */}
      {/* Only show metrics if data is present and metrics are calculated */}
      {data.length > 0 && chartMetrics && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relationship-metrics-card mt-4 bg-gradient-to-br from-blue-700/50 to-blue-900/60 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-blue-300/10" 
          style={{ position: 'relative', zIndex: 10 }}
        >
          <h4 className="text-xs text-white uppercase tracking-wider mb-3 font-bold flex items-center">
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
            Therapy Metrics ({timeframe})
          </h4>
          
          {/* Standard metrics display */}
          <>
            {/* Upper metrics row: Averages */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <motion.div 
                whileHover={{ y: -2, boxShadow: "0 10px 25px rgba(37, 99, 235, 0.2)" }}
                className="bg-white/90 shadow-md p-3 rounded-lg text-center border border-blue-200/20"
              >
                <div className="flex items-center justify-center mb-1">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-1.5"></span>
                  <p className="text-xs text-blue-700 font-semibold">
                    Avg Closeness
                  </p>
                </div>
                <p className="text-2xl font-bold text-blue-800">
                  {chartMetrics.averages.closeness}
                  <span className="text-xs font-normal text-blue-600">/100</span>
                </p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -2, boxShadow: "0 10px 25px rgba(16, 185, 129, 0.2)" }}
                className="bg-white/90 shadow-md p-3 rounded-lg text-center border border-emerald-200/20"
              >
                <div className="flex items-center justify-center mb-1">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full mr-1.5"></span>
                  <p className="text-xs text-emerald-700 font-semibold">
                    Avg Communication
                  </p>
                </div>
                <p className="text-2xl font-bold text-emerald-800">
                  {chartMetrics.averages.communication}
                  <span className="text-xs font-normal text-emerald-600">/100</span>
                </p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -2, boxShadow: "0 10px 25px rgba(99, 102, 241, 0.2)" }}
                className="bg-white/90 shadow-md p-3 rounded-lg col-span-2 md:col-span-1 mt-2 md:mt-0 text-center border border-indigo-200/20"
              >
                <div className="flex items-center justify-center mb-1">
                  <span className="w-3 h-3 bg-indigo-500 rounded-full mr-1.5"></span>
                  <p className="text-xs text-indigo-700 font-semibold">
                    Avg Relationship Quality
                  </p>
                </div>
                <p className="text-2xl font-bold text-indigo-800">
                  {chartMetrics.averages.quality}
                  <span className="text-xs font-normal text-indigo-600">
                    /100
                  </span>
                </p>
              </motion.div>
            </div>
            {/* Lower metrics row: Progress indicators */}
            <h4 className="text-xs text-white uppercase tracking-wider mt-4 mb-2 font-bold bg-blue-800/60 p-2 rounded-lg flex items-center">
              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              Overall Change ({timeframe})
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <ProgressIndicator
                value={chartMetrics.overallChange.closeness}
                label="Closeness Change"
                bgColor="bg-white/90 shadow-md"
                textColor="text-blue-800"
                dotColor="bg-blue-500"
              />
              <ProgressIndicator
                value={chartMetrics.overallChange.communication}
                label="Communication Change"
                bgColor="bg-white/90 shadow-md"
                textColor="text-emerald-800"
                dotColor="bg-emerald-500"
              />
            </div>
          </>
        </motion.div>
      )}
    </div>
  );
}
