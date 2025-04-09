// src/components/dashboard/CommunicationMetrics.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadialBarChart, RadialBar } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useButtonSound } from "@/hooks/useButtonSound" 
import RelationshipAssessment from "@/components/RelationshipAssessment"

export default function CommunicationMetrics() {
  // Track when component has mounted to prevent client/server mismatches with animations
  const [isMounted, setIsMounted] = useState(false);
  
  const router = useRouter()
  const [metricsData, setMetricsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartType, setChartType] = useState('radar') // 'radar', 'pie', or 'radial'
  const [activeIndex, setActiveIndex] = useState(0)
  const [activePieSection, setActivePieSection] = useState(null) // Track active pie section for hover effect
  const [therapyType, setTherapyType] = useState('couple') // 'couple', 'solo', or 'family'
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false) // State for assessment modal
  const [focusedMetric, setFocusedMetric] = useState(null) // Track which metric is currently focused
  const [isExpanded, setIsExpanded] = useState(false) // For expanding/collapsing the card
  const expandedRef = useRef(false) // Use ref to track expansion state for scroll timing
  const [userInteracted, setUserInteracted] = useState(false) // Track if user has interacted with chart types
  const [isSmallScreen, setIsSmallScreen] = useState(false) // Track small screen size for responsive adjustments
  const playSound = useButtonSound() // Sound effect for interactions
  
  // Mount and initialize component
  useEffect(() => {
    setIsMounted(true);
    
    if (typeof window !== 'undefined') {
      // For testing purposes only - remove this line in production
      localStorage.removeItem('chartUserInteracted');
      
      // Set initial userInteracted state from localStorage
      const hasInteracted = localStorage.getItem('chartUserInteracted') === 'true';
      setUserInteracted(hasInteracted);
      
      // Check initial screen size
      setIsSmallScreen(window.innerWidth < 480);
      
      // Add resize listener for responsive adjustments
      const handleResize = () => {
        setIsSmallScreen(window.innerWidth < 480);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Clean up
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);
  
  // Function to toggle assessment modal
  const toggleAssessment = () => {
    setIsAssessmentOpen(!isAssessmentOpen)
  }
  
  // Toggle expanded view
  const toggleExpanded = () => {
    // Store the current state before updating it
    const currentlyExpanded = isExpanded;
    expandedRef.current = !currentlyExpanded;
    
    setIsExpanded(!currentlyExpanded);
    playSound();
    
    // Allow time for the animation to complete before scroll adjustment
    setTimeout(() => {
      if (!currentlyExpanded) { // We're expanding
        // If expanding, scroll the expanded insights into view
        const insightsSection = document.getElementById('communication-insights');
        if (insightsSection) {
          insightsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, 300); // Give time for the animation to start
  };
  
  // Handle metric focus
  const handleMetricFocus = (metricName) => {
    setFocusedMetric(focusedMetric === metricName ? null : metricName);
    playSound();
    // Mark as interacted
    if (!userInteracted) {
      setUserInteracted(true);
      localStorage.setItem('chartUserInteracted', 'true');
    }
  };

  // Create a reusable component for the therapy type selector with enhanced styling
  const TherapyTypeSelector = () => (
    <div className="flex justify-center mb-2 sm:mb-4">
      <div className="inline-flex p-1 bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg w-full max-w-[250px] overflow-x-auto shadow-sm">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setTherapyType('couple');
            if (!userInteracted) {
              setUserInteracted(true);
              localStorage.setItem('chartUserInteracted', 'true');
            }
            playSound();
          }}
          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-md transition-all flex-1 min-w-[60px] ${
            therapyType === 'couple' 
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
              : 'text-indigo-800 hover:bg-purple-100'
          }`}
        >
          Couple
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setTherapyType('solo');
            if (!userInteracted) {
              setUserInteracted(true);
              localStorage.setItem('chartUserInteracted', 'true');
            }
            playSound();
          }}
          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-md transition-all flex-1 min-w-[60px] ${
            therapyType === 'solo' 
              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md' 
              : 'text-teal-800 hover:bg-teal-100'
          }`}
        >
          Individual
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setTherapyType('family');
            if (!userInteracted) {
              setUserInteracted(true);
              localStorage.setItem('chartUserInteracted', 'true');
            }
            playSound();
          }}
          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-md transition-all flex-1 min-w-[60px] ${
            therapyType === 'family' 
              ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md' 
              : 'text-rose-800 hover:bg-rose-100'
          }`}
        >
          Family
        </motion.button>
      </div>
    </div>
  );
  
  // Simple console logging for debugging
  console.log('CommunicationMetrics render - therapyType:', therapyType);
  console.log('CommunicationMetrics render - metrics data length:', metricsData.length);
  
  const fetchMetricsData = async (type = 'couple') => {
    console.log('Fetching metrics data for type:', type);
    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/communication-metrics?type=${type}`)
      
      if (!response.ok) {
        // Handle different error cases based on status code
        if (response.status === 401) {
          throw new Error('Please sign in to view your metrics')
        } else if (response.status === 404) {
          throw new Error('User profile not found')
        } else {
          // Treat any other error as "No data yet" but don't throw an error
          setError('No data available yet')
          setLoading(false)
          return
        }
      }
      
      const data = await response.json()
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
      const getShortenedName = (name) => {
        name = name.replace('Score', ''); // First remove 'Score' suffix
        
        // For mobile displays, create even shorter versions
        // Only keep the first word for long metric names
        if (name === 'Active Listening') return 'Listening';
        if (name === 'Expressing Needs') return 'Needs';
        if (name === 'Conflict Resolution') return 'Conflict';
        if (name === 'Emotional Support') return 'Support';
        
        return name;
      };
      
      // Transform data for different chart types
      const transformed = data.map((item) => ({
        ...item,
        name: item.name.replace('Score', ''), // Standard shortened name
        shortName: getShortenedName(item.name), // Ultra-short name for small screens
        fullMark: 100, // For radar chart
        fill: getColorForMetric(item.name), // For radial bar chart
      }))
      
      console.log(`Transformed metrics data for ${type}:`, transformed);
      setMetricsData(transformed)
      setError(null); // Clear any previous error
    } catch (err) {
      console.error(`Error fetching ${type} communication metrics:`, err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  // Store the selected chart type in localStorage to persist between sessions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try to retrieve saved chart type and user interaction status
      const savedChartType = localStorage.getItem('preferredChartType');
      const hasInteracted = localStorage.getItem('chartUserInteracted') === 'true';
      
      if (savedChartType && ['radar', 'pie', 'radial'].includes(savedChartType)) {
        setChartType(savedChartType);
      }
      
      // Set user interaction state based on localStorage
      setUserInteracted(hasInteracted);
    }
  }, []);
  
  // Save chart type preference whenever it changes
  useEffect(() => {
    localStorage.setItem('preferredChartType', chartType);
    
    // If this is a user-initiated change (not from auto-rotation)
    if (userInteracted) {
      localStorage.setItem('chartUserInteracted', 'true');
    }
  }, [chartType, userInteracted]);

  // Auto rotation for charts, but only if user hasn't interacted
  useEffect(() => {
    if (userInteracted || !isMounted) return; // Don't rotate if user has interacted or component is not mounted yet
    
    let interval;
    
    // Add a short delay before starting rotation to ensure everything is loaded
    const startupDelay = setTimeout(() => {
      // Set up rotation of chart types
      interval = setInterval(() => {
        console.log('Auto-rotating chart type');
        setChartType((current) => {
          if (current === 'radar') return 'pie';
          if (current === 'pie') return 'radial';
          return 'radar';
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
  const getColorForMetric = (name) => {
    const colors = {
      activeListeningScore: "#7E57C2", // Soft purple - representing mindfulness
      expressingNeedsScore: "#26A69A", // Teal - representing growth
      conflictResolutionScore: "#5C6BC0", // Indigo blue - representing harmony
      emotionalSupportScore: "#EF5350", // Soft red - representing empathy
    }
    
    return colors[name] || "#7E57C2"
  }
  
  // Helper function to calculate the path for a pie slice
  const getPieSlicePath = (index, data, innerRadius, outerRadius) => {
    if (!data || data.length === 0 || index === null || index >= data.length) {
      return '';
    }
    
    // Calculate angles based on data values - use clockwise angles from 12 o'clock position
    const total = data.reduce((sum, entry) => sum + entry.value, 0);
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
  }
  
  const COLORS = ["#7E57C2", "#26A69A", "#5C6BC0", "#EF5350"]
  
  const onPieEnter = useCallback((_, index) => {
    // Set active indices for pie section highlighting
    setActiveIndex(index);
    setActivePieSection(index);
    
    // Create a SUPER dramatic animation effect when entering a pie slice
    const pieElement = document.getElementById(`pie-cell-${index}`);
    if (pieElement) {
      // Add class for CSS-based animation
      document.body.classList.add('animate-pie-active');
      
      // Apply dramatic scale transform to the cell
      pieElement.style.transform = 'scale(1.20)';
      pieElement.style.transformOrigin = 'center';
      pieElement.style.zIndex = '100';
      pieElement.style.position = 'relative';
      pieElement.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      
      // Add dramatic visual effects
      pieElement.style.filter = `drop-shadow(0 0 15px ${COLORS[index % COLORS.length]}) brightness(1.5)`;
      
      // Create explosion animation effect
      const chartContainer = document.querySelector('.recharts-wrapper');
      if (chartContainer) {
        // Add explosion animation overlay
        const explosionOverlay = document.createElement('div');
        explosionOverlay.id = 'pie-explosion-overlay';
        explosionOverlay.style.position = 'absolute';
        explosionOverlay.style.top = '0';
        explosionOverlay.style.left = '0';
        explosionOverlay.style.width = '100%';
        explosionOverlay.style.height = '100%';
        explosionOverlay.style.pointerEvents = 'none';
        explosionOverlay.style.background = `radial-gradient(circle at center, ${COLORS[index % COLORS.length]}99 0%, transparent 70%)`;
        explosionOverlay.style.animation = 'explodeEffect 0.5s ease-out forwards';
        explosionOverlay.style.zIndex = '90';
        
        // Add keyframe animation
        const styleSheet = document.createElement('style');
        styleSheet.id = 'explode-animation-style';
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
        pieElement.style.transform = '';
        pieElement.style.zIndex = 'auto';
        pieElement.style.filter = '';
        pieElement.style.transition = '';
        document.body.classList.remove('animate-pie-active');
      }, 1000);
    }
    
    // Register user interaction
    if (!userInteracted) {
      setUserInteracted(true);
      localStorage.setItem('chartUserInteracted', 'true');
    }
    
    // Play sound for tactile feedback
    playSound();
  }, [playSound, userInteracted, COLORS])
  
  // Custom radial label
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="#4B5563" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${name}: ${value}%`}
      </text>
    )
  }
  
  // Descriptions for each metric
  const getDescriptionForMetric = (name) => {
    const descriptions = {
      // Couple therapy metrics
      'Active Listening': 'Your ability to fully concentrate, understand, respond, and remember what your partner is saying without interrupting or preparing rebuttals',
      'Expressing Needs': 'How effectively you communicate your own desires, boundaries, and requirements in a clear, direct, and non-accusatory manner',
      'Conflict Resolution': 'Your ability to address disagreements constructively without escalation, using problem-solving approaches and finding mutually satisfactory solutions',
      'Emotional Support': 'How well you recognize, validate, and respond to each other\'s emotional experiences with empathy and compassion',
      
      // Solo therapy metrics
      'Self-awareness': 'Your ability to recognize and understand your own emotions, reactions, patterns, and how they influence your behavior',
      'Emotional Regulation': 'How effectively you manage and respond to emotional experiences, especially during stressful situations',
      'Personal Growth': 'Your progress in developing new perspectives, skills, and behaviors that enhance your well-being and relationships',
      'Coping Skills': 'Your repertoire of strategies to handle life challenges, stress, and difficult emotions in healthy ways',
      
      // Family therapy metrics
      'Family Communication': 'How clearly and effectively family members express thoughts and feelings to one another with openness and respect',
      'Role Definition': 'The clarity and appropriateness of expectations, responsibilities, and boundaries within the family system',
      'Conflict Management': 'How the family addresses disagreements, navigates differences, and resolves problems collaboratively',
      'Family Bonding': 'The emotional connections, trust, and supportive relationships between family members'
    }
    
    return descriptions[name] || ''
  }
  
  // Provide skill-building tips based on metric scores
  const getSkillBuildingTips = (name, score) => {
    // Only show tips for scores under 70
    if (score >= 70) return null;
    
    const tips = {
      'Active Listening': [
        'Practice reflecting back what your partner says before responding',
        'Maintain eye contact and put away distractions when talking',
        'Ask clarifying questions instead of making assumptions',
        'Notice when your mind wanders and gently bring attention back'
      ],
      'Expressing Needs': [
        'Use "I" statements instead of "you" accusations',
        'Be specific about what you need rather than generalizing',
        'Express feelings without blaming your partner',
        'Practice stating needs calmly, even during difficult conversations'
      ],
      'Conflict Resolution': [
        'Take breaks when emotions run high, but commit to returning to the discussion',
        'Focus on the current issue rather than bringing up past problems',
        'Look for compromise rather than winning the argument',
        'Acknowledge your partner\'s perspective before offering solutions'
      ],
      'Emotional Support': [
        'Validate emotions even when you don\'t understand them',
        'Show compassion through both words and physical comfort',
        'Check in regularly about how your partner is feeling',
        'Express appreciation for your partner\'s vulnerabilities'
      ],
      'Self-awareness': [
        'Keep a daily emotions journal to track patterns',
        'Ask trusted friends for feedback about your blind spots',
        'Notice your physical reactions during emotional moments',
        'Reflect on how your past experiences influence current reactions'
      ],
      'Family Communication': [
        'Hold regular family meetings where everyone can speak',
        'Practice active listening without interrupting',
        'Create a "no judgment" rule for expressing feelings',
        'Use visual aids or written notes for important information'
      ]
    };
    
    return tips[name] ? tips[name] : null;
  }

  // Ref to track if the tooltip has triggered interaction
  const tooltipInteractionRef = useRef(false);
  
  // Effect to handle tooltip interaction
  useEffect(() => {
    if (tooltipInteractionRef.current && !userInteracted) {
      setUserInteracted(true);
      localStorage.setItem('chartUserInteracted', 'true');
      tooltipInteractionRef.current = false;
    }
  }, [userInteracted]);
  
  // Enhanced custom tooltip for all chart types with styled components and animations
  const CustomTooltip = useCallback(({ active, payload }) => {
    // Mark that tooltip was interacted with through ref instead of setState during render
    if (active && payload?.length && !userInteracted) {
      // Use ref to defer state update
      setTimeout(() => {
        tooltipInteractionRef.current = true;
      }, 0);
    }
    
    if (active && payload && payload.length) {
      const data = payload[0];
      const tips = getSkillBuildingTips(data.name, data.value);
      
      // Determine color based on metric type
      const metricIndex = COLORS.indexOf(getColorForMetric(data.name)) !== -1 
        ? COLORS.indexOf(getColorForMetric(data.name))
        : 0;
      const metricColor = COLORS[metricIndex % COLORS.length];
      
      // Score rating text based on value
      let scoreRating = '';
      let scoreColor = '';
      if (data.value >= 80) {
        scoreRating = 'Excellent';
        scoreColor = 'text-green-600';
      } else if (data.value >= 60) {
        scoreRating = 'Good';
        scoreColor = 'text-teal-600';
      } else if (data.value >= 40) {
        scoreRating = 'Average';
        scoreColor = 'text-amber-600';
      } else {
        scoreRating = 'Needs Focus';
        scoreColor = 'text-rose-600';
      }
      
      return (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white p-4 shadow-lg rounded-lg border border-purple-200 min-w-[250px] max-w-xs z-50"
          style={{
            background: `linear-gradient(to bottom right, white, ${metricColor}10)`,
            boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px ${metricColor}30`
          }}
        >
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-800 flex items-center">
              <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: metricColor }}></span>
              {data.name}
            </p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${scoreColor} bg-gray-100`}>
              {scoreRating}
            </span>
          </div>
          
          <div className="mt-2 bg-white bg-opacity-60 rounded-lg p-2 border border-purple-100">
            <div className="relative pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block text-purple-800">
                    Score
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block" style={{ color: metricColor }}>
                    {data.value}/100
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mt-1 text-xs flex rounded-full bg-gray-200">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${data.value}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center rounded-full"
                  style={{ backgroundColor: metricColor }}
                />
              </div>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-600 leading-relaxed bg-white bg-opacity-60 p-2 rounded-lg border border-purple-100">
            {getDescriptionForMetric(data.name)}
          </div>
          
          {tips && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mt-3 pt-3 border-t border-purple-100"
            >
              <p className="text-xs font-medium text-amber-700 mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                Improvement Tips:
              </p>
              <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                {tips.slice(0, 2).map((tip, index) => (
                  <motion.li 
                    key={index} 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + (index * 0.1) }}
                    className="leading-tight"
                  >
                    {tip}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
          
          {data.value >= 70 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-3 pt-3 border-t border-green-100"
            >
              <p className="text-xs font-medium text-green-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Great work! Your progress in this area is strong. Keep practicing these skills.
              </p>
            </motion.div>
          )}
        </motion.div>
      )
    }
    return null
  }, [userInteracted, tooltipInteractionRef, COLORS, getColorForMetric, getSkillBuildingTips, getDescriptionForMetric])
  
  // Find the highest and lowest scoring metrics
  const highestMetric = metricsData.length > 0 ? [...metricsData].sort((a, b) => b.value - a.value)[0] : null
  const lowestMetric = metricsData.length > 0 ? [...metricsData].sort((a, b) => a.value - b.value)[0] : null
  
  // Function to safely format the lowest metric name for display in the recommendation
  const getFormattedLowestMetricName = () => {
    if (!lowestMetric?.name) return 'communication skills';
    return lowestMetric.name.toLowerCase();
  }

  let content;
  
  if (loading) {
    content = (
      <div className="h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-md"></div>
          <p className="mt-6 text-purple-700 font-medium text-center">
            Analyzing your communication patterns...
            <br />
            <span className="text-sm text-purple-500">This may take a moment</span>
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
              <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-xl font-medium text-gray-800">No {therapyType} communication data yet</p>
            <p className="text-sm mt-3 text-gray-600 max-w-sm mx-auto">
              Complete a {therapyType} assessment or therapy session to see detailed analytics and personalized insights about your communication patterns.
            </p>
            <div className="flex flex-col sm:flex-row sm:space-x-4 justify-center mt-6 gap-3">
              <button 
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium shadow-md hover:opacity-90 active:opacity-100 transition-opacity"
                onClick={() => {
                  toggleAssessment();
                  playSound();
                }}
              >
                Take Assessment
              </button>
              <button 
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg text-sm font-medium shadow-md hover:opacity-90 active:opacity-100 transition-opacity"
                onClick={() => {
                  router.push('/schedule');
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
                  {therapyType === 'couple' ? 'Relationship' : therapyType === 'family' ? 'Family' : 'Personal'} Assessment
                </h3>
                <button onClick={toggleAssessment} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6 text-sm text-gray-600">
                  Your assessment results will be used to personalize your therapy experience and 
                  track your progress over time.
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Collapse
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleExpanded}
              className="text-xs flex items-center text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md shadow-sm transition-all duration-200"
            >
              {isExpanded ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Collapse
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Expand
                </>
              )}
            </motion.button>
          </div>
        
          {/* Metrics summary and chart types */}
          <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3 mb-4">
            <div className="flex flex-wrap gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setChartType('radar');
                  setUserInteracted(true);
                  playSound();
                }}
                className={`px-2 py-1 text-xs rounded-md transition-all ${
                  chartType === 'radar' 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                    : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                }`}
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Radar
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setChartType('pie');
                  setUserInteracted(true);
                  playSound();
                }}
                className={`px-2 py-1 text-xs rounded-md transition-all ${
                  chartType === 'pie' 
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md' 
                    : 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                }`}
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
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
                  setChartType('radial');
                  setUserInteracted(true);
                  playSound();
                }}
                className={`px-2 py-1 text-xs rounded-md transition-all ${
                  chartType === 'radial' 
                    ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-md' 
                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                }`}
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  Bars
                </span>
              </motion.button>
            </div>
            
            <div className="flex flex-wrap gap-2 xs:gap-3 sm:gap-4 justify-start xs:justify-end w-full xs:w-auto">
              <motion.div 
                whileHover={{ y: -2, scale: 1.03 }}
                onClick={() => {
                  if (highestMetric) {
                    handleMetricFocus(highestMetric.name);
                    if (!userInteracted) {
                      setUserInteracted(true);
                      localStorage.setItem('chartUserInteracted', 'true');
                    }
                  }
                }}
                className={`px-3 py-2 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg shadow-sm border border-green-100 ${highestMetric ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              >
                <p className="text-xs text-green-600 font-medium flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Strongest
                </p>
                <p className="text-sm font-bold text-green-800">{highestMetric?.name || 'Not Available'}</p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -2, scale: 1.03 }}
                onClick={() => {
                  if (lowestMetric) {
                    handleMetricFocus(lowestMetric.name);
                    if (!userInteracted) {
                      setUserInteracted(true);
                      localStorage.setItem('chartUserInteracted', 'true');
                    }
                  }
                }}
                className={`px-3 py-2 bg-gradient-to-br from-amber-50 to-orange-100 rounded-lg shadow-sm border border-amber-100 ${lowestMetric ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              >
                <p className="text-xs text-amber-600 font-medium flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Focus Area
                </p>
                <p className="text-sm font-bold text-amber-800">{lowestMetric?.name || 'Not Available'}</p>
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
            `}
          </style>
          
          <div className="relative h-[300px] xs:h-[320px] sm:h-[350px] md:h-[400px] lg:h-[450px] w-full overflow-visible"
            onClick={() => {
              if (!userInteracted) {
                setUserInteracted(true);
                localStorage.setItem('chartUserInteracted', 'true');
              }
            }}>
            <AnimatePresence mode="wait">
              <motion.div 
                key={chartType}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full"
              >
                {metricsData && metricsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'radar' ? (
                      <RadarChart 
                        outerRadius="70%" 
                        data={metricsData}
                        margin={{ top: 30, right: 30, bottom: 30, left: 30 }}
                      >
                        <defs>
                          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                          <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7E57C2" stopOpacity="0.9"/>
                            <stop offset="100%" stopColor="#7E57C2" stopOpacity="0.2"/>
                          </linearGradient>
                        </defs>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis 
                          dataKey={isSmallScreen ? "shortName" : "name"}
                          tick={{ 
                            fill: '#4B5563', 
                            fontSize: isSmallScreen ? 10 : 11,
                            dy: 3, // Move labels slightly outward
                            className: 'radar-axis-label' // For custom styling
                          }}
                          tickSize={4}
                          cx="50%" 
                          cy="50%"
                        />
                        <PolarRadiusAxis 
                          angle={30} 
                          domain={[0, 100]} 
                          tick={{ fill: '#4B5563' }}
                          tickCount={5}
                        />
                        <Radar
                          name=""
                          dataKey="value"
                          stroke="#7E57C2"
                          fill="url(#radarFill)"
                          fillOpacity={0.8}
                          animationDuration={1500}
                          animationEasing="ease-out"
                          isAnimationActive={true}
                          style={{ filter: "url(#glow)" }}
                          dot={{ stroke: "#7E57C2", strokeWidth: 2, fill: "white", r: 3 }}
                          activeDot={{ 
                            stroke: "#7E57C2", 
                            strokeWidth: 3, 
                            fill: "white", 
                            r: 6,
                            className: "animate-pulse"
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {/* We're skipping the Legend component for the radar chart since 
                           it already has axis labels and doesn't need a separate legend */}
                      </RadarChart>
                    ) : chartType === 'pie' ? (
                      <PieChart>
                        <defs>
                          {/* Regular gradients for inactive slices */}
                          {COLORS.map((color, index) => (
                            <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                              <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                            </linearGradient>
                          ))}
                          
                          {/* Enhanced gradients for active slices */}
                          {COLORS.map((color, index) => (
                            <linearGradient key={`active-gradient-${index}`} id={`activeGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={color} stopOpacity={1} />
                              <stop offset="50%" stopColor={color} stopOpacity={0.85} />
                              <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                              <animate attributeName="x1" values="0;0.1;0" dur="2s" repeatCount="indefinite" />
                              <animate attributeName="y1" values="0;0.1;0" dur="2s" repeatCount="indefinite" />
                            </linearGradient>
                          ))}
                          
                          {/* Add gleaming effect filter */}
                          <filter id="pieGleam">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feSpecularLighting result="specOut" specularExponent="20" lightingColor="white">
                              <fePointLight x="100" y="100" z="200" />
                            </feSpecularLighting>
                            <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
                          </filter>
                        </defs>
                        <Pie
                          activeIndex={activeIndex}
                          activeShape={renderCustomizedLabel}
                          data={metricsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          fill="#8884d8"
                          dataKey="value"
                          onMouseEnter={onPieEnter}
                          animationDuration={1500}
                          animationEasing="ease-out"
                          isAnimationActive={true}
                        >
                          {metricsData.map((entry, index) => {
                            const isActive = activeIndex === index;
                            const currentColor = COLORS[index % COLORS.length];
                            
                            // Use a SUPER obvious hover effect with extreme visual changes
                            return (
                              <Cell 
                                key={`cell-${index}`}
                                id={`pie-cell-${index}`}
                                fill={isActive ? "white" : `url(#colorGradient-${index})`} 
                                stroke={isActive ? "#FFFFFF" : currentColor}
                                strokeWidth={isActive ? 6 : 1}
                                style={{
                                  filter: isActive ? `drop-shadow(0 0 20px ${currentColor}) brightness(1.5)` : 'none',
                                  transition: 'none', // Remove transition to make changes immediate
                                  transformOrigin: 'center center',
                                  position: 'relative',
                                  cursor: 'pointer',
                                  outline: isActive ? `3px solid ${currentColor}` : 'none',
                                  outlineOffset: '2px'
                                }}
                              />
                            );
                          })}
                          
                          {/* Simple, high-contrast highlight for active pie section */}
                          {activePieSection !== null && (
                            <g className="pie-active-section">
                              {/* Multiple animated rings for extreme visibility */}
                              <circle
                                cx="50%"
                                cy="50%"
                                r={88}
                                fill="none"
                                stroke={COLORS[activePieSection % COLORS.length]}
                                strokeWidth={5}
                                style={{
                                  animation: 'simplePulse 0.6s ease-in-out infinite alternate',
                                  filter: `drop-shadow(0 0 8px ${COLORS[activePieSection % COLORS.length]})`,
                                }}
                              />
                              
                              {/* Second pulse ring with offset timing */}
                              <circle
                                cx="50%"
                                cy="50%"
                                r={98}
                                fill="none"
                                stroke="white"
                                strokeWidth={3}
                                strokeDasharray="10 5"
                                style={{
                                  animation: 'simplePulse 0.8s ease-in-out infinite alternate-reverse',
                                  opacity: 0.8,
                                }}
                              />
                              
                              {/* Third outer blast ring */}
                              <circle
                                cx="50%"
                                cy="50%"
                                r={110}
                                fill="none"
                                stroke={COLORS[activePieSection % COLORS.length]}
                                strokeWidth={2}
                                strokeDasharray="3 6"
                                style={{
                                  animation: 'spin 5s linear infinite',
                                  opacity: 0.5,
                                }}
                              />
                              
                              {/* Multiple large white selector arrows for extreme visibility */}
                              <g>
                                {/* Primary arrow - thick white with color shadow */}
                                <path
                                  d={`M50,50 L${50 + 120 * Math.cos(((activePieSection / metricsData.length) * 360 - 90 + 
                                    (metricsData[activePieSection].value / metricsData.reduce((sum, entry) => sum + entry.value, 0)) * 180) * Math.PI / 180)},
                                    ${50 + 120 * Math.sin(((activePieSection / metricsData.length) * 360 - 90 + 
                                    (metricsData[activePieSection].value / metricsData.reduce((sum, entry) => sum + entry.value, 0)) * 180) * Math.PI / 180)}`}
                                  stroke="white"
                                  strokeWidth={7}
                                  fill="none"
                                  strokeLinecap="round"
                                  style={{
                                    animation: 'arrowMove 0.5s ease-in-out infinite alternate',
                                    filter: `drop-shadow(0 0 10px ${COLORS[activePieSection % COLORS.length]})`,
                                  }}
                                />
                                
                                {/* Secondary colored arrow - follows primary */}
                                <path
                                  d={`M50,50 L${50 + 115 * Math.cos(((activePieSection / metricsData.length) * 360 - 90 + 
                                    (metricsData[activePieSection].value / metricsData.reduce((sum, entry) => sum + entry.value, 0)) * 180) * Math.PI / 180)},
                                    ${50 + 115 * Math.sin(((activePieSection / metricsData.length) * 360 - 90 + 
                                    (metricsData[activePieSection].value / metricsData.reduce((sum, entry) => sum + entry.value, 0)) * 180) * Math.PI / 180)}`}
                                  stroke={COLORS[activePieSection % COLORS.length]}
                                  strokeWidth={3}
                                  fill="none"
                                  strokeLinecap="round"
                                  style={{
                                    animation: 'arrowMove 0.5s ease-in-out infinite alternate-reverse',
                                    filter: 'brightness(1.5)',
                                  }}
                                />
                              </g>
                              
                              {/* Add a big pulsing dot at the end of the path */}
                              <circle
                                cx={50 + 120 * Math.cos(((activePieSection / metricsData.length) * 360 - 90 + 
                                  (metricsData[activePieSection].value / metricsData.reduce((sum, entry) => sum + entry.value, 0)) * 180) * Math.PI / 180)}
                                cy={50 + 120 * Math.sin(((activePieSection / metricsData.length) * 360 - 90 + 
                                  (metricsData[activePieSection].value / metricsData.reduce((sum, entry) => sum + entry.value, 0)) * 180) * Math.PI / 180)}
                                r={8}
                                fill="white"
                                stroke={COLORS[activePieSection % COLORS.length]}
                                strokeWidth={2}
                                style={{
                                  animation: 'dotPulse 0.7s ease-in-out infinite alternate',
                                  filter: `drop-shadow(0 0 8px ${COLORS[activePieSection % COLORS.length]})`,
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
                                `}
                              </style>
                            </g>
                          )}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          layout="horizontal" 
                          verticalAlign="bottom" 
                          align="center"
                          iconType="circle"
                          onClick={(data) => {
                            // Allow clicking on legend items to focus on that section
                            const index = metricsData.findIndex(item => item.name === data.value);
                            if (index !== -1) {
                              setActivePieSection(index);
                              setActiveIndex(index);
                              if (!userInteracted) {
                                setUserInteracted(true);
                                localStorage.setItem('chartUserInteracted', 'true');
                              }
                              playSound();
                            }
                          }}
                          wrapperStyle={{ 
                            paddingTop: '10px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            marginBottom: '15px'
                          }}
                          formatter={(value, entry, index) => (
                            <div className="flex flex-col items-center px-2 py-1 mx-1 rounded-md hover:bg-gray-100" style={{
                              borderBottom: activeIndex === index ? `2px solid ${COLORS[index % COLORS.length]}` : 'none',
                              background: activeIndex === index ? `${COLORS[index % COLORS.length]}10` : 'transparent'
                            }}>
                              <span style={{ 
                                color: activeIndex === index ? COLORS[index % COLORS.length] : '#666',
                                fontWeight: activeIndex === index ? 600 : 500,
                                fontSize: '13px'
                              }}>
                                {value}
                              </span>
                            </div>
                          )}
                        />
                      </PieChart>
                    ) : (
                      <RadialBarChart 
                        innerRadius="20%" 
                        outerRadius="80%" 
                        data={metricsData} 
                        startAngle={180} 
                        endAngle={0}
                        cx="50%"
                        cy="70%"
                        barSize={14}
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
                              <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                              <stop offset="95%" stopColor={color} stopOpacity={0.6} />
                            </linearGradient>
                          ))}
                        </defs>
                        <RadialBar
                          label={{
                            fill: '#666',
                            position: 'insideStart',
                            fontSize: 12,
                            fontWeight: 500
                          }}
                          background={{ fill: '#f3f4f6' }}
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
                              strokeWidth={entry.name === focusedMetric ? 2 : 0}
                              style={{
                                filter: entry.name === focusedMetric ? "drop-shadow(0 4px 3px rgba(0, 0, 0, 0.15))" : "none"
                              }}
                            />
                          ))}
                        </RadialBar>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          iconSize={10} 
                          layout="horizontal" 
                          verticalAlign="top" 
                          align="center"
                          onClick={() => {
                            if (!userInteracted) {
                              setUserInteracted(true);
                              localStorage.setItem('chartUserInteracted', 'true');
                            }
                          }}
                          wrapperStyle={{ 
                            paddingBottom: '15px',
                            paddingTop: '10px',
                            fontSize: '13px',
                            fontWeight: 500
                          }}
                          formatter={(value, entry, index) => (
                            <div className="flex flex-col items-center px-2 py-1 mx-1 rounded-md hover:bg-gray-100" style={{
                              borderBottom: focusedMetric === value ? `2px solid ${COLORS[index % COLORS.length]}` : 'none',
                              background: focusedMetric === value ? `${COLORS[index % COLORS.length]}10` : 'transparent'
                            }}
                            onClick={() => {
                              handleMetricFocus(value);
                              if (!userInteracted) {
                                setUserInteracted(true);
                                localStorage.setItem('chartUserInteracted', 'true');
                              }
                            }}
                            >
                              <span style={{ 
                                color: focusedMetric === value ? COLORS[index % COLORS.length] : '#666',
                                fontWeight: focusedMetric === value ? 600 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}>
                                {value}
                              </span>
                            </div>
                          )}
                        />
                      </RadialBarChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-purple-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="mt-3 text-gray-500 text-sm">No chart data available</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Chart type and focus indicator - NOW WITH LABELS */}
          <div className="flex justify-center mt-4">
            <div className="flex space-x-6 items-center bg-white px-4 py-2 rounded-lg shadow-sm">
              {[
                { type: 'radar', label: 'Radar' },
                { type: 'pie', label: 'Pie' },
                { type: 'radial', label: 'Bars' }
              ].map(({ type, label }) => (
                <div 
                  key={type}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => {
                    setChartType(type);
                    setUserInteracted(true);
                    localStorage.setItem('chartUserInteracted', 'true');
                    playSound();
                  }}
                >
                  <motion.div 
                    animate={{
                      scale: chartType === type ? 1.2 : 1,
                      opacity: chartType === type ? 1 : 0.5
                    }}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className={`w-3 h-3 rounded-full ${
                      chartType === type 
                        ? type === 'radar' 
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600' 
                          : type === 'pie' 
                            ? 'bg-gradient-to-r from-teal-600 to-emerald-600' 
                            : 'bg-gradient-to-r from-rose-500 to-red-500'
                        : 'bg-gray-300'
                    }`}
                  />
                  <span className={`text-xs font-medium ${
                    chartType === type 
                      ? type === 'radar' 
                        ? 'text-purple-600' 
                        : type === 'pie' 
                          ? 'text-teal-600' 
                          : 'text-rose-500'
                      : 'text-gray-400'
                  }`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Additional insights for expanded view */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                id="communication-insights"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-6 mb-4 p-4 bg-white rounded-lg shadow-sm border border-purple-100 overflow-visible"
              >
              <h3 className="text-sm font-medium text-purple-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Communication Insights & Recommendations
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 h-full">
                  <p className="font-medium text-purple-800 mb-1">What the metrics mean:</p>
                  <p className="text-gray-600 leading-relaxed">
                    These metrics reflect key aspects of effective communication in your relationship. 
                    Improvements across all areas indicate growing emotional intelligence and connection.
                  </p>
                </div>
                
                <div className="p-3 bg-teal-50 rounded-lg border border-teal-100 h-full">
                  <p className="font-medium text-teal-800 mb-1">How to improve your focus area:</p>
                  <p className="text-gray-600 leading-relaxed">
                    Practice {getFormattedLowestMetricName()} regularly by setting aside dedicated time 
                    for communication exercises. Small, consistent efforts yield significant improvements.
                  </p>
                </div>
                
                {focusedMetric && (
                  <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 sm:col-span-2">
                    <p className="font-medium text-rose-800 mb-1">About {focusedMetric}:</p>
                    <p className="text-gray-600 leading-relaxed">
                      {getDescriptionForMetric(focusedMetric)}
                    </p>
                    <div className="mt-2 pt-2 border-t border-rose-200 flex items-center">
                      <span className="text-rose-700 font-medium mr-2">Try this:</span>
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
                      {therapyType === 'couple' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                      ) : therapyType === 'family' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    {therapyType === 'couple' ? 'Relationship' : therapyType === 'family' ? 'Family' : 'Personal'} Assessment
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </motion.button>
                </div>
                <div className="p-6">
                  <div className="mb-6 text-sm text-gray-600 bg-purple-50 p-3 rounded-lg border border-purple-100">
                    <p className="flex items-center font-medium text-purple-800 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Why this matters
                    </p>
                    <p>
                      Your assessment results will be used to personalize your therapy experience 
                      and track your progress over time. This helps our AI provide more relevant insights.
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
    )
  }
  
  return content;
}