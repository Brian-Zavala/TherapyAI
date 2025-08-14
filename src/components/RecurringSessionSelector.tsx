'use client';

import { motion } from 'framer-motion';
import { Calendar, CalendarCheck, CalendarX, HelpCircle, Repeat, Clock, TrendingUp, Shuffle } from 'lucide-react';

interface RecurringOption {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  benefits: string[];
  color: string;
  recommended?: boolean;
}

const RECURRING_OPTIONS: RecurringOption[] = [
  {
    value: 'yes',
    label: 'Yes, Set Up Recurring',
    description: 'Automatically schedule regular sessions for consistent progress',
    icon: <CalendarCheck size={28} />,
    color: 'green',
    benefits: [
      'Guaranteed time slots',
      'Build consistent habits',
      'Better therapeutic progress',
      'Priority scheduling'
    ],
    recommended: true
  },
  {
    value: 'no',
    label: 'No, Book as Needed',
    description: 'Schedule sessions individually when you need them',
    icon: <Calendar size={28} />,
    color: 'blue',
    benefits: [
      'Maximum flexibility',
      'No commitment required',
      'Book when ready',
      'Control your pace'
    ]
  },
  {
    value: 'maybe',
    label: 'Decide Later',
    description: 'Start with individual sessions and decide as you go',
    icon: <HelpCircle size={28} />,
    color: 'purple',
    benefits: [
      'Try before committing',
      'Test the waters',
      'Flexible start',
      'Switch anytime'
    ]
  }
];

interface RecurringSessionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function RecurringSessionSelector({
  value,
  onChange,
  className = ''
}: RecurringSessionSelectorProps) {
  const getColorClasses = (color: string, isSelected: boolean) => {
    const colorMap: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
      green: {
        bg: isSelected ? 'from-green-500/20 to-emerald-500/20' : 'bg-white/5',
        border: isSelected ? 'border-green-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-200',
        badge: 'from-green-500 to-emerald-500'
      },
      blue: {
        bg: isSelected ? 'from-blue-500/20 to-cyan-500/20' : 'bg-white/5',
        border: isSelected ? 'border-blue-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-200',
        badge: 'from-blue-500 to-cyan-500'
      },
      purple: {
        bg: isSelected ? 'from-purple-500/20 to-violet-500/20' : 'bg-white/5',
        border: isSelected ? 'border-purple-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-gray-200',
        badge: 'from-purple-500 to-violet-500'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Visual Benefits Header */}
      <div className="flex items-center gap-2 sm:gap-3 p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg border border-indigo-500/20">
        <Repeat className="text-indigo-400" size={20} />
        <div className="flex-1">
          <p className="text-sm sm:text-base sm:text-lg text-gray-300">
            <span className="font-semibold text-white">Pro Tip:</span> Recurring sessions help build momentum and show 
            <span className="text-indigo-300"> 73% better outcomes</span> in relationship therapy
          </p>
        </div>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:p-4">
        {RECURRING_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const colors = getColorClasses(option.color, isSelected);
          
          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-5 rounded-xl border transition-all text-left ${
                isSelected
                  ? `bg-gradient-to-br ${colors.bg} ${colors.border} shadow-lg`
                  : `${colors.bg} ${colors.border} hover:bg-white/10 hover:border-white/20`
              }`}
            >
              {option.recommended && (
                <div className="absolute -top-2 -right-2">
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className={`inline-flex items-center px-2 py-0.5 text-xs sm:text-sm font-bold bg-gradient-to-r ${colors.badge} text-white rounded-full shadow-lg`}
                  >
                    Recommended
                  </motion.span>
                </div>
              )}
              
              <div className="space-y-4">
                {/* Icon and Title */}
                <div className="flex items-start gap-2 sm:gap-3">
                  <motion.div 
                    className={`p-2.5 rounded-xl ${colors.icon}`}
                    animate={isSelected ? { rotate: [0, -5, 5, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {option.icon}
                  </motion.div>
                  
                  <div className="flex-1">
                    <h4 className={`font-bold text-base sm:text-lg mb-1 ${
                      isSelected ? 'text-white' : 'text-gray-200'
                    }`}>
                      {option.label}
                    </h4>
                    <p className="text-xs sm:text-sm sm:text-base sm:text-lg text-gray-200 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </div>
                
                {/* Benefits List */}
                <div className="space-y-2">
                  {option.benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: isSelected ? index * 0.1 : 0 }}
                      className="flex items-center gap-2"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white/50' : 'bg-white/20'
                      }`} />
                      <span className={`text-xs sm:text-sm sm:text-base sm:text-lg ${
                        isSelected ? 'text-gray-300' : 'text-gray-300'
                      }`}>
                        {benefit}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {isSelected && (
                <motion.div
                  layoutId="recurring-selector"
                  className={`absolute inset-0 border-2 ${colors.border} rounded-xl pointer-events-none`}
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Additional Info based on selection */}
      {value === 'yes' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 sm:p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <Clock className="text-green-400 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm sm:text-base sm:text-lg text-green-300 font-medium mb-1">Great choice!</p>
              <p className="text-xs sm:text-sm sm:text-base sm:text-lg text-gray-200">
                We'll help you set up your recurring schedule after your first session. 
                You can always adjust the frequency or pause anytime.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {value === 'no' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <Shuffle className="text-blue-400 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm sm:text-base sm:text-lg text-blue-300 font-medium mb-1">Flexibility is key!</p>
              <p className="text-xs sm:text-sm sm:text-base sm:text-lg text-gray-200">
                Book sessions whenever you need them. You can always switch to recurring 
                sessions later if you find a rhythm that works for you.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}