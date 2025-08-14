'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Heart, Target, Compass, Lightbulb, Shield, Users, Zap } from 'lucide-react';

interface CommunicationStyle {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  traits: string[];
}

const COMMUNICATION_STYLES: CommunicationStyle[] = [
  {
    value: 'direct',
    label: 'Direct & Clear',
    description: 'Straightforward communication with practical solutions',
    icon: <Target size={24} />,
    color: 'red',
    traits: ['Honest feedback', 'Clear guidance', 'Action-oriented', 'Results-focused']
  },
  {
    value: 'gentle',
    label: 'Gentle & Supportive',
    description: 'Compassionate approach with emotional validation',
    icon: <Heart size={24} />,
    color: 'pink',
    traits: ['Empathetic listening', 'Soft approach', 'Emotional support', 'Patient pace']
  },
  {
    value: 'structured',
    label: 'Structured & Methodical',
    description: 'Organized sessions with clear frameworks and goals',
    icon: <Shield size={24} />,
    color: 'blue',
    traits: ['Step-by-step process', 'Clear agenda', 'Goal tracking', 'Progress metrics']
  },
  {
    value: 'exploratory',
    label: 'Exploratory & Open',
    description: 'Free-flowing conversations to discover insights',
    icon: <Compass size={24} />,
    color: 'purple',
    traits: ['Open-ended questions', 'Deep exploration', 'Self-discovery', 'Flexible flow']
  },
  {
    value: 'collaborative',
    label: 'Collaborative & Interactive',
    description: 'Partnership approach with active participation',
    icon: <Users size={24} />,
    color: 'green',
    traits: ['Joint problem-solving', 'Shared decisions', 'Team approach', 'Co-creation']
  },
  {
    value: 'motivational',
    label: 'Motivational & Energizing',
    description: 'Inspiring sessions focused on growth and potential',
    icon: <Zap size={24} />,
    color: 'amber',
    traits: ['Positive reinforcement', 'Energy boost', 'Growth mindset', 'Celebration']
  },
  {
    value: 'analytical',
    label: 'Analytical & Insightful',
    description: 'Deep analysis to understand patterns and behaviors',
    icon: <Lightbulb size={24} />,
    color: 'indigo',
    traits: ['Pattern recognition', 'Root cause analysis', 'Behavioral insights', 'Data-driven']
  },
  {
    value: 'balanced',
    label: 'Balanced & Adaptive',
    description: 'Flexible approach that adapts to your needs',
    icon: <MessageCircle size={24} />,
    color: 'teal',
    traits: ['Adaptive style', 'Versatile approach', 'Situation-based', 'Well-rounded']
  }
];

interface CommunicationStyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function CommunicationStyleSelector({
  value,
  onChange,
  className = ''
}: CommunicationStyleSelectorProps) {
  const getColorClasses = (color: string, isSelected: boolean) => {
    const colorMap: Record<string, { bg: string; border: string; icon: string }> = {
      red: {
        bg: isSelected ? 'from-red-500/20 to-rose-500/20' : 'bg-white/5',
        border: isSelected ? 'border-red-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400'
      },
      pink: {
        bg: isSelected ? 'from-pink-500/20 to-rose-500/20' : 'bg-white/5',
        border: isSelected ? 'border-pink-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-pink-500/20 text-pink-400' : 'bg-white/10 text-gray-400'
      },
      blue: {
        bg: isSelected ? 'from-blue-500/20 to-cyan-500/20' : 'bg-white/5',
        border: isSelected ? 'border-blue-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-400'
      },
      purple: {
        bg: isSelected ? 'from-purple-500/20 to-violet-500/20' : 'bg-white/5',
        border: isSelected ? 'border-purple-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-gray-400'
      },
      green: {
        bg: isSelected ? 'from-green-500/20 to-emerald-500/20' : 'bg-white/5',
        border: isSelected ? 'border-green-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-400'
      },
      amber: {
        bg: isSelected ? 'from-amber-500/20 to-yellow-500/20' : 'bg-white/5',
        border: isSelected ? 'border-amber-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-gray-400'
      },
      indigo: {
        bg: isSelected ? 'from-indigo-500/20 to-blue-500/20' : 'bg-white/5',
        border: isSelected ? 'border-indigo-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-gray-400'
      },
      teal: {
        bg: isSelected ? 'from-teal-500/20 to-cyan-500/20' : 'bg-white/5',
        border: isSelected ? 'border-teal-500/50' : 'border-white/10',
        icon: isSelected ? 'bg-teal-500/20 text-teal-400' : 'bg-white/10 text-gray-400'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${className}`}>
      {COMMUNICATION_STYLES.map((style) => {
        const isSelected = value === style.value;
        const colors = getColorClasses(style.color, isSelected);
        
        return (
          <motion.button
            key={style.value}
            type="button"
            onClick={() => onChange(style.value)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative p-4 rounded-xl border transition-all text-left ${
              isSelected
                ? `bg-gradient-to-br ${colors.bg} ${colors.border} shadow-lg`
                : `${colors.bg} ${colors.border} hover:bg-white/10 hover:border-white/20`
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`p-2 rounded-lg ${colors.icon}`}>
                {style.icon}
              </div>
              
              <div className="flex-1">
                <h4 className={`font-semibold mb-1 ${
                  isSelected ? 'text-white' : 'text-gray-200'
                }`}>
                  {style.label}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {style.description}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1.5 mt-3">
              {style.traits.map((trait, index) => (
                <span
                  key={index}
                  className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                    isSelected
                      ? 'bg-white/10 text-gray-300'
                      : 'bg-white/5 text-gray-500'
                  }`}
                >
                  {trait}
                </span>
              ))}
            </div>
            
            {isSelected && (
              <motion.div
                layoutId="style-selector"
                className={`absolute inset-0 border-2 ${colors.border} rounded-xl pointer-events-none`}
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}