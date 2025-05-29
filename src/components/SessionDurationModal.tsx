'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, CheckCircle, Star } from 'lucide-react';
import { useState } from 'react';

interface SessionDurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDuration: (duration: 30 | 60) => void;
  therapyType?: string;
  isLoading?: boolean;
}

export default function SessionDurationModal({
  isOpen,
  onClose,
  onSelectDuration,
  therapyType = 'couple',
  isLoading = false
}: SessionDurationModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(60);

  const handleContinue = () => {
    onSelectDuration(selectedDuration);
  };

  const durationOptions = [
    {
      duration: 30,
      title: 'Focused Session',
      description: 'Perfect for check-ins and targeted work',
      features: [
        'Ideal for follow-up sessions',
        'Focus on specific issues',
        'Quick progress updates',
        'Scheduling flexibility'
      ],
      recommended: false,
      futurePrice: '$45'
    },
    {
      duration: 60,
      title: 'Deep Dive Session',
      description: 'Comprehensive therapy experience',
      features: [
        'Full therapeutic exploration',
        'Multiple topic coverage',
        'In-depth processing time',
        'Complete session closure'
      ],
      recommended: true,
      futurePrice: '$75'
    }
  ];

  const getTherapyTypeText = () => {
    switch (therapyType) {
      case 'solo':
        return 'individual therapy';
      case 'family':
        return 'family therapy';
      case 'couple':
      default:
        return 'couples therapy';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm sm:max-w-2xl lg:max-w-4xl bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200/50">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white transition-colors duration-200"
                disabled={isLoading}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  Choose Your Session Length
                </h2>
                <p className="text-gray-600 text-sm sm:text-base lg:text-lg px-2">
                  Select the duration that works best for your {getTherapyTypeText()} session
                </p>
              </div>
            </div>

            {/* Duration Options */}
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {durationOptions.map((option) => (
                  <motion.div
                    key={option.duration}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-4 sm:p-6 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedDuration === option.duration
                        ? 'border-blue-500 bg-blue-50/50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                    onClick={() => setSelectedDuration(option.duration)}
                  >
                    {option.recommended && (
                      <div className="absolute -top-2 sm:-top-3 left-3 sm:left-6">
                        <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-blue-500 text-white text-xs sm:text-sm font-medium rounded-full">
                          <Star className="w-3 h-3" />
                          <span className="hidden sm:inline">Recommended</span>
                          <span className="sm:hidden">Top</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`p-1.5 sm:p-2 rounded-lg ${
                          selectedDuration === option.duration
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                            {option.duration} Minutes
                          </h3>
                          <p className="text-blue-600 font-medium text-sm sm:text-base">
                            {option.title}
                          </p>
                        </div>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedDuration === option.duration
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedDuration === option.duration && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>

                    <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                      {option.description}
                    </p>

                    <ul className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                      {option.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="pt-3 sm:pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-gray-500">Future pricing:</span>
                        <span className="text-base sm:text-lg font-semibold text-gray-900">
                          {option.futurePrice}
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Currently free during beta
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Session Info */}
              <div className="bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
                  What to expect in your session:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                    AI-powered therapeutic guidance
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                    Natural conversation flow
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                    Session transcript provided
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                    Progress tracking
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={onClose}
                  className="w-full sm:flex-1 px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium text-sm sm:text-base"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  disabled={isLoading}
                  className="w-full sm:flex-1 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="hidden sm:inline">Starting Session...</span>
                      <span className="sm:hidden">Starting...</span>
                    </div>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Start {selectedDuration}-Minute Session</span>
                      <span className="sm:hidden">Start {selectedDuration}min Session</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}