'use client';

import { motion } from 'framer-motion';
import { Clock, Coffee, Calendar, Sparkles } from 'lucide-react';

interface SessionDurationOption {
  value: string;
  label: string;
  duration: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

const DURATION_OPTIONS: SessionDurationOption[] = [
  {
    value: '15',
    label: 'Quick Check-in',
    duration: '15 minutes',
    description: 'Perfect for brief updates or urgent concerns',
    icon: <Coffee size={24} />
  },
  {
    value: '20',
    label: 'Short Session',
    duration: '20 minutes',
    description: 'Ideal for focused discussions on specific topics',
    icon: <Clock size={24} />
  },
  {
    value: '25',
    label: 'Standard Session',
    duration: '25 minutes',
    description: 'Our most popular choice for balanced conversations',
    icon: <Calendar size={24} />,
    recommended: true
  },
  {
    value: '30',
    label: 'Extended Session',
    duration: '30 minutes',
    description: 'Great for deeper exploration and complex issues',
    icon: <Sparkles size={24} />
  }
];

interface SessionDurationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SessionDurationSelector({
  value,
  onChange,
  className = ''
}: SessionDurationSelectorProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 ${className}`}>
      {DURATION_OPTIONS.map((option) => (
        <motion.button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative p-3 sm:p-4 rounded-xl border transition-all text-left ${
            value === option.value
              ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50 shadow-lg'
              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
          }`}
        >
          {option.recommended && (
            <div className="absolute -top-2 -right-2">
              <span className="inline-flex items-center px-2 py-1 text-xs sm:text-sm sm:text-base sm:text-lg font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg">
                Recommended
              </span>
            </div>
          )}
          
          <div className="flex items-start gap-2 sm:gap-3">
            <div className={`p-2 rounded-lg ${
              value === option.value 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-white/10 text-gray-200'
            }`}>
              {option.icon}
            </div>
            
            <div className="flex-1">
              <h4 className={`font-semibold mb-1 ${
                value === option.value ? 'text-white' : 'text-gray-200'
              }`}>
                {option.label}
              </h4>
              <div className={`text-sm sm:text-base sm:text-lg font-medium mb-1 ${
                value === option.value ? 'text-blue-300' : 'text-gray-200'
              }`}>
                {option.duration}
              </div>
              <p className="text-xs sm:text-sm sm:text-base sm:text-lg text-gray-300 leading-relaxed">
                {option.description}
              </p>
            </div>
          </div>
          
          {value === option.value && (
            <motion.div
              layoutId="duration-selector"
              className="absolute inset-0 border-2 border-blue-400/50 rounded-xl pointer-events-none"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}