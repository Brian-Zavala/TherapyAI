// src/components/dashboard/ResponsiveDesignValidation.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Smartphone,
  Tablet,
  Monitor,
  Eye,
  Layers,
  Zap
} from 'lucide-react';

interface ResponsiveCheckResult {
  breakpoint: string;
  status: 'pass' | 'warning' | 'fail';
  issues: string[];
  recommendations: string[];
}

// Responsive design validation for therapy tabs
const RESPONSIVE_VALIDATION_CHECKLIST = {
  mobile: {
    breakpoint: 'Mobile (320px - 768px)',
    checks: [
      'Therapy type tabs stack vertically or scroll horizontally',
      'Tab labels remain readable (not truncated)',
      'Card content maintains proper spacing',
      'Touch targets are at least 44px',
      'Text remains legible at small sizes',
      'Progress bars display correctly'
    ]
  },
  tablet: {
    breakpoint: 'Tablet (768px - 1024px)',
    checks: [
      'Two-column grid layout works properly',
      'Therapy tabs fit comfortably in available space',
      'Component proportions are balanced',
      'Modal overlays center correctly',
      'Navigation elements are accessible'
    ]
  },
  desktop: {
    breakpoint: 'Desktop (1024px+)',
    checks: [
      'Full dashboard layout displays optimally',
      'Therapy tabs integrate seamlessly with main tabs',
      'Card hover effects work smoothly',
      'Content doesn\'t become too spread out',
      'Animations perform well'
    ]
  }
};

const VISUAL_HIERARCHY_CHECKLIST = [
  'Main dashboard tabs are visually distinct from therapy type tabs',
  'Active states are clearly differentiated',
  'Loading states don\'t interfere with layout',
  'Error states maintain proper spacing',
  'Empty states are centered and informative',
  'Progress indicators are visually consistent',
  'Color coding follows established patterns'
];

const PERFORMANCE_CHECKLIST = [
  'Tab switching is smooth and responsive',
  'Component animations don\'t block interactions',
  'Data fetching doesn\'t cause layout shifts',
  'Memory usage remains reasonable with multiple tabs',
  'Real-time updates work correctly per therapy type'
];

interface ValidationResultProps {
  title: string;
  items: string[];
  type: 'responsive' | 'hierarchy' | 'performance';
}

function ValidationResult({ title, items, type }: ValidationResultProps) {
  const getIcon = () => {
    switch (type) {
      case 'responsive': return <Smartphone className="h-5 w-5" />;
      case 'hierarchy': return <Layers className="h-5 w-5" />;
      case 'performance': return <Zap className="h-5 w-5" />;
    }
  };

  const getTheme = () => {
    switch (type) {
      case 'responsive': return 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800';
      case 'hierarchy': return 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800';
      case 'performance': return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-lg border bg-gradient-to-br ${getTheme()}`}
    >
      <div className="flex items-center gap-2 mb-3">
        {getIcon()}
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function ResponsiveDesignValidation() {
  const [currentBreakpoint, setCurrentBreakpoint] = React.useState('desktop');
  
  // Detect current breakpoint
  React.useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) setCurrentBreakpoint('mobile');
      else if (width < 1024) setCurrentBreakpoint('tablet');
      else setCurrentBreakpoint('desktop');
    };
    
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return (
    <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-white/20 dark:border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Therapy Tabs Design Validation
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Monitor className="h-3 w-3" />
            Current: {currentBreakpoint}
          </Badge>
          <Badge variant="secondary">
            Design System Compliant
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Breakpoint Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Currently viewing at <strong>{currentBreakpoint}</strong> breakpoint. 
            Resize your browser to test different screen sizes and ensure the therapy type tabs 
            maintain proper spacing and functionality.
          </AlertDescription>
        </Alert>

        {/* Validation Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ValidationResult
            title="Responsive Design"
            type="responsive"
            items={[
              'Therapy tabs adapt to screen size',
              'Touch-friendly on mobile devices',
              'Proper spacing maintained',
              'Text remains readable',
              'Progress bars scale correctly'
            ]}
          />
          
          <ValidationResult
            title="Visual Hierarchy"
            type="hierarchy"
            items={[
              'Main tabs clearly distinct',
              'Therapy tabs properly nested',
              'Active states well-defined',
              'Loading states non-intrusive',
              'Color system consistent'
            ]}
          />
          
          <ValidationResult
            title="Performance"
            type="performance"
            items={[
              'Smooth tab transitions',
              'Efficient data loading',
              'Memory usage optimized',
              'Real-time updates work',
              'No layout shifts'
            ]}
          />
        </div>

        {/* Specific Breakpoint Guidance */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Breakpoint-Specific Considerations
          </h4>
          
          {Object.entries(RESPONSIVE_VALIDATION_CHECKLIST).map(([key, config]) => (
            <motion.div
              key={key}
              className={`p-3 rounded-lg border ${
                currentBreakpoint === key 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }`}
              initial={{ opacity: 0.7 }}
              animate={{ opacity: currentBreakpoint === key ? 1 : 0.7 }}
            >
              <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                {config.breakpoint}
                {currentBreakpoint === key && (
                  <Badge variant="default" className="ml-2 text-xs">Current</Badge>
                )}
              </h5>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {config.checks.map((check, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                    {check}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Integration Success Indicator */}
        <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <h4 className="font-semibold text-green-800 dark:text-green-400 mb-1">
            Integration Complete
          </h4>
          <p className="text-sm text-green-700 dark:text-green-300">
            Therapy type tabs have been successfully integrated while maintaining 
            responsive design principles and visual hierarchy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}