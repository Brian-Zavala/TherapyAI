'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Check, Calendar } from 'lucide-react';

interface Day {
  id: string;
  label: string;
  abbreviation: string;
}

const DAYS_OF_WEEK: Day[] = [
  { id: 'monday', label: 'Monday', abbreviation: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', abbreviation: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', abbreviation: 'Wed' },
  { id: 'thursday', label: 'Thursday', abbreviation: 'Thu' },
  { id: 'friday', label: 'Friday', abbreviation: 'Fri' },
  { id: 'saturday', label: 'Saturday', abbreviation: 'Sat' },
  { id: 'sunday', label: 'Sunday', abbreviation: 'Sun' },
];

const TIME_PREFERENCES = [
  { id: 'morning', label: 'Morning (6am - 12pm)', icon: '🌅' },
  { id: 'afternoon', label: 'Afternoon (12pm - 5pm)', icon: '☀️' },
  { id: 'evening', label: 'Evening (5pm - 9pm)', icon: '🌆' },
];

interface DaysSelectorProps {
  value: string[];
  onChange: (days: string[]) => void;
  className?: string;
  placeholder?: string;
  maxSelections?: number;
  includeTimePreferences?: boolean;
}

export default function DaysSelector({
  value = [],
  onChange,
  className = '',
  placeholder = 'Select preferred days...',
  maxSelections = 7,
  includeTimePreferences = false
}: DaysSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'days' | 'time'>('days');
  
  // Separate days and time preferences from value array
  const selectedDays = value.filter(v => DAYS_OF_WEEK.some(d => d.id === v));
  const selectedTimes = value.filter(v => TIME_PREFERENCES.some(t => t.id === v));
  
  // Get selected day objects
  const selectedDayObjects = DAYS_OF_WEEK.filter(d => selectedDays.includes(d.id));
  const selectedTimeObjects = TIME_PREFERENCES.filter(t => selectedTimes.includes(t.id));
  
  // Toggle day selection
  const toggleDay = (dayId: string) => {
    const isDaySelection = DAYS_OF_WEEK.some(d => d.id === dayId);
    const isTimeSelection = TIME_PREFERENCES.some(t => t.id === dayId);
    
    if (isDaySelection) {
      if (selectedDays.includes(dayId)) {
        onChange(value.filter(id => id !== dayId));
      } else if (selectedDays.length < maxSelections) {
        onChange([...value, dayId]);
      }
    } else if (isTimeSelection && includeTimePreferences) {
      if (selectedTimes.includes(dayId)) {
        onChange(value.filter(id => id !== dayId));
      } else {
        onChange([...value, dayId]);
      }
    }
  };
  
  // Quick selection helpers
  const selectWeekdays = () => {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const nonDayValues = value.filter(v => !DAYS_OF_WEEK.some(d => d.id === v));
    onChange([...nonDayValues, ...weekdays]);
  };
  
  const selectWeekends = () => {
    const weekends = ['saturday', 'sunday'];
    const nonDayValues = value.filter(v => !DAYS_OF_WEEK.some(d => d.id === v));
    onChange([...nonDayValues, ...weekends]);
  };
  
  const selectAllDays = () => {
    const allDayIds = DAYS_OF_WEEK.map(d => d.id);
    const nonDayValues = value.filter(v => !DAYS_OF_WEEK.some(d => d.id === v));
    onChange([...nonDayValues, ...allDayIds]);
  };
  
  const clearDays = () => {
    const nonDayValues = value.filter(v => !DAYS_OF_WEEK.some(d => d.id === v));
    onChange(nonDayValues);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Days Display - Bubble Tags */}
      <div className="mb-2">
        {(selectedDayObjects.length > 0 || selectedTimeObjects.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-3">
            <AnimatePresence>
              {selectedDayObjects.map(day => (
                <motion.div
                  key={day.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm backdrop-blur-sm border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                >
                  <Calendar size={14} className="opacity-70" />
                  <span>{day.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDay(day.id);
                    }}
                    className="hover:bg-white/10 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${day.label}`}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
              {includeTimePreferences && selectedTimeObjects.map(time => (
                <motion.div
                  key={time.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-full text-sm backdrop-blur-sm border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                >
                  <span>{time.icon}</span>
                  <span>{time.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDay(time.id);
                    }}
                    className="hover:bg-white/10 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${time.label}`}
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
        className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none transition-all hover:bg-white/15 flex items-center justify-between group"
      >
        <span className={`flex items-center gap-2 ${selectedDayObjects.length === 0 && selectedTimeObjects.length === 0 ? 'text-gray-400' : ''}`}>
          <Calendar size={18} className="opacity-70 group-hover:opacity-100 transition-opacity" />
          {selectedDayObjects.length === 0 && selectedTimeObjects.length === 0
            ? placeholder 
            : `${selectedDayObjects.length} day${selectedDayObjects.length !== 1 ? 's' : ''}${
                includeTimePreferences && selectedTimeObjects.length > 0 
                  ? `, ${selectedTimeObjects.length} time preference${selectedTimeObjects.length !== 1 ? 's' : ''}` 
                  : ''
              } selected`}
        </span>
        <ChevronDown 
          size={20} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      
      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute z-50 w-full mt-2 bg-gray-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {/* Tabs for days/time if time preferences enabled */}
            {includeTimePreferences && (
              <div className="flex border-b border-white/10 bg-black/30">
                <button
                  onClick={() => setActiveTab('days')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'days' 
                      ? 'text-purple-400 bg-purple-500/10 border-b-2 border-purple-400' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Days of Week
                </button>
                <button
                  onClick={() => setActiveTab('time')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'time' 
                      ? 'text-amber-400 bg-amber-500/10 border-b-2 border-amber-400' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Time Preferences
                </button>
              </div>
            )}
            
            {/* Quick Selection Buttons */}
            {(!includeTimePreferences || activeTab === 'days') && (
              <div className="flex gap-2 p-3 border-b border-white/10 bg-black/20">
                <button
                  type="button"
                  onClick={selectWeekdays}
                  className="px-3 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-full transition-colors"
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  onClick={selectWeekends}
                  className="px-3 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-full transition-colors"
                >
                  Weekends
                </button>
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="px-3 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-full transition-colors"
                >
                  All Days
                </button>
              </div>
            )}
            
            {/* Days List or Time Preferences */}
            <div className="max-h-64 overflow-y-auto p-2">
              {(!includeTimePreferences || activeTab === 'days') ? (
                <div className="grid gap-1">
                  {DAYS_OF_WEEK.map(day => {
                    const isSelected = selectedDays.includes(day.id);
                    const isDisabled = !isSelected && selectedDays.length >= maxSelections;
                    
                    return (
                      <motion.button
                        key={day.id}
                        type="button"
                        onClick={() => !isDisabled && toggleDay(day.id)}
                        disabled={isDisabled}
                        whileHover={!isDisabled ? { scale: 1.02 } : {}}
                        whileTap={!isDisabled ? { scale: 0.98 } : {}}
                        className={`
                          flex items-center justify-between px-4 py-2.5 rounded-lg text-sm text-left transition-all
                          ${isSelected 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm' 
                            : isDisabled
                              ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed opacity-50'
                              : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-transparent'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{day.label}</span>
                          <span className="text-xs opacity-60">({day.abbreviation})</span>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          >
                            <Check size={16} className="text-purple-400" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-1">
                  {TIME_PREFERENCES.map(time => {
                    const isSelected = selectedTimes.includes(time.id);
                    
                    return (
                      <motion.button
                        key={time.id}
                        type="button"
                        onClick={() => toggleDay(time.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          flex items-center justify-between px-4 py-2.5 rounded-lg text-sm text-left transition-all
                          ${isSelected 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm' 
                            : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-transparent'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{time.icon}</span>
                          <span className="font-medium">{time.label}</span>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          >
                            <Check size={16} className="text-amber-400" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer with count */}
            {(selectedDays.length > 0 || selectedTimes.length > 0) && (
              <div className="p-3 border-t border-white/10 flex items-center justify-between bg-black/20">
                <span className="text-sm text-gray-400">
                  {selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''}
                  {includeTimePreferences && selectedTimes.length > 0 && 
                    `, ${selectedTimes.length} time preference${selectedTimes.length !== 1 ? 's' : ''}`
                  }
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'days' || !includeTimePreferences) {
                      clearDays();
                    } else {
                      onChange(value.filter(v => !TIME_PREFERENCES.some(t => t.id === v)));
                    }
                  }}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear {activeTab === 'time' && includeTimePreferences ? 'times' : 'all'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}