"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, CheckCircle, Star, Coins, AlertCircle, CreditCard, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SessionDurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDuration: (duration: 15 | 20 | 25 | 30 | 60) => void;
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
  const [selectedDuration, setSelectedDuration] = useState<15 | 20 | 25 | 30 | 60 | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  // Fetch user credit status
  const { data: creditStatus, isLoading: creditsLoading, error: creditsError } = useQuery({
    queryKey: ['userCredits'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user/credits', {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        if (!response.ok) {
          // Check specific error codes
          if (response.status === 401) {
            throw new Error('Please sign in to view your credits');
          } else if (response.status === 503) {
            throw new Error('Credit service temporarily unavailable');
          }
          
          // For other errors, try to parse error message
          try {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to load credits');
          } catch {
            throw new Error('Failed to load credits');
          }
        }
        
        return response.json();
      } catch (error) {
        // Handle network errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.error('Credit API request timed out');
            throw new Error('Request timed out. Please check your connection.');
          }
          throw error;
        }
        throw new Error('Network error. Please check your connection.');
      }
    },
    enabled: isOpen,
    refetchInterval: 30000, // Refresh every 30 seconds while modal is open
    retry: 3, // Retry up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleContinue = () => {
    if (!selectedDuration) {
      toast.error('Please select a session duration');
      return;
    }
    
    // Check if user has credits for selected duration
    const durationInfo = creditStatus?.durationStatus?.find(
      (d: any) => d.duration === selectedDuration
    );
    
    if (durationInfo && !durationInfo.canAfford) {
      setShowUpgradePrompt(true);
      toast.error(`You need ${selectedDuration} credits but only have ${creditStatus?.credits?.remaining || 0} remaining`);
      return;
    }
    
    onSelectDuration(selectedDuration);
  };
  
  // Auto-select the longest affordable duration
  useEffect(() => {
    if (creditStatus?.durationStatus && !selectedDuration) {
      // Find the recommended duration they can afford, or the longest they can afford
      const affordableDurations = creditStatus.durationStatus
        .filter((d: any) => d.canAfford)
        .sort((a: any, b: any) => b.duration - a.duration);
      
      if (affordableDurations.length > 0) {
        // Try to select 20 minutes if affordable, otherwise the longest available
        const recommended = affordableDurations.find((d: any) => d.duration === 20);
        setSelectedDuration(recommended ? 20 : affordableDurations[0].duration);
      }
    }
  }, [creditStatus, selectedDuration]);

  const durationOptions: Array<{
    duration: 15 | 20 | 25 | 30 | 60;
    title: string;
    description: string;
    features: string[];
    recommended: boolean;
    futurePrice: string;
  }> = [
    {
      duration: 15,
      title: "Quick Check-In",
      description: "Brief touchpoint for immediate support",
      features: [
        "Perfect for crisis moments",
        "Quick emotional support",
        "Brief progress check",
        "Maintenance sessions",
      ],
      recommended: false,
      futurePrice: "0.5 Token",
    },
    {
      duration: 20,
      title: "Essential Session",
      description: "Balanced session for meaningful progress",
      features: [
        "Ideal for regular therapy",
        "Sufficient time for exploration",
        "Good for relationship work",
        "Most popular session length",
      ],
      recommended: true,
      futurePrice: "0.7 Token",
    },
    {
      duration: 25,
      title: "Growth Session",
      description: "Extended session for deeper exploration",
      features: [
        "Perfect for Growth tier subscribers",
        "Extra time for complex topics",
        "Balanced depth and efficiency",
        "Optimal therapeutic progress",
      ],
      recommended: false,
      futurePrice: "0.85 Token",
    },
    {
      duration: 30,
      title: "Focused Session",
      description: "Extended time for targeted work",
      features: [
        "Ideal for complex issues",
        "Multiple topic coverage",
        "In-depth conversation",
        "Flexible session flow",
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
      recommended: false,
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
                  
                  {/* Credit Display */}
                  {creditStatus && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-400/30">
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-white">
                        {creditStatus.credits.isUnlimited ? (
                          <>Unlimited Credits</>  
                        ) : (
                          <>{creditStatus.credits.remaining} minutes available</>
                        )}
                      </span>
                      {creditStatus.lowCreditWarning && !creditStatus.credits.isUnlimited && (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                  )}
                  
                  {creditsLoading && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5">
                      <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                      <span className="text-sm text-gray-400">Loading credits...</span>
                    </div>
                  )}
                  
                  {creditsError && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full border border-red-400/30">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-300">
                        {creditsError instanceof Error ? creditsError.message : 'Failed to load credits'}
                      </span>
                      <button
                        onClick={() => window.location.reload()}
                        className="ml-2 text-xs text-red-400 hover:text-red-300 underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  
                  {creditStatus?.noCreditWarning && (
                    <div className="mt-2 text-xs text-yellow-400 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Low credits - consider upgrading your plan
                    </div>
                  )}
                </div>
              </div>

              {/* Duration Options */}
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto overflow-x-hidden">
                <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  {durationOptions.map((option) => {
                    // Check if user can afford this duration
                    const durationInfo = creditStatus?.durationStatus?.find(
                      (d: any) => d.duration === option.duration
                    );
                    const canAfford = durationInfo?.canAfford ?? true; // Default to true if loading
                    const isDisabled = !canAfford && !creditStatus?.credits?.isUnlimited;
                    
                    return (
                    <motion.div
                      key={option.duration}
                      whileHover={!isDisabled ? { scale: 1.01 } : {}}
                      whileTap={!isDisabled ? { scale: 0.99 } : {}}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                        isDisabled
                          ? "border-red-500/30 bg-red-900/10 cursor-not-allowed opacity-60"
                          : selectedDuration === option.duration
                          ? "border-green-400/60 bg-green-600/20 shadow-lg cursor-pointer"
                          : "border-gray-600/40 bg-gray-800/60 hover:border-gray-500/60 cursor-pointer"
                      }`}
                      onClick={() => {
                        if (isDisabled) {
                          toast.error(`Insufficient credits. You need ${option.duration} minutes but only have ${creditStatus?.credits?.remaining || 0} available.`);
                          setShowUpgradePrompt(true);
                        } else {
                          setSelectedDuration(option.duration);
                        }
                      }}
                    >
                      {/* Insufficient Credits Badge */}
                      {isDisabled && (
                        <div className="absolute -top-2 right-4">
                          <div className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full shadow-md">
                            <AlertCircle className="w-3 h-3" />
                            <span>Insufficient Credits</span>
                          </div>
                        </div>
                      )}
                      
                      {option.recommended && !isDisabled && (
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
                            {canAfford ? 'Credits required:' : 'Credits needed:'}
                          </span>
                          <div className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className={`text-base sm:text-lg font-semibold ${
                              canAfford ? 'text-white' : 'text-red-400'
                            }`}>
                              {option.duration} min
                            </span>
                          </div>
                        </div>
                        {durationInfo && !creditStatus?.credits?.isUnlimited && (
                          <p className={`text-xs mt-1 ${
                            canAfford ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {canAfford 
                              ? `${durationInfo.creditsAfterSession} min remaining after`
                              : `Need ${option.duration - (creditStatus?.credits?.remaining || 0)} more minutes`
                            }
                          </p>
                        )}
                      </div>
                    </motion.div>
                    );
                  })}
                </div>

                {/* Upgrade Prompt for Insufficient Credits */}
                {showUpgradePrompt && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-red-900/30 to-orange-900/30 rounded-xl p-4 mb-4 border border-red-500/30"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">Insufficient Credits</h4>
                        <p className="text-sm text-gray-300 mb-3">
                          You don't have enough credits for this session duration.
                          {creditStatus?.credits?.remaining > 0 && (
                            <> You have {creditStatus.credits.remaining} minutes available.</>
                          )}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => {
                              // Navigate to upgrade page
                              window.location.href = '/dashboard/subscription';
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all"
                          >
                            <TrendingUp className="w-4 h-4" />
                            Upgrade Plan
                          </button>
                          {creditStatus?.credits?.remaining >= 15 && (
                            <button
                              onClick={() => {
                                // Find the longest affordable duration
                                const affordableDuration = creditStatus.durationStatus
                                  .filter((d: any) => d.canAfford)
                                  .sort((a: any, b: any) => b.duration - a.duration)[0];
                                if (affordableDuration) {
                                  setSelectedDuration(affordableDuration.duration);
                                  setShowUpgradePrompt(false);
                                  toast.success(`Selected ${affordableDuration.duration}-minute session`);
                                }
                              }}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                            >
                              <Clock className="w-4 h-4" />
                              Use Available Credits
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

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
                    disabled={isLoading || !selectedDuration || creditsLoading}
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
