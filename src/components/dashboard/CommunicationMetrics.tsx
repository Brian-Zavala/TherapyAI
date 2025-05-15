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
import { useRouter } from "next/navigation";
import { useButtonSound } from "@/hooks/useButtonSound";
import RelationshipAssessment from "@/components/RelationshipAssessment";

// Define types for the metrics data
interface MetricDataItem {
  name: string;
  shortName: string;
  value: number;
  fullMark: number;
  fill: string;
  month?: string;
  monthFormatted?: string;
  growth?: number;
  avgSessionLength?: number;
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
  const playSound = useButtonSound(); // Sound effect for interactions

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

  // Handle metric focus
  const handleMetricFocus = (metricName: string) => {
    setFocusedMetric(focusedMetric === metricName ? null : metricName);
    playSound();
    // Mark as interacted
    if (!userInteracted) {
      setUserInteracted(true);
      localStorage.setItem("chartUserInteracted", "true");
    }
  };

  // Create a reusable component for the therapy type selector with enhanced styling
  const TherapyTypeSelector = () => (
    <div className="flex justify-center mb-3 sm:mb-4 mt-4 relative z-30">
      <div className="inline-flex p-1.5 bg-white rounded-lg w-full max-w-[300px] overflow-x-auto shadow-md border border-blue-100">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setTherapyType("couple");
            if (!userInteracted) {
              setUserInteracted(true);
              localStorage.setItem("chartUserInteracted", "true");
            }
            playSound();
          }}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium rounded-md transition-all flex-1 min-w-[75px] ${
            therapyType === "couple"
              ? "bg-blue-600 text-white shadow-md"
              : "text-blue-800 hover:bg-blue-100"
          }`}
        >
          Couple
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setTherapyType("solo");
            if (!userInteracted) {
              setUserInteracted(true);
              localStorage.setItem("chartUserInteracted", "true");
            }
            playSound();
          }}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium rounded-md transition-all flex-1 min-w-[75px] ${
            therapyType === "solo"
              ? "bg-blue-600 text-white shadow-md"
              : "text-blue-800 hover:bg-blue-100"
          }`}
        >
          Individual
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setTherapyType("family");
            if (!userInteracted) {
              setUserInteracted(true);
              localStorage.setItem("chartUserInteracted", "true");
            }
            playSound();
          }}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium rounded-md transition-all flex-1 min-w-[75px] ${
            therapyType === "family"
              ? "bg-blue-600 text-white shadow-md"
              : "text-blue-800 hover:bg-blue-100"
          }`}
        >
          Family
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

      // Transform data for different chart types
      const transformed = data.map((item: any) => ({
        ...item,
        name: item.name.replace("Score", ""), // Standard shortened name
        shortName: getShortenedName(item.name), // Ultra-short name for small screens
        fullMark: 100, // For radar chart
        fill: getColorForMetric(item.name), // For radial bar chart
      }));

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
      activeListeningScore: "#4F46E5", // Indigo-600 - Deep Mindfulness
      expressingNeedsScore: "#0EA5E9", // Sky-500 - Growth & Communication
      conflictResolutionScore: "#8B5CF6", // Violet-500 - Harmony & Balance
      emotionalSupportScore: "#EC4899", // Pink-500 - Empathy & Compassion
    };

    return colors[name] || "#4F46E5";
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

  const COLORS = ["#4F46E5", "#0EA5E9", "#8B5CF6", "#EC4899"];

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
    innerRadius,
    outerRadius,
    percent,
    index,
    name,
    value,
  }: CustomLabelProps) => {
    const RADIAN = Math.PI / 180;
    // Calculate radius based on the chart dimensions
    const radius = outerRadius * 1.1; // Fixed radius

    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only render the label for non-tiny slices to avoid overlapping
    if (percent < 0.05) return null;

    return (
      <g>
        {/* Background for better readability */}
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor={x > cx ? "start" : "end"}
          dominantBaseline="central"
          className="recharts-pie-label-text bg"
          style={{
            stroke: "white",
            strokeWidth: 4,
            paintOrder: "stroke",
          }}
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
        {/* Actual text */}
        <text
          x={x}
          y={y}
          fill={COLORS[index % COLORS.length]}
          textAnchor={x > cx ? "start" : "end"}
          dominantBaseline="central"
          className="recharts-pie-label-text"
        >
          {`${(percent * 100).toFixed(0)}%`}
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
      <div className="h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-md"></div>
          <p className="mt-6 text-purple-700 font-medium text-center">
            Analyzing your communication patterns...
            <br />
            <span className="text-sm text-purple-500">
              This may take a moment
            </span>
          </p>
        </div>
      </div>
    );
  } else if (error) {
    content = (
      <>
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-xl shadow-md max-w-md border border-purple-100">
            <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-purple-600"
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
            </div>
            <p className="text-xl font-medium text-gray-800">
              No {therapyType} communication data yet
            </p>
            <p className="text-sm mt-3 text-gray-600 max-w-sm mx-auto">
              Complete a {therapyType} assessment or therapy session to see
              detailed analytics and personalized insights about your
              communication patterns.
            </p>

            {/* Therapy Type Selector when no data is available */}
            <TherapyTypeSelector />

            <div className="flex flex-col sm:flex-row sm:space-x-4 justify-center mt-6 gap-3">
              <button
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium shadow-md hover:opacity-90 active:opacity-100 transition-opacity"
                onClick={() => {
                  toggleAssessment();
                  playSound();
                }}
              >
                Take Assessment
              </button>
              <button
                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium shadow-md hover:opacity-90 active:opacity-100 transition-opacity"
                onClick={() => {
                  router.push("/schedule");
                  playSound();
                }}
              >
                Schedule Session
              </button>
            </div>
          </div>
        </div>

        {/* Assessment Modal */}
        {isAssessmentOpen && (
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
        )}
      </>
    );
  } else {
    content = (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full flex flex-col relative"
        >
          {/* Use the reusable therapy type selector */}
          <TherapyTypeSelector />

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
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleExpanded}
              className="text-sm flex items-center text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md shadow-sm transition-all duration-200"
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
          <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3 mb-4 relative z-20">
            <div className="flex flex-wrap gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setChartType("radar");
                  setUserInteracted(true);
                  playSound();
                }}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  chartType === "radar"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "bg-purple-100 text-purple-800 hover:bg-purple-200"
                }`}
              >
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Radar
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setChartType("pie");
                  setUserInteracted(true);
                  playSound();
                }}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  chartType === "pie"
                    ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md"
                    : "bg-teal-100 text-teal-800 hover:bg-teal-200"
                }`}
              >
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                  </svg>
                  Pie
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setChartType("radial");
                  setUserInteracted(true);
                  playSound();
                }}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  chartType === "radial"
                    ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-md"
                    : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                }`}
              >
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  Bars
                </span>
              </motion.button>
            </div>

            <div className="flex flex-wrap gap-3 xs:gap-4 sm:gap-5 justify-start xs:justify-end w-full xs:w-auto">
              <motion.div
                whileHover={{ y: -2, scale: 1.03 }}
                onClick={() => {
                  if (highestMetric) {
                    handleMetricFocus(highestMetric.name);
                    if (!userInteracted) {
                      setUserInteracted(true);
                      localStorage.setItem("chartUserInteracted", "true");
                    }
                  }
                }}
                className={`px-4 py-3 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg shadow-md border border-green-100 ${highestMetric ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
              >
                <p className="text-sm text-green-600 font-medium flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Strongest
                </p>
                <p className="text-sm font-bold text-green-800">
                  {highestMetric?.name || "Not Available"}
                </p>
              </motion.div>
              <motion.div
                whileHover={{ y: -2, scale: 1.03 }}
                onClick={() => {
                  if (lowestMetric) {
                    handleMetricFocus(lowestMetric.name);
                    if (!userInteracted) {
                      setUserInteracted(true);
                      localStorage.setItem("chartUserInteracted", "true");
                    }
                  }
                }}
                className={`px-4 py-3 bg-gradient-to-br from-amber-50 to-orange-100 rounded-lg shadow-md border border-amber-100 ${lowestMetric ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
              >
                <p className="text-sm text-amber-600 font-medium flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Focus Area
                </p>
                <p className="text-sm font-bold text-amber-800">
                  {lowestMetric?.name || "Not Available"}
                </p>
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
                }
                .recharts-radial-bar-background-sector,
                .recharts-radial-bar-sector {
                  transform: scale(0.8);
                }
                .recharts-radar {
                  transform: scale(0.8);
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
                  display: inline-block !important;
                  left: 50% !important;
                  transform: translateX(-50%) !important;
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
            className="relative w-full max-w-[900px] mx-auto bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
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
                      <div style={{ width: "100%", height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            cx="50%"
                            cy="50%"
                            outerRadius="65%"
                            data={metricsData}
                            margin={{ top: 60, right: 60, bottom: 60, left: 60 }}
                            className="overflow-visible"
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
                                stopColor="#4F46E5"
                                stopOpacity="0.9"
                              />
                              <stop
                                offset="100%"
                                stopColor="#8B5CF6"
                                stopOpacity="0.7"
                              />
                            </linearGradient>
                          </defs>
                          <PolarGrid stroke="#374151" />
                          <PolarAngleAxis
                            dataKey={isSmallScreen ? "shortName" : "name"}
                            tick={{
                              fill: "#9CA3AF",
                              fontSize: isSmallScreen ? 11 : 12,
                              fontWeight: 500,
                              dy: 3,
                            }}
                            tickSize={4}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ fill: "#9CA3AF", fontWeight: 400 }}
                            tickCount={5}
                            stroke="#374151"
                          />
                          <Radar
                            name=""
                            dataKey="value"
                            stroke="#4F46E5"
                            strokeWidth={3}
                            fill="url(#radarFill)"
                            fillOpacity={1}
                            animationDuration={1500}
                            animationEasing="ease-out"
                            isAnimationActive={true}
                            style={{ filter: "url(#glow)" }}
                            dot={{
                              stroke: "#4F46E5",
                              strokeWidth: 2.5,
                              fill: "white",
                              r: 5,
                            }}
                            activeDot={{
                              stroke: "#8B5CF6",
                              strokeWidth: 4,
                              fill: "white",
                              r: 8,
                              className: "animate-pulse",
                            }}
                          />
                          <Tooltip
                            content={
                              <CustomTooltip active={false} payload={[]} />
                            }
                            animationDuration={0}
                            isAnimationActive={false}
                            cursor={false}
                            contentStyle={{
                              backgroundColor: "rgba(31, 41, 55, 0.8)",
                              borderColor: "#4B5563"
                            }}
                            itemStyle={{ color: "#E5E7EB" }}
                            allowEscapeViewBox={{ x: true, y: true }}
                          />
                          {/* We're skipping the Legend component for the radar chart since 
                           it already has axis labels and doesn't need a separate legend */}
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : chartType === "pie" ? (
                      <div style={{ width: "100%", height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart 
                            margin={{ top: 60, right: 30, bottom: 30, left: 30 }}>
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
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={6}
                            fill="#8884d8"
                            dataKey="value"
                            onMouseEnter={onPieEnter}
                            onMouseLeave={onPieLeave}
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
                                />
                              );
                            })}

                            {/* Clear and visible highlight for active pie section */}
                            {activePieSection !== null && (
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
                            )}
                          </Pie>
                          <Tooltip
                            content={
                              <CustomTooltip active={false} payload={[]} />
                            }
                            animationDuration={0}
                            animationEasing="linear"
                            wrapperStyle={{ pointerEvents: "none" }}
                            allowEscapeViewBox={{ x: true, y: true }}
                          />
                          <Legend
                            layout="horizontal"
                            verticalAlign="top"
                            align="center"
                            iconType="circle"
                            iconSize={12}
                            height={30}
                            onClick={(data) => {
                              // Allow clicking on legend items to focus on that section
                              const index = metricsData.findIndex(
                                (item) => item.name === data.value
                              );
                              if (index !== -1) {
                                setActivePieSection(index);
                                setActiveIndex(index);
                                if (!userInteracted) {
                                  setUserInteracted(true);
                                  localStorage.setItem(
                                    "chartUserInteracted",
                                    "true"
                                  );
                                }
                                playSound();
                              }
                            }}
                            wrapperStyle={{
                              paddingTop: "0",
                              paddingBottom: "5px",
                              fontSize: "14px",
                              fontWeight: 600,
                              cursor: "pointer",
                              marginBottom: "0",
                              position: "absolute",
                              top: "10px",
                              left: "0 !important",
                              right: "0 !important",
                              zIndex: 25,
                              width: "100% !important",
                              display: "flex",
                              justifyContent: "center",
                              gap: "6px",
                            }}
                            formatter={(value, entry, index) => {
                              return (
                                <div
                                  className="flex flex-col items-center px-1 py-1 mx-0 sm:px-2 sm:mx-1 rounded-md hover:bg-gray-100"
                                  style={{
                                    borderBottom:
                                      activeIndex === index
                                        ? `2px solid ${COLORS[index % COLORS.length]}`
                                        : "none",
                                    background:
                                      activeIndex === index
                                        ? `${COLORS[index % COLORS.length]}10`
                                        : "transparent",
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
                      <div style={{ width: "100%", height: 400, display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="20%"
                            outerRadius="80%"
                            data={metricsData}
                            startAngle={180}
                            endAngle={0}
                            barSize={14}
                            margin={{ top: 80, right: 20, bottom: 60, left: 20 }}
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
                            label={{
                              fill: "#666",
                              position: "insideStart",
                              fontSize: 14,
                              fontWeight: 600,
                            }}
                            background={{ fill: "#E1E9F8" }}
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
                            content={
                              <CustomTooltip active={false} payload={[]} />
                            }
                            animationDuration={0}
                            animationEasing="linear"
                            wrapperStyle={{ pointerEvents: "none" }}
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
                              display: "flex",
                              justifyContent: "center",
                              gap: "8px",
                              left: "0 !important",
                              right: "0 !important",
                            }}
                            formatter={(value, entry, index) => {
                              return (
                                <div
                                  className="flex flex-col items-center px-1 py-1 mx-0 sm:px-2 sm:mx-1 rounded-md hover:bg-gray-100"
                                  style={{
                                    borderBottom:
                                      focusedMetric === value
                                        ? `2px solid ${COLORS[index % COLORS.length]}`
                                        : "none",
                                    background:
                                      focusedMetric === value
                                        ? `${COLORS[index % COLORS.length]}10`
                                        : "transparent",
                                    maxWidth: "100%",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                  onClick={() => {
                                    handleMetricFocus(value);
                                    if (!userInteracted) {
                                      setUserInteracted(true);
                                      localStorage.setItem(
                                        "chartUserInteracted",
                                        "true"
                                      );
                                    }
                                  }}
                                >
                                  <span
                                    style={{
                                      color:
                                        focusedMetric === value
                                          ? COLORS[index % COLORS.length]
                                          : "#666",
                                      fontWeight:
                                        focusedMetric === value ? 700 : 600,
                                      fontSize: "12px",
                                      cursor: "pointer",
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
            {isExpanded && (
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

                  {focusedMetric && (
                    <div className="p-4 bg-rose-50 rounded-lg border border-rose-100 sm:col-span-2 shadow-sm">
                      <p className="font-medium text-rose-800 mb-2">
                        About {focusedMetric}:
                      </p>
                      <p className="text-gray-600 leading-relaxed">
                        {getDescriptionForMetric(focusedMetric)}
                      </p>
                      <div className="mt-3 pt-3 border-t border-rose-200 flex items-center">
                        <span className="text-rose-700 font-medium mr-2">
                          Try this:
                        </span>
                        <span className="text-gray-600">
                          {getSkillBuildingTips(focusedMetric, 60)?.[0] ||
                            "Schedule a 15-minute check-in each day focused specifically on practicing this skill."}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Assessment Modal - accessible from any view with enhanced styling */}
          {isAssessmentOpen && (
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
          )}
        </motion.div>
      </>
    );
  }

  return content;
}
