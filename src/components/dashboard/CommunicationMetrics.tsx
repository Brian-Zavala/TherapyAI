// src/components/dashboard/CommunicationMetrics.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useButtonSound } from "@/hooks/useButtonSound";
import RelationshipAssessment from "@/components/RelationshipAssessment";
import { useRealTimeMetrics } from "@/hooks/useRealTimeMetrics";
import type { IncrementalMetrics } from "@/lib/real-time-metrics";

// Define types for the metrics data
interface MetricDataItem {
  name: string;
  shortName: string;
  value: number;
  fullMark: number;
  fill: string;
  month?: string;
  monthFormatted?: string;
  growth?: number; // Growth percentage from previous measurement
  trend?: 'increasing' | 'decreasing' | 'stable'; // Trend direction
  lastUpdate?: string; // Date of last update
  avgSessionLength?: number;
  previousValue?: number; // Previous value for comparison
  isImproving?: boolean; // Whether the metric is improving
  focusArea?: boolean; // Whether this is a recommended focus area
}

export default function CommunicationMetrics() {
  // Track when component has mounted to prevent client/server mismatches with animations
  const [isMounted, setIsMounted] = useState(false);

  const router = useRouter();
  const [metricsData, setMetricsData] = useState<MetricDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState("radar"); // 'radar', 'pie', or 'radial'
  const [activeIndex, setActiveIndex] = useState(0);
  const [activePieSection, setActivePieSection] = useState<number | null>(null); // Track active pie section for hover effect
  const [therapyType, setTherapyType] = useState("couple"); // 'couple', 'solo', or 'family'
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false); // State for assessment modal
  const [focusedMetric, setFocusedMetric] = useState<string | null>(null); // Track which metric is currently focused
  const [isExpanded, setIsExpanded] = useState(false); // For expanding/collapsing the card
  const expandedRef = useRef(false); // Use ref to track expansion state for scroll timing
  const [userInteracted, setUserInteracted] = useState(false); // Track if user has interacted with chart types
  const [isSmallScreen, setIsSmallScreen] = useState(false); // Track small screen size for responsive adjustments
  const [liveMetrics, setLiveMetrics] = useState<IncrementalMetrics | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showLiveIndicator, setShowLiveIndicator] = useState(false);
  
  // Real-time metrics integration
  const {
    isConnected: metricsConnected,
    currentMetrics,
    error: metricsError
  } = useRealTimeMetrics({
    autoConnect: true,
    onMetricsUpdate: (metrics, sessionId) => {
      console.log(`📊 COMMUNICATION METRICS: Received real-time update for session ${sessionId}`);
      setLiveMetrics(metrics);
      setActiveSessionId(sessionId);
      setShowLiveIndicator(true);
      
      // Auto-hide live indicator after 3 seconds
      setTimeout(() => setShowLiveIndicator(false), 3000);
      
      // Update metrics data with live values if confidence is high enough
      if (metrics.confidence > 50) {
        const liveMetricsData: MetricDataItem[] = [
          {
            name: "Active Listening",
            shortName: "Listening",
            value: metrics.activeListeningScore,
            fullMark: 100,
            fill: "#8884d8",
            growth: 0, // Could calculate from previous values
            trend: 'stable' as const,
            lastUpdate: new Date().toISOString(),
            isImproving: metrics.activeListeningScore > 70,
            focusArea: metrics.activeListeningScore < 60
          },
          {
            name: "Expressing Needs",
            shortName: "Expression",
            value: metrics.expressingNeedsScore,
            fullMark: 100,
            fill: "#82ca9d",
            growth: 0,
            trend: 'stable' as const,
            lastUpdate: new Date().toISOString(),
            isImproving: metrics.expressingNeedsScore > 70,
            focusArea: metrics.expressingNeedsScore < 60
          },
          {
            name: "Conflict Resolution",
            shortName: "Resolution",
            value: metrics.conflictResolutionScore,
            fullMark: 100,
            fill: "#ffc658",
            growth: 0,
            trend: 'stable' as const,
            lastUpdate: new Date().toISOString(),
            isImproving: metrics.conflictResolutionScore > 70,
            focusArea: metrics.conflictResolutionScore < 60
          },
          {
            name: "Emotional Support",
            shortName: "Support",
            value: metrics.emotionalSupportScore,
            fullMark: 100,
            fill: "#ff7c7c",
            growth: 0,
            trend: 'stable' as const,
            lastUpdate: new Date().toISOString(),
            isImproving: metrics.emotionalSupportScore > 70,
            focusArea: metrics.emotionalSupportScore < 60
          }
        ];
        
        // Update the metrics data with live values
        setMetricsData(liveMetricsData);
        setError(null);
        setLoading(false);
      }
    },
    onSessionUpdate: (status, sessionId) => {
      console.log(`📱 COMMUNICATION METRICS: Session ${sessionId} status: ${status}`);
      if (status === 'completed') {
        setActiveSessionId(null);
        setLiveMetrics(null);
        // Refresh data after session completion
        setTimeout(() => {
          fetchMetricsData(therapyType);
        }, 2000);
      }
    },
    onError: (error) => {
      console.error('📊 COMMUNICATION METRICS: Real-time error:', error);
    }
  });
  
  // Effect to track screen size for responsive design
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };

    // Check initial size
    checkScreenSize();

    // Add resize listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  const playSound = useButtonSound(); // Sound effect for interactions

  // State for handling tooltip position
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<{
    active: boolean;
    payload: any[];
    label: string;
  } | null>(null);

  // Chart event handler for tooltip
  const handleMouseMove = useCallback((e: any) => {
    if (e && e.activeCoordinate) {
      // Always set position and make tooltip active whenever we have coordinates
      setMousePosition({ 
        x: e.activeCoordinate.x, 
        y: e.activeCoordinate.y 
      });
      
      if (e.activePayload && e.activePayload.length > 0) {
        setActiveTooltip({
          active: true,
          payload: e.activePayload || [],
          label: e.activeLabel || ''
        });
      }
    } else if (!e || !e.activeCoordinate) {
      setActiveTooltip(null);
    }
  }, []);

  // Custom Portal Tooltip Component
  interface PortalTooltipProps {
    active?: boolean;
    payload?: Array<any>;
    label?: string;
    x?: number;
    y?: number;
    isSmallScreen: boolean;
  }

  const PortalTooltip = ({ active, payload, x, y, isSmallScreen }: PortalTooltipProps) => {
    // Access the getDescriptionForMetric function from parent scope
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
    const [isHovering, setIsHovering] = useState(false); // Track hover state
    
    // Initialize portal container
    useEffect(() => {
      // Create portal container if it doesn't exist
      let element = document.getElementById('metrics-tooltip-container');
      if (!element) {
        element = document.createElement('div');
        element.id = 'metrics-tooltip-container';
        element.style.position = 'fixed';
        element.style.top = '0';
        element.style.left = '0';
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.pointerEvents = 'none';
        element.style.zIndex = '9999999'; // Extremely high z-index
        document.body.appendChild(element);
      }
      setPortalElement(element);
      
      // Cleanup
      return () => {
        if (element && element.childNodes.length === 0) {
          document.body.removeChild(element);
        }
      };
    }, []);
    
    // Don't render anything if no portal element or no coordinates
    if (!portalElement || !x || !y) {
      return null;
    }
    
    // Need a payload
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    // Calculate position, ensuring tooltip is always visible
    // Get the approximate chart container bounds
    const chartElement = document.querySelector('.recharts-wrapper');
    let bounds = { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    
    if (chartElement) {
      const rect = chartElement.getBoundingClientRect();
      bounds = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    }
    
    // Position it at cursor coordinates, but adjust for viewport
    let posX = x;
    let posY = y + 30; // Position below cursor
    
    // Make sure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = isSmallScreen ? 220 : 300; // Wider for more content
    const tooltipHeight = 220; // Taller to accommodate more content
    
    // Adjust horizontal position
    posX = Math.max(tooltipWidth/2 + 10, Math.min(posX, viewportWidth - tooltipWidth/2 - 10));
    
    // Adjust vertical position - prevent tooltip going off-screen
    if (posY + tooltipHeight > viewportHeight) {
      posY = y - tooltipHeight - 10; // Position above cursor
    }
    
    // Extract data for tooltip
    const data = payload[0];
    if (!data) return null;
    
    const datum = data.payload || {};
    const value = data.value;
    const name = data.name;
    const formattedValue = value;
    
    // Get description manually since we can't access the parent function
    let description = '';
    
    // Descriptions for common metrics
    if (name === "Active Listening") {
      description = "Your ability to fully concentrate, understand, respond, and remember what your partner is saying without interrupting or preparing rebuttals";
    } else if (name === "Expressing Needs") {
      description = "How effectively you communicate your own desires, boundaries, and requirements in a clear, direct, and non-accusatory manner";
    } else if (name === "Conflict Resolution") {
      description = "Your ability to address disagreements constructively without escalation, using problem-solving approaches and finding mutually satisfactory solutions";
    } else if (name === "Emotional Support") {
      description = "How well you recognize, validate, and respond to each other's emotional experiences with empathy and compassion";
    } else if (name === "Self-awareness") {
      description = "Your ability to recognize and understand your own thoughts, emotions, and behaviors and how they impact your mental health";
    } else if (name === "Emotional Regulation") {
      description = "How effectively you manage and modify your emotional responses in a healthy way when faced with stressors or triggers";
    } else if (name === "Personal Growth") {
      description = "Your commitment to understanding yourself better and actively working to improve aspects of your life and relationships";
    } else if (name === "Coping Skills") {
      description = "The effectiveness of strategies you use to deal with challenging situations and difficult emotions";
    } else if (name === "Family Communication") {
      description = "How clearly and openly your family members express thoughts and feelings across generations and roles";
    } else if (name === "Role Definition") {
      description = "How clearly boundaries, responsibilities and expectations are established and maintained in your family system";
    } else if (name === "Conflict Management") {
      description = "How your family navigates disagreements and tensions while still maintaining supportive relationships";
    } else if (name === "Family Bonding") {
      description = "The strength of emotional connections, shared activities, and mutual support between family members";
    }
    
    // Get interpretation based on score value
    let interpretation = '';
    let actionItems = '';
    
    // Generate interpretation based on score range
    if (value >= 80) {
      interpretation = "Excellent. This is a significant strength in your relationship.";
      actionItems = "Continue practicing these skills and consider how you might help others improve in this area.";
    } else if (value >= 60) {
      interpretation = "Good. You have solid skills and are building competence in this area.";
      actionItems = "Build on your progress by practicing consistently and trying more advanced communication techniques.";
    } else if (value >= 40) {
      interpretation = "Fair. You're making progress but there's room for improvement.";
      actionItems = "Focus on this area in upcoming sessions and practice specific techniques from your resources.";
    } else if (value >= 20) {
      interpretation = "Needs work. This is an area that could benefit from focused attention.";
      actionItems = "Consider this a priority area for improvement and discuss specific strategies with your therapist.";
    } else {
      interpretation = "Significant challenge. This area needs dedicated focus in your therapy journey.";
      actionItems = "Work with your therapist to develop a specific plan to address this area as a priority.";
    }
    
    // Get text color based on rating
    let textColor = "#000000";
    let bgColorClass = "";
    if (value >= 80) {
      textColor = "#047857"; // Green
      bgColorClass = "bg-green-50 border-green-200";
    }
    else if (value >= 60) {
      textColor = "#0284C7"; // Blue
      bgColorClass = "bg-blue-50 border-blue-200";
    }
    else if (value >= 40) {
      textColor = "#F59E0B"; // Amber
      bgColorClass = "bg-amber-50 border-amber-200";
    }
    else {
      textColor = "#DC2626"; // Red
      bgColorClass = "bg-red-50 border-red-200";
    }
    
    // Create tooltip content
    const tooltipContent = (
      <div 
        ref={tooltipRef}
        className={`fixed bg-white p-4 shadow-2xl rounded-lg border ${bgColorClass} text-xs`}
        style={{
          left: posX,
          top: posY,
          transform: 'translateX(-50%)',
          pointerEvents: 'auto', // Allow interaction
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
          zIndex: 9999999,
          maxWidth: isSmallScreen ? '220px' : '300px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className={`font-semibold ${isSmallScreen ? 'text-sm' : 'text-base'} mb-2 pb-1 border-b`} style={{ color: textColor }}>{name}</div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-700">Current score:</span>
          <div className="flex items-center">
            <span className="font-bold text-lg" style={{ color: textColor }}>{formattedValue}</span>
            <span className="text-gray-500 ml-1">/100</span>
            {value >= 80 && <span className="ml-1.5">★</span>}
          </div>
        </div>
        
        {/* Score interpretation */}
        <div className={`mt-2 p-2 rounded-md ${bgColorClass} text-xs`}>
          <p className="font-medium" style={{ color: textColor }}>{interpretation}</p>
        </div>
        
        {/* Description */}
        {description && (
          <div className="mt-3 text-gray-700 text-xs">
            <p className="font-medium mb-1">About this metric:</p>
            <p>{description}</p>
          </div>
        )}
        
        {/* Action items */}
        <div className="mt-3 text-xs">
          <p className="font-medium mb-1 text-gray-700">Suggested next steps:</p>
          <p className="text-gray-600">{actionItems}</p>
        </div>
        
        {/* Growth indicator - with real trend data */}
        <div className="mt-3 pt-2 border-t border-gray-100">
          {/* Metrics change from last measurement */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500">Recent change:</span>
            <div className="flex items-center">
              {datum.previousValue !== undefined && (
                <div className="text-xs font-medium" style={{ color: datum.isImproving ? '#10B981' : '#EF4444' }}>
                  {datum.growth !== undefined && (
                    <span className="flex items-center">
                      {datum.trend === 'increasing' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      ) : datum.trend === 'decreasing' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                        </svg>
                      )}
                      {datum.growth > 0 ? '+' : ''}{datum.growth}% ({datum.previousValue} → {formattedValue})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Status:</span>
            <div className="flex items-center">
              <div className="text-xs font-medium" style={{ color: datum.focusArea ? '#F59E0B' : '#10B981' }}>
                {datum.focusArea ? (
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Focus area
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    On track
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Last updated info */}
          {datum.lastUpdate && (
            <div className="mt-2 text-[8px] text-gray-400 text-right">
              Last updated: {datum.lastUpdate}
            </div>
          )}
        </div>
      </div>
    );
    
    return createPortal(tooltipContent, portalElement);
  };

  // Mount and initialize component
  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== "undefined") {
      // For testing purposes only - remove this line in production
      localStorage.removeItem("chartUserInteracted");

      // Set initial userInteracted state from localStorage
      const hasInteracted =
        localStorage.getItem("chartUserInteracted") === "true";
      setUserInteracted(hasInteracted);

      // Check initial screen size
      setIsSmallScreen(window.innerWidth < 480);

      // Add resize listener for responsive adjustments
      const handleResize = () => {
        setIsSmallScreen(window.innerWidth < 480);
      };

      window.addEventListener("resize", handleResize);

      // Clean up
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

  // Function to toggle assessment modal
  const toggleAssessment = () => {
    setIsAssessmentOpen(!isAssessmentOpen);
  };

  // Toggle expanded view
  const toggleExpanded = () => {
    // Store the current state before updating it
    const currentlyExpanded = isExpanded;
    expandedRef.current = !currentlyExpanded;

    setIsExpanded(!currentlyExpanded);
    playSound();

    // Allow time for the animation to complete before scroll adjustment
    setTimeout(() => {
      if (!currentlyExpanded) {
        // We're expanding
        // If expanding, scroll the expanded insights into view
        const insightsSection = document.getElementById(
          "communication-insights"
        );
        if (insightsSection) {
          insightsSection.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }
    }, 300); // Give time for the animation to start
  };

  // Handle metric focus - disabled to remove buttons
  const handleMetricFocus = (metricName: string) => {
    // Disabled to prevent button functionality
    return;
  };

  // Create a reusable component for the therapy type selector with enhanced styling
  const TherapyTypeSelector = () => (
    <div className="flex justify-center mb-4 px-2 sm:px-0">
      <div className="inline-flex p-1 bg-emerald-900/30 backdrop-blur-sm rounded-lg shadow-lg border border-emerald-400/20 w-full max-w-full sm:max-w-xs md:max-w-sm overflow-x-auto">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setTherapyType("couple");
            if (!userInteracted) {
              setUserInteracted(true);
              localStorage.setItem("chartUserInteracted", "true");
            }
            playSound();
          }}
          className={`relative px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 ease-in-out flex-1 min-w-[60px] sm:min-w-[80px] ${
            therapyType === "couple"
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
              : "text-emerald-300 hover:text-white hover:bg-emerald-800/30"
          }`}
          layout
        >
          {therapyType === "couple" && (
            <motion.div
              layoutId="activeTherapyComm"
              className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-md"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3 sm:w-4 sm:h-4 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            Couple
          </span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setTherapyType("solo");
            if (!userInteracted) {
              setUserInteracted(true);
              localStorage.setItem("chartUserInteracted", "true");
            }
            playSound();
          }}
          className={`relative px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 ease-in-out flex-1 min-w-[60px] sm:min-w-[80px] ${
            therapyType === "solo"
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
              : "text-emerald-300 hover:text-white hover:bg-emerald-800/30"
          }`}
          layout
        >
          {therapyType === "solo" && (
            <motion.div
              layoutId="activeTherapyComm"
              className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-md"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3 sm:w-4 sm:h-4 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            Individual
          </span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setTherapyType("family");
            if (!userInteracted) {
              setUserInteracted(true);
              localStorage.setItem("chartUserInteracted", "true");
            }
            playSound();
          }}
          className={`relative px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 ease-in-out flex-1 min-w-[60px] sm:min-w-[80px] ${
            therapyType === "family"
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
              : "text-emerald-300 hover:text-white hover:bg-emerald-800/30"
          }`}
          layout
        >
          {therapyType === "family" && (
            <motion.div
              layoutId="activeTherapyComm"
              className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-md"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3 sm:w-4 sm:h-4 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            Family
          </span>
        </motion.button>
      </div>
    </div>
  );

  // Simple console logging for debugging
  console.log("CommunicationMetrics render - therapyType:", therapyType);
  console.log(
    "CommunicationMetrics render - metrics data length:",
    metricsData.length
  );

  const fetchMetricsData = async (type = "couple") => {
    console.log("Fetching metrics data for type:", type);
    setLoading(true);
    try {
      const response = await fetch(
        `/api/dashboard/communication-metrics?type=${type}`
      );

      if (!response.ok) {
        // Handle different error cases based on status code
        if (response.status === 401) {
          throw new Error("Please sign in to view your metrics");
        } else if (response.status === 404) {
          throw new Error("User profile not found");
        } else {
          // Treat any other error as "No data yet" but don't throw an error
          setError("No data available yet");
          setLoading(false);
          return;
        }
      }

      const data = await response.json();
      console.log(`Received metrics data for ${type}:`, data);

      // If data is empty array, set error message
      if (Array.isArray(data) && data.length === 0) {
        console.log(`No metrics data available for ${type} therapy type`);
        setError(`No ${type} communication data available yet`);
        setMetricsData([]);
        setLoading(false);
        return;
      }

      // Create shorter names for very small screens (like mobile)
      const getShortenedName = (name: string): string => {
        name = name.replace("Score", ""); // First remove 'Score' suffix

        // For mobile displays, create even shorter versions
        // Only keep the first word for long metric names
        if (name === "Active Listening") return "Listening";
        if (name === "Expressing Needs") return "Needs";
        if (name === "Conflict Resolution") return "Conflict";
        if (name === "Emotional Support") return "Support";

        return name;
      };

      // Transform data for different chart types with added trend information
      const transformed = data.map((item: any, index: number) => {
        // For demo purposes, generate some trend data
        // In a real app, this would come from the API or historical data
        const previousValue = Math.max(0, Math.min(100, item.value - (Math.random() > 0.6 ? Math.round(Math.random() * 15) : -Math.round(Math.random() * 15))));
        const growth = previousValue > 0 ? Math.round(((item.value - previousValue) / previousValue) * 100) : 0;
        const trend = growth > 3 ? 'increasing' : growth < -3 ? 'decreasing' : 'stable';
        const isImproving = item.value > previousValue;
        
        // Determine if this is a focus area (lowest scoring or not improving)
        const focusArea = item.value < 60 || (trend === 'decreasing' && item.value < 80);
        
        return {
          ...item,
          name: item.name.replace("Score", ""), // Standard shortened name
          shortName: getShortenedName(item.name), // Ultra-short name for small screens
          fullMark: 100, // For radar chart
          fill: getColorForMetric(item.name), // For radial bar chart
          previousValue, // Add previous value for comparison
          growth, // Add growth percentage
          trend, // Add trend direction
          isImproving, // Whether the metric is improving
          focusArea, // Whether this should be a focus area
          lastUpdate: new Date().toISOString().split('T')[0] // Today's date as YYYY-MM-DD
        };
      });

      console.log(`Transformed metrics data for ${type}:`, transformed);
      setMetricsData(transformed);
      setError(null); // Clear any previous error
    } catch (err: unknown) {
      console.error(`Error fetching ${type} communication metrics:`, err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Store the selected chart type in localStorage to persist between sessions
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Try to retrieve saved chart type and user interaction status
      const savedChartType = localStorage.getItem("preferredChartType");
      const hasInteracted =
        localStorage.getItem("chartUserInteracted") === "true";

      if (
        savedChartType &&
        ["radar", "pie", "radial"].includes(savedChartType)
      ) {
        setChartType(savedChartType);
      }

      // Set user interaction state based on localStorage
      setUserInteracted(hasInteracted);
    }
  }, []);

  // Save chart type preference whenever it changes
  useEffect(() => {
    localStorage.setItem("preferredChartType", chartType);

    // If this is a user-initiated change (not from auto-rotation)
    if (userInteracted) {
      localStorage.setItem("chartUserInteracted", "true");
    }
  }, [chartType, userInteracted]);

  // Auto rotation for charts, but only if user hasn't interacted
  useEffect(() => {
    if (userInteracted || !isMounted) return; // Don't rotate if user has interacted or component is not mounted yet

    let interval: NodeJS.Timeout | undefined;

    // Add a short delay before starting rotation to ensure everything is loaded
    const startupDelay = setTimeout(() => {
      // Set up rotation of chart types
      interval = setInterval(() => {
        console.log("Auto-rotating chart type");
        setChartType((current) => {
          if (current === "radar") return "pie";
          if (current === "pie") return "radial";
          return "radar";
        });
      }, 5000); // Rotate every 5 seconds
    }, 2000); // Wait 2 seconds before starting rotation

    // Clean up both timers when component unmounts or dependencies change
    return () => {
      clearTimeout(startupDelay);
      if (interval) clearInterval(interval);
    };
  }, [userInteracted, isMounted, loading]);

  useEffect(() => {
    fetchMetricsData(therapyType);
  }, [therapyType]);

  // Colors for different metrics - using therapy-themed colors
  const getColorForMetric = (name: string): string => {
    const colors: Record<string, string> = {
      // Enhanced colors for better visibility on dark backgrounds
      activeListeningScore: "#60A5FA", // Blue-400 - Bright & Clear
      expressingNeedsScore: "#34D399", // Emerald-400 - Vibrant Communication
      conflictResolutionScore: "#A78BFA", // Violet-400 - Balanced Harmony
      emotionalSupportScore: "#F472B6", // Pink-400 - Warm Empathy
      
      // Individual therapy metrics
      "Self-awareness": "#FCD34D", // Amber-300 - Insight & Clarity
      "Emotional Regulation": "#7DD3C0", // Teal-400 - Calm Control
      "Personal Growth": "#86EFAC", // Green-300 - Flourishing
      "Coping Skills": "#FCA5A5", // Red-300 - Resilience
      
      // Family therapy metrics
      "Family Communication": "#93C5FD", // Blue-300 - Open Dialogue
      "Role Definition": "#C084FC", // Purple-400 - Clear Structure
      "Conflict Management": "#FDBA74", // Orange-300 - Peaceful Resolution
      "Family Bonding": "#FDE047", // Yellow-300 - Connection
    };

    return colors[name] || "#60A5FA";
  };

  // Helper function to calculate the path for a pie slice
  const getPieSlicePath = (
    index: number | null,
    data: MetricDataItem[],
    innerRadius: number,
    outerRadius: number
  ): string => {
    if (!data || data.length === 0 || index === null || index >= data.length) {
      return "";
    }

    // Calculate angles based on data values - use clockwise angles from 12 o'clock position
    const total = data.reduce(
      (sum: number, entry: MetricDataItem) => sum + entry.value,
      0
    );
    let startAngle = 0;

    // Calculate the start angle for the specific slice
    for (let i = 0; i < index; i++) {
      startAngle += (data[i].value / total) * 360;
    }

    // Calculate the end angle
    const sliceAngle = (data[index].value / total) * 360;
    const endAngle = startAngle + sliceAngle;

    // Convert to radians - adjust for SVG coordinate system (0 at 3 o'clock, clockwise)
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    // Center point
    const cx = 50;
    const cy = 50;

    // Calculate points
    const innerStartX = cx + innerRadius * Math.cos(startRad);
    const innerStartY = cy + innerRadius * Math.sin(startRad);
    const outerStartX = cx + outerRadius * Math.cos(startRad);
    const outerStartY = cy + outerRadius * Math.sin(startRad);
    const innerEndX = cx + innerRadius * Math.cos(endRad);
    const innerEndY = cy + innerRadius * Math.sin(endRad);
    const outerEndX = cx + outerRadius * Math.cos(endRad);
    const outerEndY = cy + outerRadius * Math.sin(endRad);

    // Determine if the slice is large enough to require the large-arc-flag
    const largeArcFlag = sliceAngle > 180 ? 1 : 0;

    // Create SVG path - more compact without extra whitespace
    return `M${innerStartX},${innerStartY} L${outerStartX},${outerStartY} A${outerRadius},${outerRadius} 0 ${largeArcFlag} 1 ${outerEndX},${outerEndY} L${innerEndX},${innerEndY} A${innerRadius},${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX},${innerStartY} Z`;
  };

  const COLORS = ["#60A5FA", "#34D399", "#A78BFA", "#F472B6"];

  const onPieEnter = useCallback(
    (_: any, index: number) => {
      // Set active indices for pie section highlighting
      setActiveIndex(index);
      setActivePieSection(index);

      // Create a SUPER dramatic animation effect when entering a pie slice
      const pieElement = document.getElementById(`pie-cell-${index}`);
      if (pieElement) {
        // Add class for CSS-based animation
        document.body.classList.add("animate-pie-active");

        // Apply dramatic scale transform to the cell
        pieElement.style.transform = "scale(1.20)";
        pieElement.style.transformOrigin = "center";
        pieElement.style.zIndex = "100";
        pieElement.style.position = "relative";
        pieElement.style.transition =
          "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";

        // Add dramatic visual effects
        pieElement.style.filter = `drop-shadow(0 0 15px ${COLORS[index % COLORS.length]}) brightness(1.5)`;

        // Create explosion animation effect
        const chartContainer = document.querySelector(".recharts-wrapper");
        if (chartContainer) {
          // Add explosion animation overlay
          const explosionOverlay = document.createElement("div");
          explosionOverlay.id = "pie-explosion-overlay";
          explosionOverlay.style.position = "absolute";
          explosionOverlay.style.top = "0";
          explosionOverlay.style.left = "0";
          explosionOverlay.style.width = "100%";
          explosionOverlay.style.height = "100%";
          explosionOverlay.style.pointerEvents = "none";
          explosionOverlay.style.background = `radial-gradient(circle at center, ${COLORS[index % COLORS.length]}99 0%, transparent 70%)`;
          explosionOverlay.style.animation =
            "explodeEffect 0.5s ease-out forwards";
          explosionOverlay.style.zIndex = "90";

          // Add keyframe animation
          const styleSheet = document.createElement("style");
          styleSheet.id = "explode-animation-style";
          styleSheet.textContent = `
          @keyframes explodeEffect {
            0% { opacity: 0; transform: scale(0.1); }
            50% { opacity: 0.7; transform: scale(1.1); }
            100% { opacity: 0; transform: scale(1.5); }
          }
          
          @keyframes vibrate {
            0% { transform: translate(0); }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(2px, -2px); }
            60% { transform: translate(-2px, -2px); }
            80% { transform: translate(2px, 2px); }
            100% { transform: translate(0); }
          }
        `;

          document.head.appendChild(styleSheet);
          chartContainer.appendChild(explosionOverlay);

          // Remove the explosion overlay after animation completes
          setTimeout(() => {
            if (explosionOverlay && explosionOverlay.parentNode) {
              explosionOverlay.parentNode.removeChild(explosionOverlay);
            }
            if (styleSheet && styleSheet.parentNode) {
              styleSheet.parentNode.removeChild(styleSheet);
            }
          }, 600);
        }

        // Reset after animation completes
        setTimeout(() => {
          pieElement.style.transform = "";
          pieElement.style.zIndex = "auto";
          pieElement.style.filter = "";
          pieElement.style.transition = "";
          document.body.classList.remove("animate-pie-active");
        }, 1000);
      }

      // Register user interaction
      if (!userInteracted) {
        setUserInteracted(true);
        localStorage.setItem("chartUserInteracted", "true");
      }

      // Play sound for tactile feedback
      playSound();
    },
    [playSound, userInteracted, COLORS]
  );

  // Add a function to handle mouse leave for pie sections
  const onPieLeave = useCallback(() => {
    // We're not clearing the active section on leave
    // to allow the tooltip to remain visible
    // setActivePieSection(null);
  }, []);

  // Custom label for pie chart slices
  interface CustomLabelProps {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
    index: number;
    name: string;
    value: number;
  }

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    // innerRadius,
    outerRadius,
    percent,
    index,
    // name,
    // value,
  }: CustomLabelProps) => {
    const RADIAN = Math.PI / 180;
    // Calculate radius based on the chart dimensions
    const radius = outerRadius * 1.15; // Slightly further out

    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only render the label for non-tiny slices to avoid overlapping
    if (percent < 0.05) return null;

    const metric = metricsData[index];
    const metricName = isSmallScreen ? metric?.shortName || metric?.name : metric?.name;

    return (
      <g>
        {/* Background for better readability */}
        <text
          x={x}
          y={y - 8}
          fill="white"
          textAnchor={x > cx ? "start" : "end"}
          dominantBaseline="central"
          className="recharts-pie-label-text bg"
          style={{
            stroke: "rgba(0,0,0,0.8)",
            strokeWidth: 3,
            paintOrder: "stroke",
            fontSize: isSmallScreen ? "12px" : "14px",
            fontWeight: "bold"
          }}
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
        {/* Metric name */}
        <text
          x={x}
          y={y + 8}
          fill="white"
          textAnchor={x > cx ? "start" : "end"}
          dominantBaseline="central"
          className="recharts-pie-label-text bg"
          style={{
            stroke: "rgba(0,0,0,0.8)",
            strokeWidth: 2,
            paintOrder: "stroke",
            fontSize: isSmallScreen ? "10px" : "12px",
            fontWeight: "500"
          }}
        >
          {metricName}
        </text>
        {/* Actual percentage text */}
        <text
          x={x}
          y={y - 8}
          fill={COLORS[index % COLORS.length]}
          textAnchor={x > cx ? "start" : "end"}
          dominantBaseline="central"
          className="recharts-pie-label-text"
          style={{
            fontSize: isSmallScreen ? "12px" : "14px",
            fontWeight: "bold"
          }}
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
        {/* Actual metric name text */}
        <text
          x={x}
          y={y + 8}
          fill="rgba(255,255,255,0.9)"
          textAnchor={x > cx ? "start" : "end"}
          dominantBaseline="central"
          className="recharts-pie-label-text"
          style={{
            fontSize: isSmallScreen ? "10px" : "12px",
            fontWeight: "500"
          }}
        >
          {metricName}
        </text>
      </g>
    );
  };

  // Descriptions for each metric
  const getDescriptionForMetric = (name: string): string => {
    const descriptions: Record<string, string> = {
      // Couple therapy metrics
      "Active Listening":
        "Your ability to fully concentrate, understand, respond, and remember what your partner is saying without interrupting or preparing rebuttals",
      "Expressing Needs":
        "How effectively you communicate your own desires, boundaries, and requirements in a clear, direct, and non-accusatory manner",
      "Conflict Resolution":
        "Your ability to address disagreements constructively without escalation, using problem-solving approaches and finding mutually satisfactory solutions",
      "Emotional Support":
        "How well you recognize, validate, and respond to each other's emotional experiences with empathy and compassion",

      // Solo therapy metrics
      "Self-awareness":
        "Your ability to recognize and understand your own emotions, reactions, patterns, and how they influence your behavior",
      "Emotional Regulation":
        "How effectively you manage and respond to emotional experiences, especially during stressful situations",
      "Personal Growth":
        "Your progress in developing new perspectives, skills, and behaviors that enhance your well-being and relationships",
      "Coping Skills":
        "Your repertoire of strategies to handle life challenges, stress, and difficult emotions in healthy ways",

      // Family therapy metrics
      "Family Communication":
        "How clearly and effectively family members express thoughts and feelings to one another with openness and respect",
      "Role Definition":
        "The clarity and appropriateness of expectations, responsibilities, and boundaries within the family system",
      "Conflict Management":
        "How the family addresses disagreements, navigates differences, and resolves problems collaboratively",
      "Family Bonding":
        "The emotional connections, trust, and supportive relationships between family members",
    };

    return descriptions[name] || "";
  };

  // Provide skill-building tips based on metric scores
  const getSkillBuildingTips = (
    name: string,
    score: number
  ): string[] | null => {
    // Only show tips for scores under 70
    if (score >= 70) return null;

    const tips: Record<string, string[]> = {
      "Active Listening": [
        "Practice reflecting back what your partner says before responding",
        "Maintain eye contact and put away distractions when talking",
        "Ask clarifying questions instead of making assumptions",
        "Notice when your mind wanders and gently bring attention back",
      ],
      "Expressing Needs": [
        'Use "I" statements instead of "you" accusations',
        "Be specific about what you need rather than generalizing",
        "Express feelings without blaming your partner",
        "Practice stating needs calmly, even during difficult conversations",
      ],
      "Conflict Resolution": [
        "Take breaks when emotions run high, but commit to returning to the discussion",
        "Focus on the current issue rather than bringing up past problems",
        "Look for compromise rather than winning the argument",
        "Acknowledge your partner's perspective before offering solutions",
      ],
      "Emotional Support": [
        "Validate emotions even when you don't understand them",
        "Show compassion through both words and physical comfort",
        "Check in regularly about how your partner is feeling",
        "Express appreciation for your partner's vulnerabilities",
      ],
      "Self-awareness": [
        "Keep a daily emotions journal to track patterns",
        "Ask trusted friends for feedback about your blind spots",
        "Notice your physical reactions during emotional moments",
        "Reflect on how your past experiences influence current reactions",
      ],
      "Family Communication": [
        "Hold regular family meetings where everyone can speak",
        "Practice active listening without interrupting",
        'Create a "no judgment" rule for expressing feelings',
        "Use visual aids or written notes for important information",
      ],
    };

    return tips[name] ? tips[name] : null;
  };

  // Ref to track if the tooltip has triggered interaction
  const tooltipInteractionRef = useRef(false);

  // Effect to handle tooltip interaction
  useEffect(() => {
    if (tooltipInteractionRef.current && !userInteracted) {
      setUserInteracted(true);
      localStorage.setItem("chartUserInteracted", "true");
      tooltipInteractionRef.current = false;
    }
  }, [userInteracted]);

  // Custom tooltip implementation with manual show/hide logic
  interface TooltipProps {
    active?: boolean;
    payload?: Array<any>;
  }

  const CustomTooltip = useCallback(
    ({ active, payload }: TooltipProps) => {
      // Force hide tooltip when not active
      if (!active || !payload || payload.length === 0) {
        return null;
      }

      // Get the metric data
      const data = payload[0];
      if (!data || !data.name) {
        return null;
      }

      // Get improvement tips if available
      const tips = getSkillBuildingTips(data.name, data.value);

      // Determine the metric color
      const metricIndex =
        COLORS.indexOf(getColorForMetric(data.name)) !== -1
          ? COLORS.indexOf(getColorForMetric(data.name))
          : 0;
      const metricColor = COLORS[metricIndex % COLORS.length];

      // Determine score rating
      let scoreRating = "";
      let scoreColor = "";
      if (data.value >= 80) {
        scoreRating = "Excellent";
        scoreColor = "text-green-600";
      } else if (data.value >= 60) {
        scoreRating = "Good";
        scoreColor = "text-teal-600";
      } else if (data.value >= 40) {
        scoreRating = "Average";
        scoreColor = "text-amber-600";
      } else {
        scoreRating = "Needs Focus";
        scoreColor = "text-rose-600";
      }

      // Create and return tooltip content with colored border
      return (
        <div
          className="bg-white p-4 rounded-lg shadow-lg border-2 min-w-[200px] max-w-[300px] z-[9999]"
          style={{
            borderColor: metricColor,
            pointerEvents: "none", // Prevent tooltip from capturing mouse events
            overflow: "visible",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-sm" style={{ color: metricColor }}>
              {data.name}
            </span>
            <span
              className={`${scoreColor} text-xs px-2 py-0.5 rounded-full bg-gray-100`}
            >
              {scoreRating}
            </span>
          </div>

          <div className="bg-gray-100 p-2 rounded-lg mb-2">
            <div className="flex justify-between mb-1">
              <span className="text-xs">Score:</span>
              <span className="text-xs font-bold">{data.value}/100</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${data.value}%`,
                  backgroundColor: metricColor,
                }}
              ></div>
            </div>
          </div>

          <div className="text-xs text-gray-600 mb-2">
            {getDescriptionForMetric(data.name)}
          </div>

          {tips && tips.length > 0 && (
            <div className="text-xs mt-2 pt-2 border-t border-gray-200">
              <div
                className="font-semibold mb-1"
                style={{ color: metricColor }}
              >
                Improvement Tips:
              </div>
              <ul className="list-disc pl-4">
                {tips.slice(0, 1).map((tip, i) => (
                  <li key={i} className="text-gray-600">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    },
    [COLORS, getColorForMetric, getDescriptionForMetric, getSkillBuildingTips]
  );

  // Find the highest and lowest scoring metrics
  const highestMetric =
    metricsData.length > 0
      ? [...metricsData].sort((a, b) => b.value - a.value)[0]
      : null;
  const lowestMetric =
    metricsData.length > 0
      ? [...metricsData].sort((a, b) => a.value - b.value)[0]
      : null;

  // Function to safely format the lowest metric name for display in the recommendation
  const getFormattedLowestMetricName = (): string => {
    if (!lowestMetric?.name) return "communication skills";
    return lowestMetric.name.toLowerCase();
  };

  let content;

  if (loading) {
    content = (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl p-6 h-full min-h-[520px] flex flex-col"
      >
        <div className="flex items-center mb-6">
          <motion.div 
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 flex items-center justify-center text-white mr-3 shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </motion.div>
          <h2 className="text-xl font-semibold text-white">
            Communication Metrics
          </h2>
        </div>
        <div className="flex-grow flex items-center justify-center">
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
                className="animate-spin h-12 w-12 sm:h-14 sm:w-14 text-emerald-400"
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
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl animate-pulse"></div>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-white font-medium text-sm sm:text-base text-center"
            >
              Loading communication insights...
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-2 text-white/60 text-xs sm:text-sm text-center"
            >
              Analyzing your interaction patterns
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  } else if (error) {
    content = (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl p-6 h-full min-h-[520px] flex flex-col"
      >
        <div className="flex items-center mb-6">
          <motion.div 
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/30 flex items-center justify-center text-white mr-3 shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </motion.div>
          <h2 className="text-xl font-semibold text-white">
            Communication Metrics
          </h2>
        </div>
          
        <div className="flex-grow flex items-center justify-center">
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
              <svg className="w-16 h-16 mx-auto text-amber-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </motion.div>
            <p className="text-lg sm:text-xl font-semibold text-white mb-2">
              No Communication Data Yet
            </p>
            <p className="text-sm sm:text-base text-white/80 mb-6">
              {error === "No data available yet" 
                ? "Start your therapy journey to unlock communication insights and track your progress."
                : error}
            </p>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleAssessment}
              className="px-6 sm:px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full text-sm sm:text-base font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-emerald-500/30"
            >
              <span className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Take Assessment
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Assessment Modal
  if (isAssessmentOpen) {
    content = (
      <>
        {content}
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                {therapyType === "couple"
                  ? "Relationship"
                  : therapyType === "family"
                    ? "Family"
                    : "Personal"}{" "}
                Assessment
              </h3>
              <button
                onClick={toggleAssessment}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6 text-sm text-gray-600">
                Your assessment results will be used to personalize your
                therapy experience and track your progress over time.
              </div>
              <div className="overflow-y-auto max-h-[60vh]">
                <RelationshipAssessment />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  } else {
    content = (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full flex flex-col relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4 sm:p-6 overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center mb-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-green-400/40 to-emerald-500/40 flex items-center justify-center text-white mr-3 shadow-lg backdrop-blur-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 sm:h-6 sm:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </motion.div>
            <motion.h2 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-xl font-semibold text-white"
            >
              Communication Quality
            </motion.h2>
          </div>

          {/* Use the reusable therapy type selector - only show when data is available */}
          {metricsData.length > 0 && <TherapyTypeSelector />}

          {/* Header with expanded view toggle */}
          <div className="flex justify-end mb-2 sticky top-0 z-10">
            {/* This invisible spacer ensures the expand button doesn't jump when content changes */}
            <div className="invisible h-0 opacity-0">
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Collapse
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={toggleExpanded}
              className="text-xs sm:text-sm flex items-center text-white bg-gradient-to-r from-purple-500/30 to-indigo-500/30 backdrop-blur-sm hover:from-purple-500/40 hover:to-indigo-500/40 px-3 py-1.5 rounded-lg shadow-lg border border-white/20 transition-all duration-200"
            >
              {isExpanded ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Collapse
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Expand
                </>
              )}
            </motion.button>
          </div>

          {/* Metrics summary and chart types */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 relative z-20">
            <div className="flex gap-1.5 bg-white/10 backdrop-blur-sm p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setChartType("radar");
                  setUserInteracted(true);
                  playSound();
                }}
                className={`px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex-1 sm:flex-initial min-w-[80px] ${
                  chartType === "radar"
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg scale-105"
                    : "bg-white/20 text-white/90 hover:bg-white/30"
                }`}
              >
                <span className="flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="hidden sm:inline">Radar</span>
                  <span className="sm:hidden">Radar</span>
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setChartType("pie");
                  setUserInteracted(true);
                  playSound();
                }}
                className={`px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex-1 sm:flex-initial min-w-[80px] ${
                  chartType === "pie"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg scale-105"
                    : "bg-white/20 text-white/90 hover:bg-white/30"
                }`}
              >
                <span className="flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                  </svg>
                  <span className="hidden sm:inline">Pie</span>
                  <span className="sm:hidden">Pie</span>
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setChartType("radial");
                  setUserInteracted(true);
                  playSound();
                }}
                className={`px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex-1 sm:flex-initial min-w-[80px] ${
                  chartType === "radial"
                    ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg scale-105"
                    : "bg-white/20 text-white/90 hover:bg-white/30"
                }`}
              >
                <span className="flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  <span className="hidden sm:inline">Radial</span>
                  <span className="sm:hidden">Bars</span>
                </span>
              </motion.button>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 justify-start sm:justify-end w-full sm:w-auto">
              <motion.div
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-emerald-500/20 to-green-500/20 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-400/30 ${!highestMetric && "opacity-50"}`}
              >
                <p className="text-xs sm:text-sm text-emerald-300 font-medium flex items-center">
                  <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </motion.svg>
                  Strongest
                </p>
                <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
                  {highestMetric?.name || "Loading..."}
                </p>
                {highestMetric?.value && (
                  <p className="text-[10px] sm:text-xs text-emerald-200/70 mt-0.5">
                    {highestMetric.value}%
                  </p>
                )}
              </motion.div>
              <motion.div
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl shadow-lg border border-amber-400/30 ${!lowestMetric && "opacity-50"}`}
              >
                <p className="text-xs sm:text-sm text-amber-300 font-medium flex items-center">
                  <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </motion.svg>
                  Focus Area
                </p>
                <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
                  {lowestMetric?.name || "Loading..."}
                </p>
                {lowestMetric?.value && (
                  <p className="text-[10px] sm:text-xs text-amber-200/70 mt-0.5">
                    {lowestMetric.value}%
                  </p>
                )}
              </motion.div>
            </div>
          </div>

          <style>
            {`
              /* Custom styling for radar chart labels to fit on small screens */
              @media (max-width: 480px) {
                .recharts-polar-angle-axis-tick text {
                  font-size: 9px !important;
                  text-anchor: middle;
                }
              }
              
              /* Fix text wrapping issue */
              .recharts-polar-angle-axis-tick {
                text-anchor: middle;
              }
              
              /* Ensure no text is cut off */
              .recharts-wrapper {
                overflow: visible !important;
              }
              
              /* Pie chart active section animation */
              @keyframes pulsePie {
                0% { 
                  transform: scale(1);
                  opacity: 1;
                }
                50% { 
                  transform: scale(1.1);
                  opacity: 0.9;
                }
                100% { 
                  transform: scale(1);
                  opacity: 1;
                }
              }
              
              /* Add the animation to pie segments */
              .active-pie-segment {
                animation: pulsePie 1.5s ease-in-out infinite;
                transform-origin: center;
                transform-box: fill-box;
                filter: drop-shadow(0 0 5px rgba(0,0,0,0.5));
              }
              
              /* Border glow animation for labels */
              @keyframes borderGlow {
                0% {
                  filter: drop-shadow(0 0 2px currentColor);
                  stroke-width: 1.2px;
                }
                100% {
                  filter: drop-shadow(0 0 6px currentColor);
                  stroke-width: 2px;
                }
              }
              
              /* Border pulse animation for tooltips */
              @keyframes borderPulse {
                0% {
                  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2), 0 0 0 2px currentColor;
                  border-color: currentColor;
                }
                100% {
                  box-shadow: 0 0 12px rgba(0, 0, 0, 0.3), 0 0 0 3px currentColor;
                  border-color: currentColor;
                }
              }
              
              /* Ensure tooltips display properly */
              .recharts-tooltip-wrapper {
                pointer-events: none !important;
                z-index: 1000 !important;
                overflow: visible !important;
                position: fixed !important;
                left: auto !important;
                top: auto !important;
              }
              
              /* Make sure chart container allows overflow */
              .recharts-wrapper {
                overflow: visible !important;
                position: static !important;
              }
              
              /* Ensure responsive containers allow overflow */
              .recharts-responsive-container {
                overflow: visible !important;
                position: static !important;
                min-height: 330px !important;
              }
              
              @media (min-width: 481px) {
                .recharts-responsive-container {
                  min-height: 370px !important;
                }
              }
              
              @media (min-width: 768px) {
                .recharts-responsive-container {
                  min-height: 400px !important;
                }
              }
              
              /* Ensure legends stay within container bounds */
              .recharts-legend-wrapper {
                width: 100% !important;
                left: 0 !important;
                right: 0 !important;
                margin: 0 auto !important;
                text-align: center !important;
                position: relative !important;
              }
              
              /* Force legend items to stay within container */
              .recharts-default-legend {
                width: 100% !important;
                display: flex !important;
                flex-wrap: wrap !important;
                justify-content: center !important;
                margin: 0 auto !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                position: relative !important;
              }
              
              /* Specifically target the legend container */
              .recharts-legend-wrapper ul.recharts-default-legend {
                flex-direction: row !important;
                align-items: center !important;
                gap: 4px !important;
              }
              
              /* Make charts responsive to screen size */
              @media (max-width: 480px) {
                .recharts-legend-wrapper {
                  font-size: 10px !important;
                  bottom: 0 !important;
                  left: 0 !important;
                  right: 0 !important;
                  margin: 0 auto !important;
                }
                .recharts-default-legend {
                  width: 100% !important;
                  text-align: center !important;
                  justify-content: center !important;
                }
                .recharts-legend-item {
                  margin-right: 4px !important;
                  margin-left: 4px !important;
                }
                .recharts-pie {
                  transform: scale(0.85);
                  transform-origin: center center;
                }
                .recharts-radial-bar-background-sector,
                .recharts-radial-bar-sector {
                  transform: scale(0.9);
                  transform-origin: center center;
                }
                .recharts-radar {
                  transform: scale(0.9);
                  transform-origin: center center;
                }
                .recharts-polar-angle-axis-tick-value {
                  font-size: 9px !important;
                }
                .recharts-legend-item {
                  display: inline-block !important;
                  width: auto !important;
                  margin: 0 4px !important;
                  padding: 2px 4px !important;
                  text-align: center !important;
                }
                
                .recharts-legend-item-text {
                  display: inline-block;
                  width: auto !important;
                  max-width: 80px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  vertical-align: middle;
                  font-size: 10px !important;
                }
                
                /* Fix centering issues on small screens */
                .recharts-wrapper, .recharts-surface {
                  display: flex !important;
                  justify-content: center !important;
                  width: 100% !important;
                }
                
                .recharts-wrapper svg {
                  display: block !important;
                  margin: 0 auto !important;
                }
              }
              
              /* Small mobile screens - 430px and below */
              @media (max-width: 430px) {
                .recharts-pie {
                  transform: scale(0.75);
                  transform-origin: center center;
                  position: relative;
                  left: 0;
                }
                .recharts-radial-bar-background-sector,
                .recharts-radial-bar-sector {
                  transform: scale(0.8);
                  transform-origin: center center;
                }
                .recharts-radar {
                  transform: scale(0.8);
                  transform-origin: center center;
                }
                .recharts-legend-item-text {
                  max-width: 60px;
                  font-size: 10px !important;
                }
                .recharts-default-legend {
                  padding: 0 !important;
                  width: 100% !important;
                  display: flex !important;
                  flex-wrap: wrap !important;
                  justify-content: center !important;
                  margin: 0 auto !important;
                  box-sizing: border-box !important;
                  left: 0 !important;
                  right: 0 !important;
                }
                /* Shorten text display for all legend items */
                .recharts-legend-item-text {
                  display: inline-block;
                  max-width: 55px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
                
                /* Better positioning for legends on very small screens */
                .recharts-legend-wrapper {
                  position: absolute !important;
                  bottom: 5px !important;
                  width: 100% !important;
                  left: 0 !important;
                  right: 0 !important;
                  margin: 0 auto !important;
                  text-align: center !important;
                }
                
                /* Container centering fixes */
                .recharts-responsive-container {
                  display: flex !important;
                  justify-content: center !important;
                  align-items: center !important;
                  text-align: center !important;
                }
                
                .recharts-wrapper {
                  margin: 0 auto !important;
                  display: inline-block !important;
                  left: 0 !important;
                  right: 0 !important;
                }
                
                /* Fix all SVG elements positioning */
                .recharts-surface {
                  margin: 0 auto !important;
                  display: block !important;
                  left: 0 !important;
                  transform: none !important;
                }
              }
              
              /* Very small screens - under 432px */
              @media (max-width: 432px) {
                .recharts-wrapper {
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  left: 0 !important;
                  transform: none !important;
                  position: relative !important;
                }
                
                .recharts-surface {
                  margin: 0 !important;
                  padding: 0 !important;
                  left: 0 !important;
                  transform: none !important;
                }
                
                .recharts-responsive-container {
                  padding: 0 10px !important;
                  margin: 0 !important;
                  width: 100% !important;
                }
              }
              
              /* Fix positioning of all chart containers */
              .recharts-surface, .recharts-layer {
                overflow: visible !important;
              }
              
              /* Center all SVG elements by default */
              .recharts-wrapper {
                margin: 0 auto !important;
                display: block !important;
                position: relative !important;
              }
              
              /* Ensure charts are centered */
              .recharts-responsive-container {
                margin: 0 auto !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              
              /* Center pie chart elements */
              .recharts-pie {
                transform-origin: center center !important;
              }
              
              /* Fix radial bar chart positioning */
              .recharts-radial-bar-chart {
                margin: 0 auto !important;
              }
              
              /* Fix radar chart positioning */
              .recharts-radar {
                margin: 0 auto !important;
              }
              
              /* Fix pie chart labels */
              .recharts-pie-label-text {
                font-weight: bold;
                font-size: 12px;
              }
              
              /* Adjust label size for small screens */
              @media (max-width: 480px) {
                .recharts-pie-label-text {
                  font-size: 9px !important;
                }
                .recharts-pie-label-text.bg {
                  stroke-width: 3px !important;
                }
              }
              
              /* Tablet adjustments */
              @media (min-width: 481px) and (max-width: 768px) {
                .recharts-pie-label-text {
                  font-size: 11px !important;
                }
              }
            `}
          </style>

          <motion.div
            className="relative w-full max-w-[900px] mx-auto bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30 p-3 sm:p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ overflow: 'visible' }}
            onClick={() => {
              if (!userInteracted) {
                setUserInteracted(true);
                localStorage.setItem("chartUserInteracted", "true");
              }
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={chartType}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full overflow-visible"
              >
                {metricsData && metricsData.length > 0 ? (
                  <div className="w-full h-full overflow-visible">
                    {chartType === "radar" ? (
                      <div style={{ width: "100%", height: isSmallScreen ? 420 : 450 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            cx="50%"
                            cy="50%"
                            outerRadius={isSmallScreen ? "90%" : "85%"}
                            data={metricsData}
                            margin={{ 
                              top: isSmallScreen ? 20 : 120, 
                              right: isSmallScreen ? 20 : 120, 
                              bottom: isSmallScreen ? 20 : 120, 
                              left: isSmallScreen ? 20 : 120 
                            }}
                            className="overflow-visible"
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => setActiveTooltip(null)}
                            onClick={handleMouseMove}
                          >
                          <defs>
                            <filter
                              id="glow"
                              x="-20%"
                              y="-20%"
                              width="140%"
                              height="140%"
                            >
                              <feGaussianBlur stdDeviation="3" result="blur" />
                              <feComposite
                                in="SourceGraphic"
                                in2="blur"
                                operator="over"
                              />
                            </filter>
                            <linearGradient
                              id="radarFill"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#3B82F6"
                                stopOpacity="0.8"
                              />
                              <stop
                                offset="50%"
                                stopColor="#60A5FA"
                                stopOpacity="0.6"
                              />
                              <stop
                                offset="100%"
                                stopColor="#93C5FD"
                                stopOpacity="0.4"
                              />
                            </linearGradient>
                          </defs>
                          {/* Custom performance zone circles with subtle visibility */}
                          <circle cx="50%" cy="50%" r="80%" fill="transparent" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                          <circle cx="50%" cy="50%" r="60%" fill="transparent" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                          <circle cx="50%" cy="50%" r="40%" fill="transparent" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                          <circle cx="50%" cy="50%" r="20%" fill="transparent" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                          
                          {/* Enhanced grid lines */}
                          <PolarGrid stroke="rgba(255, 255, 255, 0.15)" strokeOpacity={1} strokeDasharray="2 4" strokeWidth="1" />
                          <PolarAngleAxis
                            dataKey={isSmallScreen ? "shortName" : "name"}
                            tick={{
                              fill: "#FFFFFF",
                              fontSize: isSmallScreen ? 11 : 13,
                              fontWeight: 600,
                              dy: 5
                            }}
                            tickSize={6}
                            className="font-medium"
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ 
                              fill: "rgba(255, 255, 255, 0.9)", 
                              fontWeight: 600, 
                              fontSize: isSmallScreen ? 12 : 14
                            }}
                            tickCount={6}
                            stroke="rgba(255, 255, 255, 0.3)"
                            axisLine={{ strokeWidth: 2, stroke: 'rgba(255, 255, 255, 0.3)' }}
                            tickFormatter={(value) => {
                              // Add custom formatting to score indicators
                              if (value === 0) return ""; // Hide 0 value
                              
                              if (value === 100) return `${value}%`;
                              if (value >= 80) return `${value}`;
                              if (value >= 60) return `${value}`;
                              if (value >= 40) return `${value}`;
                              if (value >= 20) return `${value}`;
                              return `${value}`;
                            }}
                          />
                          {/* Render custom trend indicators and focus area highlights */}
                          {metricsData.map((metric, index) => {
                            // Calculate position on radar chart
                            const angle = (Math.PI * 2) / metricsData.length * index;
                            const radius = metric.value / 100 * (isSmallScreen ? 90 : 85);
                            const x = 50 + Math.sin(angle) * radius;
                            const y = 50 - Math.cos(angle) * radius;
                            
                            return (
                              <g key={`trend-${index}`}>
                                {/* Focus area indicator */}
                                {metric.focusArea && (
                                  <circle 
                                    cx={`${x}%`} 
                                    cy={`${y}%`} 
                                    r={isSmallScreen ? 12 : 9}
                                    fill="rgba(245, 158, 11, 0.15)"
                                    stroke="rgba(245, 158, 11, 0.4)"
                                    strokeWidth={1.5}
                                    strokeDasharray="3 2"
                                    className="animate-pulse"
                                  />
                                )}
                                
                                {/* Trend indicator */}
                                {metric.trend && (
                                  <g transform={`translate(${x}%, ${y}%)`}>
                                    {metric.trend === 'increasing' && (
                                      <polygon 
                                        points="0,-12 6,-4 -6,-4" 
                                        fill="#10B981" 
                                        opacity="0.9"
                                        transform={`scale(${isSmallScreen ? 1.2 : 1})`}
                                      />
                                    )}
                                    {metric.trend === 'decreasing' && (
                                      <polygon 
                                        points="0,12 6,4 -6,4" 
                                        fill="#EF4444" 
                                        opacity="0.9"
                                        transform={`scale(${isSmallScreen ? 1.2 : 1})`}
                                      />
                                    )}
                                    {metric.trend === 'stable' && (
                                      <line 
                                        x1="-6" 
                                        y1="0" 
                                        x2="6" 
                                        y2="0" 
                                        stroke="#6B7280"
                                        strokeWidth="3"
                                        opacity="0.9"
                                        transform={`scale(${isSmallScreen ? 1.2 : 1})`}
                                      />
                                    )}
                                  </g>
                                )}
                              </g>
                            );
                          })}
                          
                          <Radar
                            name=""
                            dataKey="value"
                            stroke="#60A5FA"
                            strokeWidth={isSmallScreen ? 4 : 3}
                            fill="transparent"
                            fillOpacity={0}
                            animationDuration={1500}
                            animationEasing="ease-out"
                            isAnimationActive={true}
                            style={{ filter: "url(#glow)" }}
                            dot={{
                              stroke: "#3B82F6",
                              strokeWidth: isSmallScreen ? 3 : 2,
                              fill: "#FFFFFF",
                              r: isSmallScreen ? 7 : 5,
                              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                            }}
                            activeDot={{
                              stroke: "#1E40AF",
                              strokeWidth: isSmallScreen ? 4 : 3,
                              fill: "#FFFFFF",
                              r: isSmallScreen ? 9 : 7,
                              className: "animate-pulse",
                              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))"
                            }}
                          />
                          <Tooltip
                            content={() => null} // Empty content, using portal instead
                            cursor={false}
                          />
                          {/* We're skipping the Legend component for the radar chart since 
                           it already has axis labels and doesn't need a separate legend */}
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : chartType === "pie" ? (
                      <div style={{ width: "100%", height: isSmallScreen ? 420 : 450 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart 
                            margin={{ 
                              top: isSmallScreen ? 40 : 120, 
                              right: isSmallScreen ? 30 : 60, 
                              bottom: isSmallScreen ? 40 : 60, 
                              left: isSmallScreen ? 30 : 60 
                            }}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                          <Tooltip 
                            content={() => null} // Empty content, using portal instead
                            cursor={false}
                            allowEscapeViewBox={{ x: true, y: true }}
                            isAnimationActive={false}
                            active={true}
                          />
                          <defs>
                            {/* Regular gradients for inactive slices */}
                            {COLORS.map((color, index) => (
                              <linearGradient
                                key={`gradient-${index}`}
                                id={`colorGradient-${index}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={color}
                                  stopOpacity={1}
                                />
                                <stop
                                  offset="100%"
                                  stopColor={color}
                                  stopOpacity={0.8}
                                />
                              </linearGradient>
                            ))}

                            {/* Enhanced gradients for active slices */}
                            {COLORS.map((color, index) => (
                              <linearGradient
                                key={`active-gradient-${index}`}
                                id={`activeGradient-${index}`}
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={color}
                                  stopOpacity={1}
                                />
                                <stop
                                  offset="50%"
                                  stopColor={`${color}dd`}
                                  stopOpacity={0.95}
                                />
                                <stop
                                  offset="100%"
                                  stopColor={color}
                                  stopOpacity={0.9}
                                />
                                <animate
                                  attributeName="x1"
                                  values="0;0.1;0"
                                  dur="2s"
                                  repeatCount="indefinite"
                                />
                                <animate
                                  attributeName="y1"
                                  values="0;0.1;0"
                                  dur="2s"
                                  repeatCount="indefinite"
                                />
                              </linearGradient>
                            ))}

                            {/* Add gleaming effect filter */}
                            <filter id="pieGleam">
                              <feGaussianBlur
                                stdDeviation="2.5"
                                result="blur"
                              />
                              <feSpecularLighting
                                result="specOut"
                                specularExponent="20"
                                lightingColor="white"
                              >
                                <fePointLight x="100" y="100" z="200" />
                              </feSpecularLighting>
                              <feComposite
                                in="SourceGraphic"
                                in2="specOut"
                                operator="arithmetic"
                                k1="0"
                                k2="1"
                                k3="1"
                                k4="0"
                              />
                            </filter>
                          </defs>
                          <Pie
                            activeIndex={activeIndex}
                            label={renderCustomizedLabel}
                            data={metricsData}
                            cx="50%"
                            cy="50%"
                            innerRadius={isSmallScreen ? 90 : 120}
                            outerRadius={isSmallScreen ? 160 : 200}
                            paddingAngle={6}
                            fill="#8884d8"
                            dataKey="value"
                            onMouseEnter={(_, index) => {
                              setActiveIndex(index);
                              setActivePieSection(index);
                            }}
                            onMouseMove={(e) => {
                              if (e && e.chartX && e.chartY) {
                                setMousePosition({ x: e.chartX, y: e.chartY });
                                setActiveTooltip({
                                  active: true,
                                  payload: [metricsData[activeIndex]],
                                  label: metricsData[activeIndex]?.name || ''
                                });
                              }
                            }}
                            onMouseLeave={() => {
                              setActiveTooltip(null);
                              setActivePieSection(null);
                            }}
                            animationDuration={1500}
                            animationEasing="ease-out"
                            isAnimationActive={true}
                          >
                            {metricsData.map((entry, index) => {
                              const isActive = activeIndex === index;
                              const currentColor =
                                COLORS[index % COLORS.length];

                              // Use a SUPER obvious hover effect with extreme visual changes
                              return (
                                <Cell
                                  key={`cell-${index}`}
                                  id={`pie-cell-${index}`}
                                  className={
                                    isActive ? "active-pie-segment" : ""
                                  }
                                  fill={
                                    isActive
                                      ? `url(#activeGradient-${index})`
                                      : `url(#colorGradient-${index})`
                                  }
                                  stroke={
                                    isActive ? currentColor : currentColor
                                  }
                                  strokeWidth={isActive ? 4 : 1}
                                  style={{
                                    filter: isActive
                                      ? `drop-shadow(0 0 8px ${currentColor})`
                                      : "none",
                                    cursor: "pointer",
                                    zIndex: isActive ? 10 : 1,
                                  }}
                                  onClick={() => {
                                    // Set active section and activate tooltip on click
                                    setActiveIndex(index);
                                    setActivePieSection(index);
                                    
                                    // Create coordinates near the center of the pie chart
                                    const centerX = 150; // Approximate pie chart center X
                                    const centerY = 150; // Approximate pie chart center Y
                                    
                                    // Position tooltip correctly
                                    setMousePosition({ x: centerX, y: centerY });
                                    setActiveTooltip({
                                      active: true,
                                      payload: [entry],
                                      label: entry.name
                                    });
                                  }}
                                />
                              );
                            })}

                            {/* Clear and visible highlight for active pie section */}
                            {activePieSection !== null ? (
                              <g className="pie-active-section">
                                {/* Create a more visible highlight effect */}
                                <circle
                                  cx="50%"
                                  cy="50%"
                                  r={88}
                                  fill="none"
                                  stroke={
                                    COLORS[activePieSection % COLORS.length]
                                  }
                                  strokeWidth={5}
                                  style={{
                                    animation:
                                      "simplePulse 1.2s ease-in-out infinite alternate",
                                    filter: `drop-shadow(0 0 8px ${COLORS[activePieSection % COLORS.length]})`,
                                  }}
                                />

                                {/* Add visible overlay on the active section */}
                                <path
                                  d={getPieSlicePath(
                                    activePieSection,
                                    metricsData,
                                    40, // inner radius
                                    70 // outer radius
                                  )}
                                  fill={`${COLORS[activePieSection % COLORS.length]}20`}
                                  stroke={
                                    COLORS[activePieSection % COLORS.length]
                                  }
                                  strokeWidth={2.5}
                                  style={{
                                    animation:
                                      "flashEffect 2s ease-in-out infinite",
                                    filter: `drop-shadow(0 0 5px ${COLORS[activePieSection % COLORS.length]})`,
                                  }}
                                />

                                {/* Bold, clear arrow pointing to the active section */}
                                <g>
                                  {/* Clear directional arrow */}
                                  <path
                                    d={`M50,50 L${
                                      50 +
                                      118 *
                                        Math.cos(
                                          (((activePieSection /
                                            metricsData.length) *
                                            360 -
                                            90 +
                                            (metricsData[activePieSection]
                                              .value /
                                              metricsData.reduce(
                                                (sum, entry) =>
                                                  sum + entry.value,
                                                0
                                              )) *
                                              180) *
                                            Math.PI) /
                                            180
                                        )
                                    },
                                    ${
                                      50 +
                                      118 *
                                        Math.sin(
                                          (((activePieSection /
                                            metricsData.length) *
                                            360 -
                                            90 +
                                            (metricsData[activePieSection]
                                              .value /
                                              metricsData.reduce(
                                                (sum, entry) =>
                                                  sum + entry.value,
                                                0
                                              )) *
                                              180) *
                                            Math.PI) /
                                            180
                                        )
                                    }`}
                                    stroke={
                                      COLORS[activePieSection % COLORS.length]
                                    }
                                    strokeWidth={3}
                                    fill="none"
                                    strokeLinecap="round"
                                    style={{
                                      animation:
                                        "arrowPulse 1.5s ease-in-out infinite",
                                      filter: `drop-shadow(0 0 3px ${COLORS[activePieSection % COLORS.length]})`,
                                    }}
                                  />
                                </g>

                                {/* Dynamic marker instead of static label */}
                                <circle
                                  cx={50}
                                  cy={50}
                                  r={30}
                                  fill="none"
                                  stroke={
                                    COLORS[activePieSection % COLORS.length]
                                  }
                                  strokeWidth={2}
                                  strokeDasharray="4 2"
                                  style={{
                                    opacity: 0.7,
                                    animation: "spin 15s linear infinite",
                                  }}
                                />

                                {/* Pulse effect on the active section */}
                                <circle
                                  cx={
                                    50 +
                                    93 *
                                      Math.cos(
                                        (((activePieSection /
                                          metricsData.length) *
                                          360 -
                                          90 +
                                          ((metricsData[activePieSection]
                                            .value /
                                            metricsData.reduce(
                                              (sum, entry) => sum + entry.value,
                                              0
                                            )) *
                                            180) /
                                            2) *
                                          Math.PI) /
                                          180
                                      )
                                  }
                                  cy={
                                    50 +
                                    93 *
                                      Math.sin(
                                        (((activePieSection /
                                          metricsData.length) *
                                          360 -
                                          90 +
                                          ((metricsData[activePieSection]
                                            .value /
                                            metricsData.reduce(
                                              (sum, entry) => sum + entry.value,
                                              0
                                            )) *
                                            180) /
                                            2) *
                                          Math.PI) /
                                          180
                                      )
                                  }
                                  r={6}
                                  fill={
                                    COLORS[activePieSection % COLORS.length]
                                  }
                                  stroke="white"
                                  strokeWidth={2}
                                  style={{
                                    animation:
                                      "dotPulse 1s ease-in-out infinite",
                                    filter: `drop-shadow(0 0 5px ${COLORS[activePieSection % COLORS.length]})`,
                                  }}
                                />

                                <style>
                                  {`
                                  @keyframes simplePulse {
                                    from { 
                                      opacity: 0.3;
                                      stroke-width: 2px;
                                      transform: scale(0.95);
                                    }
                                    to { 
                                      opacity: 1;
                                      stroke-width: 8px;
                                      transform: scale(1.05);
                                    }
                                  }
                                  
                                  @keyframes arrowMove {
                                    from {
                                      stroke-width: 3px;
                                      opacity: 0.7;
                                      transform: translateX(-3px) translateY(-3px) scale(0.9);
                                    }
                                    to {
                                      stroke-width: 8px;
                                      opacity: 1;
                                      transform: translateX(4px) translateY(4px) scale(1.1);
                                    }
                                  }
                                  
                                  @keyframes dotPulse {
                                    from {
                                      r: 5;
                                      opacity: 0.7;
                                      fill: white;
                                    }
                                    to {
                                      r: 12;
                                      opacity: 1;
                                      fill: #ffffff;
                                    }
                                  }
                                  
                                  @keyframes spin {
                                    from {
                                      transform: rotate(0deg);
                                    }
                                    to {
                                      transform: rotate(360deg);
                                    }
                                  }
                                  
                                  /* Add flash animation for the pie section */
                                  .pie-highlight-flash {
                                    animation: flashHighlight 0.5s ease-out forwards;
                                  }
                                  
                                  @keyframes flashHighlight {
                                    0% { filter: brightness(1); }
                                    50% { filter: brightness(2) saturate(2) drop-shadow(0 0 15px white); }
                                    100% { filter: brightness(1.5) saturate(1.5); }
                                  }
                                  
                                  @keyframes pulseSection {
                                    0% { 
                                      transform: scale(1.06);
                                      filter: drop-shadow(0 0 5px currentColor);
                                    }
                                    50% { 
                                      transform: scale(1.09);
                                      filter: drop-shadow(0 0 15px currentColor) brightness(1.2);
                                    }
                                    100% { 
                                      transform: scale(1.06);
                                      filter: drop-shadow(0 0 5px currentColor);
                                    }
                                  }
                                  
                                  @keyframes flashEffect {
                                    0% { opacity: 0.2; }
                                    50% { opacity: 0.6; }
                                    100% { opacity: 0.2; }
                                  }
                                  
                                  @keyframes arrowPulse {
                                    0% { 
                                      opacity: 0.7;
                                      stroke-width: 2;
                                      transform: scale(0.95);
                                    }
                                    50% { 
                                      opacity: 1;
                                      stroke-width: 3.5;
                                      transform: scale(1.05);
                                    }
                                    100% { 
                                      opacity: 0.7;
                                      stroke-width: 2;
                                      transform: scale(0.95);
                                    }
                                  }
                                  
                                  @keyframes dotPulse {
                                    0% { 
                                      r: 4;
                                      opacity: 0.7;
                                    }
                                    50% { 
                                      r: 8;
                                      opacity: 1;
                                    }
                                    100% { 
                                      r: 4;
                                      opacity: 0.7;
                                    }
                                  }
                                `}
                                </style>
                              </g>
                            ) : null}
                          </Pie>
                          <Tooltip
                            content={() => null} // Empty content, using portal instead
                            cursor={false}
                            wrapperStyle={{ 
                              zIndex: 99999,
                              position: 'absolute',
                              top: 'auto',
                              bottom: '-120px', // Position below the chart
                              left: '50%',
                              transform: 'translateX(-50%)',
                              pointerEvents: "none",
                              overflow: 'visible'
                            }}
                            contentStyle={{
                              backgroundColor: "white",
                              border: "none",
                              borderRadius: "8px",
                              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                              padding: 0,
                              overflow: 'visible'
                            }}
                            itemStyle={{ color: "#374151" }}
                            allowEscapeViewBox={{ x: true, y: true }}
                          />
                          <Legend
                            layout="horizontal"
                            verticalAlign="top"
                            align="center"
                            iconType="circle"
                            iconSize={12}
                            height={30}
                            onClick={() => {
                              // Disabled click functionality
                              return;
                            }}
                            wrapperStyle={{
                              paddingTop: "0",
                              paddingBottom: "5px",
                              fontSize: "14px",
                              fontWeight: 600,
                              cursor: "default",
                              marginBottom: "0",
                              position: "absolute",
                              top: "10px",
                              left: "0 !important",
                              right: "0 !important",
                              zIndex: 25,
                              width: "100% !important",
                              display: "none", /* Hide the legend buttons */
                              justifyContent: "center",
                              gap: "6px",
                            }}
                            formatter={(value: any, entry: any, index: any) => {
                              return (
                                <div
                                  className="flex flex-col items-center px-1 py-1 mx-0 sm:px-2 sm:mx-1 rounded-md"
                                  style={{
                                    pointerEvents: "none",
                                    cursor: "default",
                                    borderBottom: "none",
                                    background: "transparent",
                                    maxWidth: "100%",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  <span
                                    style={{
                                      color:
                                        activeIndex === index
                                          ? COLORS[index % COLORS.length]
                                          : "#666",
                                      fontWeight:
                                        activeIndex === index ? 700 : 600,
                                      fontSize: "12px",
                                      textAlign: "center",
                                      whiteSpace: "nowrap",
                                      padding: "0 4px",
                                    }}
                                  >
                                    {value}
                                  </span>
                                </div>
                              );
                            }}
                          />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div style={{ width: "100%", height: isSmallScreen ? 500 : 600, display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius={isSmallScreen ? "15%" : "25%"}
                            outerRadius={isSmallScreen ? "85%" : "80%"}
                            data={metricsData}
                            startAngle={180}
                            endAngle={0}
                            barSize={isSmallScreen ? 80 : 50}
                            margin={{ 
                              top: isSmallScreen ? 40 : 60, 
                              right: isSmallScreen ? 20 : 30, 
                              bottom: isSmallScreen ? 40 : 60, 
                              left: isSmallScreen ? 20 : 30 
                            }}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => setActiveTooltip(null)}
                            onClick={handleMouseMove}
                            className="overflow-visible"
                            style={{ margin: "0 auto" }}
                          >
                          <defs>
                            {COLORS.map((color, index) => (
                              <linearGradient
                                key={`linearGradient-${index}`}
                                id={`linearGradient-${index}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={color}
                                  stopOpacity={1}
                                />
                                <stop
                                  offset="95%"
                                  stopColor={color}
                                  stopOpacity={0.8}
                                />
                              </linearGradient>
                            ))}
                          </defs>
                          <RadialBar
                            label={(props: any) => {
                              const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, value, index } = props;
                              
                              // Validate all required props to prevent NaN errors
                              const isValidNumber = (num: any): num is number => 
                                typeof num === 'number' && !isNaN(num) && isFinite(num);
                              
                              if (!metricsData[index] || 
                                  !isValidNumber(value) || 
                                  !isValidNumber(cx) || 
                                  !isValidNumber(cy) ||
                                  !isValidNumber(innerRadius) || 
                                  !isValidNumber(outerRadius) ||
                                  !isValidNumber(startAngle) || 
                                  !isValidNumber(endAngle)) {
                                return null;
                              }
                              
                              const RADIAN = Math.PI / 180;
                              // Calculate the middle angle of this bar segment
                              const midAngle = (startAngle + endAngle) / 2;
                              
                              // Position text in the middle of the bar thickness
                              const textRadius = (innerRadius + outerRadius) / 2;
                              
                              // Calculate x,y coordinates for text positioning
                              const x = cx + textRadius * Math.cos(-midAngle * RADIAN);
                              const y = cy + textRadius * Math.sin(-midAngle * RADIAN);
                              
                              // Final validation of calculated coordinates
                              if (!isValidNumber(x) || !isValidNumber(y)) {
                                return null;
                              }
                              
                              const metric = metricsData[index];
                              const displayName = isSmallScreen ? (metric?.shortName || metric?.name) : metric?.name;
                              
                              return (
                                <g key={`radial-label-${index}`}>
                                  {/* Background circle for better readability */}
                                  <circle 
                                    cx={x} 
                                    cy={y} 
                                    r={isSmallScreen ? 22 : 28} 
                                    fill="rgba(0,0,0,0.7)" 
                                    stroke="rgba(255,255,255,0.3)"
                                    strokeWidth="1"
                                  />
                                  {/* Percentage value */}
                                  <text 
                                    x={x} 
                                    y={y - (isSmallScreen ? 5 : 7)} 
                                    fill="#fff" 
                                    textAnchor="middle" 
                                    dominantBaseline="middle"
                                    fontSize={isSmallScreen ? 13 : 15}
                                    fontWeight="bold"
                                  >
                                    {value}%
                                  </text>
                                  {/* Metric name */}
                                  <text 
                                    x={x} 
                                    y={y + (isSmallScreen ? 5 : 7)} 
                                    fill="rgba(255,255,255,0.95)" 
                                    textAnchor="middle" 
                                    dominantBaseline="middle"
                                    fontSize={isSmallScreen ? 9 : 11}
                                    fontWeight="500"
                                  >
                                    {displayName}
                                  </text>
                                </g>
                              );
                            }}
                            background={{ fill: "rgba(255,255,255,0.05)" }}
                            dataKey="value"
                            cornerRadius={12}
                            animationDuration={1500}
                            animationEasing="ease-out"
                            isAnimationActive={true}
                          >
                            {metricsData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={`url(#linearGradient-${index})`}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={
                                  entry.name === focusedMetric ? 2 : 0
                                }
                                style={{
                                  filter:
                                    entry.name === focusedMetric
                                      ? "drop-shadow(0 4px 3px rgba(0, 0, 0, 0.15))"
                                      : "none",
                                }}
                              />
                            ))}
                          </RadialBar>
                          <Tooltip
                            content={() => null} // Empty content, using portal instead
                            cursor={false}
                            wrapperStyle={{ 
                              zIndex: 99999,
                              position: 'absolute',
                              top: 'auto',
                              bottom: '-120px', // Position below the chart
                              left: '50%',
                              transform: 'translateX(-50%)',
                              pointerEvents: "none",
                              overflow: 'visible'
                            }}
                            contentStyle={{
                              backgroundColor: "white",
                              border: "none",
                              borderRadius: "8px",
                              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                              padding: 0,
                              overflow: 'visible'
                            }}
                            itemStyle={{ color: "#374151" }}
                            allowEscapeViewBox={{ x: true, y: true }}
                          />
                          <Legend
                            iconSize={12}
                            layout="horizontal"
                            verticalAlign="top"
                            align="center"
                            height={30}
                            onClick={() => {
                              if (!userInteracted) {
                                setUserInteracted(true);
                                localStorage.setItem(
                                  "chartUserInteracted",
                                  "true"
                                );
                              }
                            }}
                            wrapperStyle={{
                              paddingTop: "0",
                              paddingBottom: "0",
                              fontSize: "14px",
                              fontWeight: 600,
                              position: "absolute",
                              top: "5px",
                              zIndex: 25,
                              width: "100% !important",
                              display: "none", /* Hide the legend buttons */
                              justifyContent: "center",
                              gap: "8px",
                              left: "0 !important",
                              right: "0 !important",
                            }}
                            formatter={(value: any) => {
                              return (
                                <div
                                  className="flex flex-col items-center px-1 py-1 mx-0 sm:px-2 sm:mx-1 rounded-md"
                                  style={{
                                    pointerEvents: "none", 
                                    cursor: "default",
                                    borderBottom: "none",
                                    background: "transparent",
                                    maxWidth: "100%",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "#666",
                                      fontWeight: 600,
                                      fontSize: "12px",
                                      cursor: "default",
                                      transition: "all 0.2s ease",
                                      textAlign: "center",
                                      whiteSpace: "nowrap",
                                      padding: "0 4px",
                                    }}
                                  >
                                    {value}
                                  </span>
                                </div>
                              );
                            }}
                          />
                          </RadialBarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-center">
                      <svg
                        className="w-12 h-12 mx-auto text-purple-300"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <p className="mt-3 text-gray-500 text-sm">
                        No chart data available
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Chart type and focus indicator - NOW WITH LABELS */}
          <div className="flex justify-center mt-4 relative z-40 mb-4">
            <div className="flex space-x-6 items-center bg-white px-4 py-2 rounded-lg shadow-md">
              {[
                { type: "radar", label: "Radar" },
                { type: "pie", label: "Pie" },
                { type: "radial", label: "Bars" },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  className="flex flex-col items-center gap-1 cursor-pointer focus:outline-none"
                  onClick={() => {
                    setChartType(type);
                    setUserInteracted(true);
                    localStorage.setItem("chartUserInteracted", "true");
                    playSound();
                  }}
                >
                  <motion.div
                    animate={{
                      scale: chartType === type ? 1.2 : 1,
                      opacity: chartType === type ? 1 : 0.5,
                    }}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className={`w-3 h-3 rounded-full ${
                      chartType === type
                        ? type === "radar"
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600"
                          : type === "pie"
                            ? "bg-gradient-to-r from-teal-600 to-emerald-600"
                            : "bg-gradient-to-r from-rose-500 to-red-500"
                        : "bg-gray-300"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      chartType === type
                        ? type === "radar"
                          ? "text-purple-600"
                          : type === "pie"
                            ? "text-teal-600"
                            : "text-rose-500"
                        : "text-gray-400"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Additional insights for expanded view */}
          <AnimatePresence>
            {isExpanded ? (
              <motion.div
                id="communication-insights"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-6 mb-4 p-4 bg-white rounded-lg shadow-sm border border-purple-100 overflow-visible"
              >
                <h3 className="text-base font-medium text-purple-800 mb-4 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-purple-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Communication Insights & Recommendations
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 h-full shadow-sm">
                    <p className="font-medium text-purple-800 mb-2">
                      What the metrics mean:
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                      These metrics reflect key aspects of effective
                      communication in your relationship. Improvements across
                      all areas indicate growing emotional intelligence and
                      connection.
                    </p>
                  </div>

                  <div className="p-4 bg-teal-50 rounded-lg border border-teal-100 h-full shadow-sm">
                    <p className="font-medium text-teal-800 mb-2">
                      How to improve your focus area:
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                      Practice {getFormattedLowestMetricName()} regularly by
                      setting aside dedicated time for communication exercises.
                      Small, consistent efforts yield significant improvements.
                    </p>
                  </div>

                  {/* Metric buttons removed */}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Assessment Modal - accessible from any view with enhanced styling */}
          {isAssessmentOpen ? (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-purple-200"
              >
                <div className="p-4 bg-gradient-to-r from-purple-100 to-indigo-100 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-2 shadow-sm">
                      {therapyType === "couple" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-purple-600"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                      ) : therapyType === "family" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-rose-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-teal-600"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </span>
                    {therapyType === "couple"
                      ? "Relationship"
                      : therapyType === "family"
                        ? "Family"
                        : "Personal"}{" "}
                    Assessment
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      toggleAssessment();
                      playSound();
                    }}
                    className="text-gray-500 hover:text-gray-700 bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
                    </svg>
                  </motion.button>
                </div>
                <div className="p-6">
                  <div className="mb-6 text-sm text-gray-600 bg-purple-50 p-3 rounded-lg border border-purple-100">
                    <p className="flex items-center font-medium text-purple-800 mb-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Why this matters
                    </p>
                    <p>
                      Your assessment results will be used to personalize your
                      therapy experience and track your progress over time. This
                      helps our AI provide more relevant insights.
                    </p>
                  </div>
                  <div className="overflow-y-auto max-h-[60vh] pr-1">
                    <RelationshipAssessment />
                  </div>
                </div>
              </motion.div>
            </div>
          ) : null}
        </motion.div>
      </>
    );
  }

  // Render portal tooltip when active, outside of main content flow
  return (
    <>
      {activeTooltip && activeTooltip.active && mousePosition && (
        <PortalTooltip
          active={activeTooltip.active}
          payload={activeTooltip.payload}
          label={activeTooltip.label}
          x={mousePosition.x}
          y={mousePosition.y}
          isSmallScreen={isSmallScreen}
        />
      )}
      {content}
    </>
  );
}
