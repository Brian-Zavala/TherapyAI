'use client';

/**
 * Enterprise Calendar Component
 * Intelligent scheduling with conflict detection, preferences, and integrations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Settings,
  Calendar as CalendarIcon,
  Users,
  Zap,
  AlertCircle,
  Info
} from 'lucide-react';
import { format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  addMonths, 
  subMonths,
  setHours,
  setMinutes,
  isToday,
  isPast,
  isFuture,
  addDays,
  isWeekend,
  getDay
} from 'date-fns';

// Types
interface TimeSlot {
  time: string;
  available: boolean;
  recommended: boolean;
  conflictReason?: string;
  source?: 'user_preference' | 'ai_suggestion' | 'availability';
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isSelected: boolean;
  isPreferred: boolean;
  hasConflict: boolean;
  availableSlots: number;
  events: CalendarEvent[];
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  type: 'therapy' | 'personal' | 'work' | 'other';
  source: 'internal' | 'google' | 'outlook';
  conflictLevel: 'none' | 'soft' | 'hard';
}

interface UserPreferences {
  sessionPreference?: string;
  preferredDays?: string[];
  sessionFrequency?: string;
  recurringSession?: string;
  reminderTiming?: string;
  timeZone?: string;
}

interface ConflictInfo {
  hasConflict: boolean;
  conflicts: Array<{
    provider: string;
    event: CalendarEvent;
    overlapMinutes: number;
  }>;
}

interface EnterpriseCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
  duration: number;
  userPreferences: UserPreferences;
  calendarIntegrations?: Array<{
    provider: 'google' | 'outlook' | 'exchange';
    enabled: boolean;
    syncing: boolean;
  }>;
  onConflictDetected?: (conflict: ConflictInfo) => void;
  showAdvancedFeatures?: boolean;
  className?: string;
}

export const EnterpriseCalendar: React.FC<EnterpriseCalendarProps> = ({
  selectedDate,
  onDateSelect,
  onTimeSelect,
  duration,
  userPreferences,
  calendarIntegrations = [],
  onConflictDetected,
  showAdvancedFeatures = true,
  className = ''
}) => {
  // State management
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo>({ hasConflict: false, conflicts: [] });
  const [availabilityCache, setAvailabilityCache] = useState<Map<string, CalendarEvent[]>>(new Map());
  const [showTimeDetails, setShowTimeDetails] = useState(false);
  const [intelligentSuggestions, setIntelligentSuggestions] = useState<Array<{
    date: Date;
    time: string;
    reason: string;
    confidence: number;
  }>>([]);

  // Generate calendar days
  const generateCalendarDays = useCallback(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const days = eachDayOfInterval({ start, end });

    const calendarDays: CalendarDay[] = days.map(date => {
      const dayOfWeek = getDay(date);
      const preferredDays = userPreferences.preferredDays || [];
      const isPreferred = preferredDays.includes(format(date, 'EEEE').toLowerCase());
      
      return {
        date,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isToday: isToday(date),
        isPast: isPast(date) && !isToday(date),
        isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
        isPreferred,
        hasConflict: false, // Will be updated with real conflict data
        availableSlots: isPreferred ? 8 : 4, // More slots for preferred days
        events: availabilityCache.get(format(date, 'yyyy-MM-dd')) || []
      };
    });

    setCalendarDays(calendarDays);
  }, [currentMonth, selectedDate, userPreferences.preferredDays, availabilityCache]);

  // Generate time slots based on preferences and availability
  const generateTimeSlots = useCallback((date: Date) => {
    if (!date) return;

    const slots: TimeSlot[] = [];
    const sessionPref = userPreferences.sessionPreference;
    
    // Define time ranges based on preference
    let timeRanges: Array<{ start: number; end: number; recommended: boolean }> = [];
    
    switch (sessionPref) {
      case 'morning':
        timeRanges = [
          { start: 8, end: 12, recommended: true },
          { start: 12, end: 14, recommended: false }
        ];
        break;
      case 'afternoon':
        timeRanges = [
          { start: 12, end: 17, recommended: true },
          { start: 10, end: 12, recommended: false },
          { start: 17, end: 19, recommended: false }
        ];
        break;
      case 'evening':
        timeRanges = [
          { start: 17, end: 20, recommended: true },
          { start: 15, end: 17, recommended: false }
        ];
        break;
      default: // flexible
        timeRanges = [
          { start: 9, end: 11, recommended: true },
          { start: 14, end: 16, recommended: true },
          { start: 18, end: 20, recommended: true },
          { start: 11, end: 14, recommended: false },
          { start: 16, end: 18, recommended: false }
        ];
    }

    // Generate slots
    timeRanges.forEach(range => {
      for (let hour = range.start; hour < range.end; hour++) {
        [0, 30].forEach(minute => {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const slotDate = setMinutes(setHours(date, hour), minute);
          
          // Check if slot is in the past
          const isPastSlot = isPast(slotDate);
          
          // Check for conflicts (simplified - would integrate with calendar service)
          const hasConflict = false; // TODO: Implement real conflict checking
          
          slots.push({
            time,
            available: !isPastSlot && !hasConflict,
            recommended: range.recommended && !isPastSlot,
            source: range.recommended ? 'user_preference' : 'availability'
          });
        });
      }
    });

    // Sort by time
    slots.sort((a, b) => a.time.localeCompare(b.time));
    setTimeSlots(slots);
  }, [userPreferences.sessionPreference]);

  // Generate intelligent suggestions
  const generateIntelligentSuggestions = useCallback(() => {
    const suggestions: Array<{
      date: Date;
      time: string;
      reason: string;
      confidence: number;
    }> = [];

    const today = new Date();
    const preferredDays = userPreferences.preferredDays || [];
    const sessionPref = userPreferences.sessionPreference;

    // Look ahead 2 weeks
    for (let i = 1; i <= 14; i++) {
      const date = addDays(today, i);
      const dayName = format(date, 'EEEE').toLowerCase();
      
      if (preferredDays.includes(dayName) && !isWeekend(date)) {
        let time = '10:00';
        let confidence = 0.8;
        let reason = 'Matches your preferred day';

        // Adjust time based on preference
        switch (sessionPref) {
          case 'morning':
            time = '09:00';
            confidence = 0.9;
            reason = 'Optimal morning slot on your preferred day';
            break;
          case 'afternoon':
            time = '14:00';
            confidence = 0.9;
            reason = 'Perfect afternoon time on your preferred day';
            break;
          case 'evening':
            time = '18:00';
            confidence = 0.9;
            reason = 'Ideal evening slot on your preferred day';
            break;
        }

        suggestions.push({ date, time, reason, confidence });
      }
    }

    // Limit to top 3 suggestions
    setIntelligentSuggestions(suggestions.slice(0, 3));
  }, [userPreferences]);

  // Effects
  useEffect(() => {
    generateCalendarDays();
  }, [generateCalendarDays]);

  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots(selectedDate);
    }
  }, [selectedDate, generateTimeSlots]);

  useEffect(() => {
    generateIntelligentSuggestions();
  }, [generateIntelligentSuggestions]);

  // Event handlers
  const handleDateClick = (day: CalendarDay) => {
    if (day.isPast) return;
    
    onDateSelect(day.date);
    setSelectedTime('');
    
    // Check for conflicts
    // This would integrate with the calendar service
    const mockConflict: ConflictInfo = {
      hasConflict: false,
      conflicts: []
    };
    setConflicts(mockConflict);
    onConflictDetected?.(mockConflict);
  };

  const handleTimeClick = (slot: TimeSlot) => {
    if (!slot.available) return;
    
    setSelectedTime(slot.time);
    onTimeSelect(slot.time);
    setShowTimeDetails(true);
  };

  const handleSuggestionClick = (suggestion: typeof intelligentSuggestions[0]) => {
    onDateSelect(suggestion.date);
    setCurrentMonth(suggestion.date);
    setTimeout(() => {
      onTimeSelect(suggestion.time);
      setSelectedTime(suggestion.time);
    }, 100);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  // Render helpers
  const renderCalendarHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <h2 className="text-xl font-semibold text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        {showAdvancedFeatures && (
          <div className="flex items-center space-x-2">
            {calendarIntegrations.map(integration => (
              <div 
                key={integration.provider}
                className={`px-2 py-1 rounded-md text-xs font-medium ${
                  integration.enabled 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}
              >
                {integration.provider}
                {integration.syncing && (
                  <RefreshCw className="w-3 h-3 ml-1 animate-spin inline" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );

  const renderCalendarGrid = () => (
    <div className="grid grid-cols-7 gap-1 mb-6">
      {/* Weekday headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="p-3 text-center text-sm font-medium text-white/60">
          {day}
        </div>
      ))}
      
      {/* Calendar days */}
      {calendarDays.map((day, index) => (
        <motion.button
          key={index}
          onClick={() => handleDateClick(day)}
          disabled={day.isPast}
          whileHover={!day.isPast ? { scale: 1.05 } : undefined}
          whileTap={!day.isPast ? { scale: 0.95 } : undefined}
          className={`
            relative p-3 rounded-lg transition-all duration-200 text-sm font-medium
            ${day.isPast 
              ? 'text-white/30 cursor-not-allowed' 
              : 'text-white cursor-pointer hover:bg-white/10'
            }
            ${!day.isCurrentMonth ? 'text-white/40' : ''}
            ${day.isToday ? 'ring-2 ring-blue-400' : ''}
            ${day.isSelected ? 'bg-blue-600/80 text-white' : ''}
            ${day.isPreferred && !day.isSelected ? 'bg-green-500/20 border border-green-500/40' : ''}
            ${day.hasConflict ? 'bg-red-500/20 border border-red-500/40' : ''}
          `}
        >
          <span className="relative z-10">{format(day.date, 'd')}</span>
          
          {/* Indicators */}
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {day.isPreferred && (
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
            )}
            {day.events.length > 0 && (
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
            )}
            {day.hasConflict && (
              <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
            )}
          </div>
          
          {/* Available slots indicator */}
          {day.availableSlots > 0 && !day.isPast && (
            <div className="absolute top-1 right-1 text-xs text-white/60">
              {day.availableSlots}
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );

  const renderTimeSlots = () => {
    if (!selectedDate || timeSlots.length === 0) return null;

    const recommendedSlots = timeSlots.filter(slot => slot.recommended && slot.available);
    const otherSlots = timeSlots.filter(slot => !slot.recommended && slot.available);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">
            Available Times - {format(selectedDate, 'MMM d, yyyy')}
          </h3>
          <button
            onClick={() => setShowTimeDetails(!showTimeDetails)}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            {showTimeDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>

        {/* Recommended slots */}
        {recommendedSlots.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">Recommended for you</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {recommendedSlots.map(slot => (
                <motion.button
                  key={slot.time}
                  onClick={() => handleTimeClick(slot)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    p-3 rounded-lg border transition-all duration-200 text-sm font-medium
                    ${selectedTime === slot.time
                      ? 'bg-yellow-500/80 border-yellow-400 text-white'
                      : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30'
                    }
                  `}
                >
                  {slot.time}
                  {showTimeDetails && slot.source && (
                    <div className="text-xs mt-1 opacity-70">
                      {slot.source === 'user_preference' ? 'Preferred' : 'Available'}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Other available slots */}
        {otherSlots.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="w-4 h-4 text-white/60" />
              <span className="text-sm font-medium text-white/60">Other available times</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {otherSlots.map(slot => (
                <motion.button
                  key={slot.time}
                  onClick={() => handleTimeClick(slot)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    p-3 rounded-lg border transition-all duration-200 text-sm font-medium
                    ${selectedTime === slot.time
                      ? 'bg-blue-600/80 border-blue-400 text-white'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }
                  `}
                >
                  {slot.time}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderIntelligentSuggestions = () => {
    if (intelligentSuggestions.length === 0 || !showAdvancedFeatures) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <Zap className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-medium text-white">Intelligent Suggestions</h3>
        </div>
        
        <div className="grid gap-3">
          {intelligentSuggestions.map((suggestion, index) => (
            <motion.button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 rounded-lg bg-blue-500/20 border border-blue-500/40 text-left hover:bg-blue-500/30 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">
                    {format(suggestion.date, 'EEEE, MMM d')} at {suggestion.time}
                  </div>
                  <div className="text-blue-300 text-sm mt-1">
                    {suggestion.reason}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-blue-400">
                    {Math.round(suggestion.confidence * 100)}% match
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-400" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  const renderConflictAlert = () => {
    if (!conflicts.hasConflict) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/40"
      >
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-red-400 font-medium">Schedule Conflicts Detected</h4>
            <div className="text-red-300 text-sm mt-1">
              {conflicts.conflicts.map((conflict, index) => (
                <div key={index}>
                  • {conflict.event.title} ({conflict.provider})
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Intelligent Suggestions */}
      {renderIntelligentSuggestions()}
      
      {/* Conflict Alert */}
      {renderConflictAlert()}
      
      {/* Calendar */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        {renderCalendarHeader()}
        {renderCalendarGrid()}
      </div>
      
      {/* Time Slots */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
        >
          {renderTimeSlots()}
        </motion.div>
      )}
      
      {/* Legend */}
      {showAdvancedFeatures && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h4 className="text-white font-medium mb-3">Calendar Legend</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-500/40 border border-green-500/60"></div>
              <span className="text-white/70">Preferred days</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-blue-600/80"></div>
              <span className="text-white/70">Selected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-red-500/40 border border-red-500/60"></div>
              <span className="text-white/70">Conflicts</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded ring-2 ring-blue-400"></div>
              <span className="text-white/70">Today</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseCalendar;