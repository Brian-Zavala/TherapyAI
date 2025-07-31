// src/components/dashboard/TherapyTypeTabs.tsx
"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Heart, 
  User, 
  Users,
  MessageSquare,
  Brain
} from 'lucide-react';
import '@/styles/dashboard-scoped.css';

export type TherapyType = 'solo' | 'couple' | 'family';

export interface TherapyTypeConfig {
  id: TherapyType;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  badge?: string;
  disabled?: boolean;
  disabledReason?: string;
}

// Predefined therapy type configurations
export const THERAPY_TYPE_CONFIGS: Record<TherapyType, TherapyTypeConfig> = {
  solo: {
    id: 'solo',
    label: 'Individual',
    icon: User,
    description: 'Personal growth and self-reflection',
    badge: 'Self-Care'
  },
  couple: {
    id: 'couple',
    label: 'Couples',
    icon: Heart,
    description: 'Relationship building and communication',
    badge: 'Together'
  },
  family: {
    id: 'family',
    label: 'Family',
    icon: Users,
    description: 'Family dynamics and bonding',
    badge: 'Unity'
  }
};

export interface TherapyTypeTabsProps {
  // Available therapy types for this component
  availableTypes: TherapyType[];
  
  // Current active tab
  activeType: TherapyType;
  
  // Tab change handler
  onTypeChange: (type: TherapyType) => void;
  
  // Session counts per therapy type (for badges)
  sessionCounts?: Partial<Record<TherapyType, number>>;
  
  // Loading states per therapy type
  loading?: Partial<Record<TherapyType, boolean>>;
  
  // Error states per therapy type
  errors?: Partial<Record<TherapyType, string>>;
  
  // Custom styling
  className?: string;
  
  // Component variant
  variant?: 'default' | 'compact' | 'pills';
  
  // Show session counts
  showCounts?: boolean;
  
  // Show descriptions on hover
  showDescriptions?: boolean;
}

export default function TherapyTypeTabs({
  availableTypes,
  activeType,
  onTypeChange,
  sessionCounts = {},
  loading = {},
  errors = {},
  className = '',
  variant = 'default',
  showCounts = true,
  showDescriptions = true
}: TherapyTypeTabsProps) {
  
  // Filter configurations to only show available types
  const visibleConfigs = availableTypes.map(type => THERAPY_TYPE_CONFIGS[type]);
  
  // Handle tab change with validation
  const handleTabChange = (value: string) => {
    const type = value as TherapyType;
    if (availableTypes.includes(type)) {
      onTypeChange(type);
    }
  };

  const getTabVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'flex flex-col sm:grid sm:grid-cols-2 max-w-md bg-white/5 gap-2';
      case 'pills':
        return 'flex flex-wrap gap-2 bg-transparent';
      default:
        // Always horizontal flex for proper tab visibility
        return 'flex flex-row w-full max-w-full bg-white/10 gap-1 p-1.5 overflow-x-hidden';
    }
  };

  const getTriggerClasses = (config: TherapyTypeConfig, isActive: boolean) => {
    const baseClasses = variant === 'default' 
      ? "gap-1 cursor-pointer transition-all duration-200 min-h-[36px] flex items-center justify-center px-1.5 py-1 text-xs font-medium flex-1 min-w-0 rounded-md overflow-hidden"
      : "gap-1 cursor-pointer transition-all duration-200 min-h-[40px] flex items-center justify-center px-2 py-1.5 text-xs font-medium flex-1 min-w-0 rounded-lg sm:text-sm sm:px-3 sm:py-2";
    const isLoading = loading[config.id];
    const hasError = errors[config.id];
    
    if (variant === 'pills') {
      return `${baseClasses} rounded-full border ${
        isActive 
          ? 'bg-white/20 text-white border-white/30' 
          : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
      } ${isLoading ? 'animate-pulse' : ''} ${hasError ? 'border-red-400 text-red-400' : ''}`;
    }
    
    // Override default Radix styling with custom active state
    const activeStyles = isActive 
      ? 'text-white bg-white/20 shadow-sm' 
      : 'text-white/60 hover:text-white hover:bg-white/10';
    
    return `${baseClasses} ${activeStyles} ${
      isLoading ? 'animate-pulse' : ''
    } ${hasError ? 'text-red-400' : ''}`;
  };

  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {visibleConfigs.map((config) => {
          const Icon = config.icon;
          const isActive = activeType === config.id;
          const sessionCount = sessionCounts[config.id] || 0;
          const isLoading = loading[config.id];
          const hasError = errors[config.id];
          
          return (
            <motion.button
              key={config.id}
              onClick={() => handleTabChange(config.id)}
              className={getTriggerClasses(config, isActive)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title={showDescriptions ? config.description : undefined}
            >
              <Icon className="h-4 w-4" />
              <span>{config.label}</span>
              
              {showCounts && sessionCount > 0 && variant !== 'default' && (
                <Badge variant="secondary" className="ml-1 text-xs hidden sm:inline-flex">
                  {sessionCount}
                </Badge>
              )}
              
              {isLoading && (
                <div className="ml-1 w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              )}
              
              {hasError && (
                <div className="ml-1 w-3 h-3 bg-red-400 rounded-full" title={hasError} />
              )}
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <Tabs 
      value={activeType} 
      onValueChange={handleTabChange} 
      className={className}
    >
      <TabsList className={`border border-white/20 backdrop-blur-sm ${getTabVariantClasses()}`}>
        {visibleConfigs.map((config) => {
          const Icon = config.icon;
          const sessionCount = sessionCounts[config.id] || 0;
          const isLoading = loading[config.id];
          const hasError = errors[config.id];
          
          return (
            <TabsTrigger
              key={config.id}
              value={config.id}
              className={`${getTriggerClasses(config, activeType === config.id)} !bg-transparent data-[state=active]:!bg-transparent`}
              style={{
                backgroundColor: activeType === config.id ? 'rgba(255, 255, 255, 0.2)' : undefined
              }}
              title={showDescriptions ? config.description : undefined}
            >
              <Icon className="h-4 w-4" />
              <span className={variant === 'compact' ? 'text-xs sm:text-sm' : 'text-xs sm:text-sm truncate'}>{config.label}</span>
              
              {config.badge && variant !== 'default' && (
                <Badge variant="outline" className="ml-1 text-xs border-white/30 text-white/70 hidden sm:inline-flex">
                  {config.badge}
                </Badge>
              )}
              
              {showCounts && sessionCount > 0 && variant !== 'default' && (
                <Badge variant="secondary" className="ml-1 text-xs hidden sm:inline-flex">
                  {sessionCount}
                </Badge>
              )}
              
              {isLoading && (
                <div className="ml-1 w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              )}
              
              {hasError && (
                <div className="ml-1 w-3 h-3 bg-red-400 rounded-full" title={hasError} />
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

// Utility function to get default therapy types for different components
export const getDefaultTherapyTypes = (component: 'insights' | 'communication' | 'progress'): TherapyType[] => {
  switch (component) {
    case 'insights':
      return ['solo', 'couple', 'family']; // All types for AI insights
    case 'communication':
      return ['solo', 'couple', 'family']; // All types for communication metrics
    case 'progress':
      return ['couple', 'family']; // Only relationship types for progress
    default:
      return ['couple']; // Default fallback
  }
};

// Hook for managing therapy type tab state
export function useTherapyTypeTabs(
  component: 'insights' | 'communication' | 'progress',
  initialType?: TherapyType
) {
  const availableTypes = getDefaultTherapyTypes(component);
  const [activeType, setActiveType] = React.useState<TherapyType>(
    initialType && availableTypes.includes(initialType) 
      ? initialType 
      : availableTypes[0]
  );

  const handleTypeChange = React.useCallback((type: TherapyType) => {
    if (availableTypes.includes(type)) {
      setActiveType(type);
    }
  }, [availableTypes]);

  return {
    availableTypes,
    activeType,
    setActiveType: handleTypeChange
  };
}