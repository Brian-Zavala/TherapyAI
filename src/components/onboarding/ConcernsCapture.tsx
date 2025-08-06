/**
 * Enhanced Concerns Capture Component for Onboarding Flow
 * Integrates with comprehensive concerns synchronization system
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { THERAPY_CONCERNS, getConcernsByCategory, getCommonConcerns } from '@/data/therapy-concerns';
import type { TherapyConcern } from '@/data/therapy-concerns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle, Star, TrendingUp, Clock } from 'lucide-react';

interface ConcernsCaptureProps {
  onConcernsSelected: (concerns: SelectedConcern[]) => void;
  initialConcerns?: string[];
  showPrioritization?: boolean;
  maxSelections?: number;
  className?: string;
}

interface SelectedConcern {
  id: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export default function ConcernsCapture({
  onConcernsSelected,
  initialConcerns = [],
  showPrioritization = true,
  maxSelections = 8,
  className = ''
}: ConcernsCaptureProps) {
  const [selectedConcerns, setSelectedConcerns] = useState<SelectedConcern[]>([]);
  const [currentStep, setCurrentStep] = useState<'selection' | 'prioritization'>('selection');
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Initialize with existing concerns
  useEffect(() => {
    if (initialConcerns.length > 0) {
      const initial = initialConcerns.map(id => ({
        id,
        priority: 'medium' as const,
        notes: ''
      }));
      setSelectedConcerns(initial);
    }
  }, [initialConcerns]);

  // Handle concern selection
  const toggleConcern = (concern: TherapyConcern) => {
    setSelectedConcerns(prev => {
      const existing = prev.find(c => c.id === concern.id);
      
      if (existing) {
        return prev.filter(c => c.id !== concern.id);
      } else if (prev.length >= maxSelections) {
        return prev; // Max selections reached
      } else {
        return [...prev, { id: concern.id, priority: 'medium' }];
      }
    });
  };

  // Handle priority change
  const updatePriority = (concernId: string, priority: 'high' | 'medium' | 'low') => {
    setSelectedConcerns(prev => 
      prev.map(c => c.id === concernId ? { ...c, priority } : c)
    );
  };

  // Proceed to prioritization or finish
  const handleNext = () => {
    if (currentStep === 'selection' && showPrioritization && selectedConcerns.length > 0) {
      setCurrentStep('prioritization');
    } else {
      onConcernsSelected(selectedConcerns);
    }
  };

  // Get organized concerns for display
  const commonConcerns = getCommonConcerns();
  const categorizedConcerns = {
    relational: getConcernsByCategory('relational'),
    emotional: getConcernsByCategory('emotional'),
    practical: getConcernsByCategory('practical'),
    future: getConcernsByCategory('future'),
    personal: getConcernsByCategory('personal')
  };

  const isSelected = (concernId: string) => selectedConcerns.some(c => c.id === concernId);
  const selectedCount = selectedConcerns.length;

  if (currentStep === 'prioritization') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={className}
      >
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Let's Prioritize Your Focus Areas
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Help us understand what's most important to address first
            </p>
          </div>

          <div className="space-y-4">
            {selectedConcerns.map((selected) => {
              const concern = THERAPY_CONCERNS.find(c => c.id === selected.id);
              if (!concern) return null;

              return (
                <Card key={concern.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{concern.label}</h3>
                        <p className="text-sm text-gray-600 mt-1">{concern.description}</p>
                      </div>
                      <div className="flex gap-2">
                        {(['high', 'medium', 'low'] as const).map((priority) => (
                          <Button
                            key={priority}
                            variant={selected.priority === priority ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updatePriority(concern.id, priority)}
                            className={`text-xs ${getPriorityStyles(priority, selected.priority === priority)}`}
                          >
                            {getPriorityIcon(priority)}
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('selection')}
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              onClick={handleNext}
              className="flex-1"
            >
              Complete Setup
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }  // Main selection interface
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
            What Would You Like to Work On?
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Select the areas where you'd like support. You can always adjust these later.
          </p>
          <div className="text-sm text-gray-500">
            {selectedCount} of {maxSelections} selected
          </div>
        </div>

        {/* Common Concerns Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Most Common Areas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {commonConcerns.map((concern) => (
              <ConcernCard
                key={concern.id}
                concern={concern}
                isSelected={isSelected(concern.id)}
                onToggle={() => toggleConcern(concern)}
                disabled={selectedCount >= maxSelections && !isSelected(concern.id)}
              />
            ))}
          </div>
        </div>

        {/* All Categories Toggle */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="text-sm"
          >
            {showAllCategories ? 'Show Less' : 'See All Options'}
          </Button>
        </div>

        {/* All Categories */}
        <AnimatePresence>
          {showAllCategories && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6"
            >
              {Object.entries(categorizedConcerns).map(([category, concerns]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {getCategoryLabel(category)}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {concerns.map((concern) => (
                      <ConcernCard
                        key={concern.id}
                        concern={concern}
                        isSelected={isSelected(concern.id)}
                        onToggle={() => toggleConcern(concern)}
                        disabled={selectedCount >= maxSelections && !isSelected(concern.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue Button */}
        <div className="pt-4">
          <Button 
            onClick={handleNext}
            disabled={selectedCount === 0}
            className="w-full"
          >
            {selectedCount === 0 
              ? 'Select at least one area to continue'
              : showPrioritization 
                ? 'Continue to Prioritization'
                : `Continue with ${selectedCount} selected`
            }
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Supporting component for individual concern cards
interface ConcernCardProps {
  concern: TherapyConcern;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function ConcernCard({ concern, isSelected, onToggle, disabled }: ConcernCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
          : 'hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : onToggle}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {isSelected ? (
            <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm">{concern.label}</h4>
            {concern.description && (
              <p className="text-xs text-gray-600 mt-1">{concern.description}</p>
            )}
            {concern.common && (
              <Badge variant="secondary" className="mt-2 text-xs">
                Common
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function getPriorityStyles(priority: string, isSelected: boolean) {
  const baseStyles = 'transition-all duration-200';
  
  if (!isSelected) return baseStyles;
  
  switch (priority) {
    case 'high':
      return `${baseStyles} bg-red-600 border-red-600 text-white hover:bg-red-700`;
    case 'medium':
      return `${baseStyles} bg-yellow-600 border-yellow-600 text-white hover:bg-yellow-700`;
    case 'low':
      return `${baseStyles} bg-green-600 border-green-600 text-white hover:bg-green-700`;
    default:
      return baseStyles;
  }
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'high':
      return <TrendingUp className="h-3 w-3 mr-1" />;
    case 'medium':
      return <Clock className="h-3 w-3 mr-1" />;
    case 'low':
      return <Circle className="h-3 w-3 mr-1" />;
    default:
      return null;
  }
}

function getCategoryLabel(category: string): string {
  const labels = {
    relational: 'Relationship & Communication',
    emotional: 'Emotional & Mental Health',
    practical: 'Life & Family Challenges',
    future: 'Future & Goals',
    personal: 'Personal Issues'
  };
  
  return labels[category as keyof typeof labels] || category;
}