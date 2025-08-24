'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { HeartHandshake, Brain, Home, Target, User } from 'lucide-react';
import ConcernsSelector from '@/components/forms/selectors/ConcernsSelector';
import GlassCard from '@/components/ui/glass-card';
import ButtonWithSound from '@/components/ui/buttons/ButtonWithSound';
import { CONCERN_CATEGORIES } from '@/data/therapy-concerns';

interface ConcernsOnboardingStepProps {
  onNext: () => void;
  onBack?: () => void;
}

export default function ConcernsOnboardingStep({ onNext, onBack }: ConcernsOnboardingStepProps) {
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Icons for each category
  const categoryIcons = {
    emotional: Brain,
    relational: HeartHandshake,
    practical: Home,
    future: Target,
    personal: User
  };

  const handleSaveConcerns = async () => {
    if (selectedConcerns.length === 0) {
      // Allow skipping but encourage selection
      const confirmSkip = confirm('Are you sure you want to skip selecting concerns? This helps personalize your therapy experience.');      if (!confirmSkip) return;
    }
    
    setIsSaving(true);
    try {
      // Save concerns to user profile
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentConcerns: selectedConcerns })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save concerns');
      }
      
      // Continue to next step
      onNext();
    } catch (error) {
      console.error('Error saving concerns:', error);
      alert('Failed to save your concerns. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >      <GlassCard className="p-6 sm:p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            What brings you here?
          </h2>
          <p className="text-gray-300 text-sm sm:text-base">
            Select the concerns you'd like to work on. This helps us personalize your therapy experience.
          </p>
        </div>

        {/* Category Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {Object.entries(CONCERN_CATEGORIES).slice(0, 3).map(([key, label]) => {
            const Icon = categoryIcons[key as keyof typeof categoryIcons];
            return (
              <div
                key={key}
                className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10"
              >
                <Icon size={20} className="text-blue-400" />
                <span className="text-xs sm:text-sm text-gray-300">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Concerns Selector */}
        <div className="mb-8">
          <ConcernsSelector
            value={selectedConcerns}
            onChange={setSelectedConcerns}
            placeholder="Click to select your therapy concerns..."
            maxSelections={10}
          />
        </div>        {/* Selected Count */}
        {selectedConcerns.length > 0 && (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-400">
              {selectedConcerns.length} concern{selectedConcerns.length > 1 ? 's' : ''} selected
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {onBack && (
            <ButtonWithSound
              variant="secondary"
              onClick={onBack}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Back
            </ButtonWithSound>
          )}
          
          <ButtonWithSound
            variant="primary"
            onClick={handleSaveConcerns}
            disabled={isSaving}
            className="w-full sm:flex-1"
          >
            {isSaving ? 'Saving...' : selectedConcerns.length > 0 ? 'Continue' : 'Skip for now'}
          </ButtonWithSound>
        </div>
        
        {selectedConcerns.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">
            You can always update your concerns later in your profile
          </p>
        )}
      </GlassCard>
    </motion.div>
  );
}