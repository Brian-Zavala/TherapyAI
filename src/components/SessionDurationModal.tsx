"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, CheckCircle, Star, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

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
  therapyType = "couple",
  isLoading = false,
}: SessionDurationModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(60);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleContinue = () => {
    onSelectDuration(selectedDuration);
  };

  const durationOptions: Array<{
    duration: 30 | 60;
    title: string;
    description: string;
    features: string[];
    recommended: boolean;
    futurePrice: string;
  }> = [
    {
      duration: 30,
      title: "Focused Session",
      description: "Perfect for check-ins and targeted work",
      features: [
        "Ideal for follow-up sessions",
        "Focus on specific issues",
        "Quick progress updates",
        "Scheduling flexibility",
      ],
      recommended: false,
      futurePrice: "1 Token",
    },
    {
      duration: 60,
      title: "Deep Dive Session",
      description: "Comprehensive therapy experience",
      features: [
        "Full therapeutic exploration",
        "Multiple topic coverage",
        "In-depth processing time",
        "Complete session closure",
      ],
      recommended: true,
      futurePrice: "2 Tokens",
    },
  ];

  const getTherapyTypeText = () => {
    switch (therapyType) {
      case "solo":
        return "individual therapy";
      case "family":
        return "family therapy";
      case "couple":
      default:
        return "couples therapy";
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal - truly 90% viewport height with portal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 m-auto w-[90vw] h-[90vh] max-w-[600px] z-[10001] bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
              {/* Header */}
              <div className="relative px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-600/30">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/60 hover:bg-gray-700/80 transition-colors duration-200 border border-gray-600/50"
                  disabled={isLoading}
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
                </button>

                <div className="text-center">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2">
                    Choose Your Session Length
                  </h2>
                  <p className="text-gray-300 text-sm sm:text-base px-2">
                    Select the duration that works best for your{" "}
                    {getTherapyTypeText()} session
                  </p>
                </div>
              </div>

              {/* Duration Options */}
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto overflow-x-hidden">
                <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  {durationOptions.map((option) => (
                    <motion.div
                      key={option.duration}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                        selectedDuration === option.duration
                          ? "border-green-400/60 bg-green-600/20 shadow-lg"
                          : "border-gray-600/40 bg-gray-800/60 hover:border-gray-500/60"
                      }`}
                      onClick={() => setSelectedDuration(option.duration)}
                    >
                      {option.recommended && (
                        <div className="absolute -top-2 left-4">
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full shadow-md">
                            <Star className="w-3 h-3" />
                            <span>Recommended</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-2 sm:mb-3 lg:mb-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div
                            className={`p-1.5 sm:p-2 rounded-lg ${
                              selectedDuration === option.duration
                                ? "bg-green-500/20 text-green-400"
                                : "bg-gray-700/50 text-gray-400"
                            }`}
                          >
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg sm:text-xl font-semibold text-white">
                              {option.duration} Minutes
                            </h3>
                            <p className="text-green-400 font-medium text-sm sm:text-base">
                              {option.title}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedDuration === option.duration
                              ? "border-blue-400 bg-blue-500"
                              : "border-gray-500"
                          }`}
                        >
                          {selectedDuration === option.duration && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>

                      <p className="text-gray-300 mb-2 sm:mb-3 lg:mb-4 text-sm sm:text-base">
                        {option.description}
                      </p>

                      <ul className="space-y-1.5 mb-3">
                        {option.features.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-xs sm:text-sm text-gray-300"
                          >
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="pt-2 sm:pt-3 lg:pt-4 border-t border-gray-600/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-gray-400">
                            Future pricing:
                          </span>
                          <div className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className="text-base sm:text-lg font-semibold text-white">
                              {option.futurePrice}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-green-400 mt-1">
                          Currently free during beta
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Session Info */}
                <div className="bg-gradient-to-br from-gray-800/40 to-gray-700/40 rounded-xl p-3 sm:p-4 mb-4 border border-gray-600/20">
                  <h4 className="font-semibold text-white mb-2 text-sm sm:text-base">
                    What to expect in your session:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                      AI-powered therapeutic guidance
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                      Natural conversation flow
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                      Session transcript provided
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                      Progress tracking
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={onClose}
                    className="w-full sm:flex-1 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 border border-gray-500 bg-gray-700 text-gray-200 rounded-lg sm:rounded-xl lg:rounded-2xl hover:bg-gray-600 hover:border-gray-400 transition-all duration-200 font-medium text-sm sm:text-base"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleContinue}
                    disabled={isLoading}
                    className="w-full sm:flex-1 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 bg-blue-500 text-white rounded-lg sm:rounded-xl lg:rounded-2xl hover:bg-blue-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base shadow-lg shadow-blue-500/20"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="hidden sm:inline">
                          Starting Session...
                        </span>
                        <span className="sm:hidden">Starting...</span>
                      </div>
                    ) : (
                      <>
                        <span className="hidden sm:inline">
                          Start {selectedDuration}-Minute Session
                        </span>
                        <span className="sm:hidden">
                          Start {selectedDuration}min Session
                        </span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Render portal only on client side
  if (!isClient) {
    return null;
  }

  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) {
    console.error("Modal root element not found");
    return null;
  }

  return createPortal(modalContent, modalRoot);
}
