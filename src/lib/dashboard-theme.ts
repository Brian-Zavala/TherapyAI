/**
 * Unified Dashboard Theme Configuration
 * Ensures visual cohesion across all dashboard components
 * 
 * Design Philosophy:
 * - Colors flow from cool (blue) to warm (orange) representing progress
 * - Each metric has a unique identity while maintaining harmony
 * - Consistent opacity levels create depth without distraction
 * - Loading states reflect the nature of what's being loaded
 */

import { type ClassValue } from 'clsx';

// Type-safe color values using Tailwind classes
type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

// Metric types for type safety
export type MetricType = 'communication' | 'empathy' | 'progress' | 'support' | 'clarity' | 'respect';

// The cohesive color system - each color tells a story
const colorPalette = {
  // Cool tones for analytical metrics
  blue: {
    50: 'rgb(239 246 255)',
    100: 'rgb(219 234 254)',
    200: 'rgb(191 219 254)',
    300: 'rgb(147 197 253)',
    400: 'rgb(96 165 250)',
    500: 'rgb(59 130 246)',
    600: 'rgb(37 99 235)',
    700: 'rgb(29 78 216)',
    800: 'rgb(30 64 175)',
    900: 'rgb(30 58 138)',
  },
  // Emotional connection metrics
  purple: {
    50: 'rgb(250 245 255)',
    100: 'rgb(243 232 255)',
    200: 'rgb(233 213 255)',
    300: 'rgb(216 180 254)',
    400: 'rgb(192 132 252)',
    500: 'rgb(168 85 247)',
    600: 'rgb(147 51 234)',
    700: 'rgb(126 34 206)',
    800: 'rgb(107 33 168)',
    900: 'rgb(88 28 135)',
  },
  // Growth and positive trends
  green: {
    50: 'rgb(240 253 244)',
    100: 'rgb(220 252 231)',
    200: 'rgb(187 247 208)',
    300: 'rgb(134 239 172)',
    400: 'rgb(74 222 128)',
    500: 'rgb(34 197 94)',
    600: 'rgb(22 163 74)',
    700: 'rgb(21 128 61)',
    800: 'rgb(22 101 52)',
    900: 'rgb(20 83 45)',
  },
  // Warmth and support metrics
  pink: {
    50: 'rgb(253 242 248)',
    100: 'rgb(252 231 243)',
    200: 'rgb(251 207 232)',
    300: 'rgb(249 168 212)',
    400: 'rgb(244 114 182)',
    500: 'rgb(236 72 153)',
    600: 'rgb(219 39 119)',
    700: 'rgb(190 24 93)',
    800: 'rgb(157 23 77)',
    900: 'rgb(131 24 67)',
  },
};

export const dashboardTheme = {
  // Metric-specific color assignments with semantic meaning
  metrics: {
    communication: {
      primary: colorPalette.blue[500],
      secondary: colorPalette.blue[100],
      accent: colorPalette.blue[600],
      background: `${colorPalette.blue[50]}`,
      text: 'text-blue-600',
      gradient: `from-blue-400 to-blue-600`,
      shadow: 'shadow-blue-200/50',
      glow: 'shadow-lg shadow-blue-500/20',
    },
    empathy: {
      primary: colorPalette.pink[500],
      secondary: colorPalette.pink[100],
      accent: colorPalette.pink[600],
      background: `${colorPalette.pink[50]}`,
      text: 'text-pink-600',
      gradient: `from-pink-400 to-pink-600`,
      shadow: 'shadow-pink-200/50',
      glow: 'shadow-lg shadow-pink-500/20',
    },
    progress: {
      primary: colorPalette.green[500],
      secondary: colorPalette.green[100],
      accent: colorPalette.green[600],
      background: `${colorPalette.green[50]}`,
      text: 'text-green-600',
      gradient: `from-green-400 to-green-600`,
      shadow: 'shadow-green-200/50',
      glow: 'shadow-lg shadow-green-500/20',
    },
    support: {
      primary: colorPalette.purple[500],
      secondary: colorPalette.purple[100],
      accent: colorPalette.purple[600],
      background: `${colorPalette.purple[50]}`,
      text: 'text-purple-600',
      gradient: `from-purple-400 to-purple-600`,
      shadow: 'shadow-purple-200/50',
      glow: 'shadow-lg shadow-purple-500/20',
    },
    clarity: {
      primary: 'rgb(6 182 212)', // cyan-500
      secondary: 'rgb(207 250 254)', // cyan-100
      accent: 'rgb(8 145 178)', // cyan-600
      background: 'rgb(236 254 255)', // cyan-50
      text: 'text-cyan-600',
      gradient: 'from-cyan-400 to-cyan-600',
      shadow: 'shadow-cyan-200/50',
      glow: 'shadow-lg shadow-cyan-500/20',
    },
    respect: {
      primary: 'rgb(251 146 60)', // orange-400
      secondary: 'rgb(254 215 170)', // orange-200
      accent: 'rgb(234 88 12)', // orange-600
      background: 'rgb(255 247 237)', // orange-50
      text: 'text-orange-600',
      gradient: 'from-orange-400 to-orange-600',
      shadow: 'shadow-orange-200/50',
      glow: 'shadow-lg shadow-orange-500/20',
    },
  },

  // Spacing system for consistent rhythm
  spacing: {
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },

  // Border radius for cohesive rounded corners
  radius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px',
  },

  // Typography scale for visual hierarchy
  typography: {
    // Headings
    h1: 'text-2xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    h3: 'text-lg font-medium',
    h4: 'text-base font-medium',
    
    // Body text
    body: 'text-base font-normal',
    bodySmall: 'text-sm font-normal',
    
    // Supporting text
    caption: 'text-xs font-normal text-muted-foreground',
    label: 'text-sm font-medium',
    
    // Numbers and metrics
    metric: 'text-3xl font-bold tracking-tight',
    metricSmall: 'text-xl font-semibold',
  },

  // Animation configurations for smooth transitions
  animation: {
    // Duration in milliseconds
    duration: {
      instant: 150,
      fast: 200,
      normal: 300,
      slow: 500,
      verySlow: 700,
    },
    // Easing functions
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  },

  // Shadow system for depth and hierarchy
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    inner: 'shadow-inner',
    glow: (color: string) => `shadow-lg shadow-${color}-500/20`,
  },

  // Glass morphism styles for modern feel
  glass: {
    light: 'bg-white/80 backdrop-blur-md border border-white/20',
    dark: 'bg-gray-900/80 backdrop-blur-md border border-gray-700/50',
    colored: (color: string) => `bg-${color}-500/10 backdrop-blur-md border border-${color}-500/20`,
  },

  // Loading states with contextual animations
  loadingStates: {
    communication: {
      icon: 'MessageSquare',
      message: 'Analyzing communication patterns...',
      description: 'Understanding how you connect',
      animation: 'pulse',
    },
    progress: {
      icon: 'TrendingUp',
      message: 'Calculating your progress...',
      description: 'Tracking your growth journey',
      animation: 'bounce',
    },
    insights: {
      icon: 'Brain',
      message: 'Generating personalized insights...',
      description: 'AI analyzing your therapy data',
      animation: 'spin',
    },
    sessions: {
      icon: 'Calendar',
      message: 'Loading session history...',
      description: 'Organizing your timeline',
      animation: 'fade',
    },
  },

  // Helper functions for dynamic styling
  getMetricColor: (metric: MetricType, property: 'primary' | 'secondary' | 'accent' | 'background') => {
    return dashboardTheme.metrics[metric]?.[property] || dashboardTheme.metrics.communication[property];
  },

  getProgressColor: (value: number) => {
    if (value >= 80) return colorPalette.green[500];
    if (value >= 60) return colorPalette.blue[500];
    if (value >= 40) return 'rgb(251 191 36)'; // amber-400
    return 'rgb(239 68 68)'; // red-500
  },

  getTrendIcon: (trend: 'up' | 'down' | 'stable') => {
    const icons = {
      up: { icon: 'TrendingUp', color: colorPalette.green[600] },
      down: { icon: 'TrendingDown', color: 'rgb(220 38 38)' }, // red-600
      stable: { icon: 'Minus', color: 'rgb(107 114 128)' }, // gray-500
    };
    return icons[trend];
  },

  // Responsive utilities
  responsive: {
    padding: {
      mobile: 'p-4',
      tablet: 'sm:p-5',
      desktop: 'lg:p-6',
    },
    gap: {
      mobile: 'gap-4',
      tablet: 'sm:gap-5',
      desktop: 'lg:gap-6',
    },
  },
} as const;

// Type-safe theme getter
export function getMetricTheme(metric: MetricType) {
  return dashboardTheme.metrics[metric];
}

// Class name builder for consistent styling
export function getMetricClasses(metric: MetricType, variant: 'card' | 'badge' | 'progress' = 'card') {
  const theme = getMetricTheme(metric);
  
  const classes = {
    card: `border-l-4 transition-all duration-300 hover:${theme.glow}`,
    badge: `text-xs font-medium px-2.5 py-0.5 rounded-full`,
    progress: `transition-all duration-500 ease-out`,
  };
  
  return classes[variant];
}

// Progress bar color with smooth transitions
export function getProgressBarClasses(value: number): string {
  const color = dashboardTheme.getProgressColor(value);
  return `transition-all duration-500 ease-out bg-gradient-to-r ${
    value >= 80 ? 'from-green-400 to-green-600' :
    value >= 60 ? 'from-blue-400 to-blue-600' :
    value >= 40 ? 'from-amber-400 to-amber-600' :
    'from-red-400 to-red-600'
  }`;
}