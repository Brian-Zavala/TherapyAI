'use client';

import { motion } from 'framer-motion';
import { Bell, Clock, Smartphone, Coffee, Sun, Calendar, BellRing, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface ReminderOption {
  value: string;
  label: string;
  time: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  example?: string;
  popular?: boolean;
}

const REMINDER_OPTIONS: ReminderOption[] = [
  {
    value: '5min',
    label: 'Last Minute',
    time: '5 minutes before',
    description: 'Quick reminder right before your session',
    icon: <AlertCircle size={20} />,
    color: 'red',
    example: 'Session at 3:00 PM → Reminder at 2:55 PM'
  },
  {
    value: '15min',
    label: 'Quick Prep',
    time: '15 minutes before',
    description: 'Just enough time to wrap up and prepare',
    icon: <Coffee size={20} />,
    color: 'orange',
    example: 'Session at 3:00 PM → Reminder at 2:45 PM',
    popular: true
  },
  {
    value: '30min',
    label: 'Standard',
    time: '30 minutes before',
    description: 'Time to finish tasks and get mentally ready',
    icon: <Clock size={20} />,
    color: 'blue',
    example: 'Session at 3:00 PM → Reminder at 2:30 PM'
  },
  {
    value: '1hour',
    label: 'Early Bird',
    time: '1 hour before',
    description: 'Plenty of time to prepare and find a quiet space',
    icon: <Bell size={20} />,
    color: 'green',
    example: 'Session at 3:00 PM → Reminder at 2:00 PM'
  },
  {
    value: '2hours',
    label: 'Advanced Notice',
    time: '2 hours before',
    description: 'Early reminder to plan your schedule',
    icon: <Sun size={20} />,
    color: 'purple',
    example: 'Session at 3:00 PM → Reminder at 1:00 PM'
  },
  {
    value: '1day',
    label: 'Day Before',
    time: '24 hours before',
    description: 'Reminder the day before to prepare mentally',
    icon: <Calendar size={20} />,
    color: 'indigo',
    example: 'Session tomorrow at 3:00 PM'
  }
];

interface ReminderTimingSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function ReminderTimingSelector({
  value,
  onChange,
  className = ''
}: ReminderTimingSelectorProps) {
  const [showPreview, setShowPreview] = useState(false);
  
  const getColorClasses = (color: string, isSelected: boolean) => {
    const colorMap: Record<string, { bg: string; border: string; icon: string; text: string }> = {
      red: {
        bg: isSelected ? 'from-red-500/20 to-rose-500/20' : 'bg-white/5',
        border: isSelected ? 'border-red-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400',
        text: 'text-red-300'
      },
      orange: {
        bg: isSelected ? 'from-orange-500/20 to-amber-500/20' : 'bg-white/5',
        border: isSelected ? 'border-orange-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-gray-400',
        text: 'text-orange-300'
      },
      blue: {
        bg: isSelected ? 'from-blue-500/20 to-cyan-500/20' : 'bg-white/5',
        border: isSelected ? 'border-blue-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-400',
        text: 'text-blue-300'
      },
      green: {
        bg: isSelected ? 'from-green-500/20 to-emerald-500/20' : 'bg-white/5',
        border: isSelected ? 'border-green-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-400',
        text: 'text-green-300'
      },
      purple: {
        bg: isSelected ? 'from-purple-500/20 to-violet-500/20' : 'bg-white/5',
        border: isSelected ? 'border-purple-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-gray-400',
        text: 'text-purple-300'
      },
      indigo: {
        bg: isSelected ? 'from-indigo-500/20 to-blue-500/20' : 'bg-white/5',
        border: isSelected ? 'border-indigo-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-gray-400',
        text: 'text-indigo-300'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  const selectedOption = REMINDER_OPTIONS.find(opt => opt.value === value);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preview Toggle */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
        <div className="flex items-center gap-3">
          <BellRing className="text-blue-400" size={20} />
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-white">Smart Reminders:</span> We'll send notifications to your preferred channels
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {/* Reminder Options Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {REMINDER_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const colors = getColorClasses(option.color, isSelected);
          
          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-4 rounded-xl border transition-all text-left ${
                isSelected
                  ? `bg-gradient-to-br ${colors.bg} ${colors.border} shadow-lg`
                  : `${colors.bg} ${colors.border} hover:bg-white/10 hover:border-white/20`
              }`}
            >
              {option.popular && (
                <div className="absolute -top-2 -right-2">
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg">
                    Popular
                  </span>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${colors.icon}`}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm ${
                      isSelected ? 'text-white' : 'text-gray-200'
                    }`}>
                      {option.label}
                    </h4>
                    <p className={`text-xs font-medium ${
                      isSelected ? colors.text : 'text-gray-500'
                    }`}>
                      {option.time}
                    </p>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 leading-relaxed">
                  {option.description}
                </p>
              </div>
              
              {isSelected && (
                <motion.div
                  layoutId="reminder-selector"
                  className={`absolute inset-0 border-2 ${colors.border} rounded-xl pointer-events-none`}
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Preview Section */}
      {showPreview && selectedOption && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 bg-black/30 rounded-xl border border-white/10"
        >
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="text-gray-400" size={16} />
            <p className="text-sm font-medium text-gray-300">Notification Preview</p>
          </div>
          
          <div className="space-y-2">
            {/* Mock Phone Notification */}
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-blue-500 rounded-lg">
                  <Bell className="text-white" size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white mb-0.5">
                    Therapy Session Reminder
                  </p>
                  <p className="text-xs text-gray-400">
                    Your session starts in {selectedOption.time.replace('before', '')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedOption.example}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Multiple Reminders Note */}
            {(value === '1hour' || value === '2hours' || value === '1day') && (
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <p className="text-xs text-blue-300">
                  💡 You'll also receive a 15-minute reminder for last-minute preparation
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Smart Reminder Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="text-green-400" size={16} />
            <p className="text-xs font-semibold text-green-300">Auto-Adjust</p>
          </div>
          <p className="text-xs text-gray-400">
            Reminders automatically adjust to your time zone
          </p>
        </div>
        
        <div className="p-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="text-purple-400" size={16} />
            <p className="text-xs font-semibold text-purple-300">Multi-Channel</p>
          </div>
          <p className="text-xs text-gray-400">
            Get reminders via email, SMS, or in-app notifications
          </p>
        </div>
      </div>
    </div>
  );
}