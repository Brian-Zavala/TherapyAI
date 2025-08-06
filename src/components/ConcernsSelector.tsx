'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Check } from 'lucide-react';
import { 
  THERAPY_CONCERNS, 
  CONCERN_CATEGORIES, 
  getConcernsByCategory,
  getCommonConcerns,
  type TherapyConcern 
} from '@/data/therapy-concerns';

interface ConcernsSelectorProps {
  value: string[];
  onChange: (concerns: string[]) => void;
  className?: string;
  placeholder?: string;
  maxSelections?: number;
}

export default function ConcernsSelector({
  value = [],
  onChange,
  className = '',
  placeholder = 'Select your concerns...',
  maxSelections = 10
}: ConcernsSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('common');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get selected concern objects
  const selectedConcerns = THERAPY_CONCERNS.filter(c => value.includes(c.id));
  
  // Toggle concern selection
  const toggleConcern = (concernId: string) => {
    if (value.includes(concernId)) {
      onChange(value.filter(id => id !== concernId));
    } else if (value.length < maxSelections) {
      onChange([...value, concernId]);
    }
  };
  
  // Get concerns to display based on active category and search
  const getDisplayConcerns = () => {
    let concerns: TherapyConcern[] = [];
    
    if (activeCategory === 'common') {
      concerns = getCommonConcerns();
    } else if (activeCategory === 'all') {
      concerns = THERAPY_CONCERNS;
    } else {
      concerns = getConcernsByCategory(activeCategory as any);
    }
    
    // Filter by search term
    if (searchTerm) {
      concerns = concerns.filter(c => 
        c.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return concerns;
  };
  
  const displayConcerns = getDisplayConcerns();

  return (
    <div className={`relative ${className}`}>
      {/* Selected Concerns Display */}
      <div className="mb-2">
        {selectedConcerns.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <AnimatePresence>
              {selectedConcerns.map(concern => (
                <motion.div
                  key={concern.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-full text-sm backdrop-blur-sm border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                >
                  <span>{concern.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleConcern(concern.id);
                    }}
                    className="hover:bg-white/10 rounded-full p-0.5"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-all hover:bg-white/15 flex items-center justify-between"
      >
        <span className={selectedConcerns.length === 0 ? 'text-gray-400' : ''}>
          {selectedConcerns.length === 0 
            ? placeholder 
            : `${selectedConcerns.length} concern${selectedConcerns.length > 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown 
          size={20} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      
      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-gray-900 border border-white/20 rounded-lg shadow-xl overflow-hidden"
          >
            {/* Search Bar */}
            <div className="p-3 border-b border-white/10">
              <input
                type="text"
                placeholder="Search concerns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            
            {/* Category Tabs */}
            <div className="flex overflow-x-auto border-b border-white/10 bg-black/20">
              <button
                onClick={() => setActiveCategory('common')}
                className={`px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                  activeCategory === 'common' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Most Common
              </button>
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                  activeCategory === 'all' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All Concerns
              </button>
              {Object.entries(CONCERN_CATEGORIES).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                    activeCategory === key 
                      ? 'text-blue-400 border-b-2 border-blue-400' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            
            {/* Concerns List */}
            <div className="max-h-64 overflow-y-auto p-2">
              {displayConcerns.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  No concerns found
                </div>
              ) : (
                <div className="grid gap-1">
                  {displayConcerns.map(concern => {
                    const isSelected = value.includes(concern.id);
                    const isDisabled = !isSelected && value.length >= maxSelections;
                    
                    return (
                      <button
                        key={concern.id}
                        type="button"
                        onClick={() => !isDisabled && toggleConcern(concern.id)}
                        disabled={isDisabled}
                        className={`
                          flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-all
                          ${isSelected 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                            : isDisabled
                              ? 'bg-gray-800/30 text-gray-500 cursor-not-allowed'
                              : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-transparent'
                          }
                        `}
                      >
                        <span>{concern.label}</span>
                        {isSelected && <Check size={16} className="text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer with count */}
            {value.length > 0 && (
              <div className="p-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  {value.length}/{maxSelections} selected
                </span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}