"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/glass-card";
// LottieAnimation component with error handling
interface LottieAnimationProps {
  url: string;
  title: string;
}

function LottieAnimation({ url, title }: LottieAnimationProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load animation: ${response.status}`);
        }
        const data = await response.json();
        setAnimationData(data);
        setIsLoading(false);
      } catch (error) {
        console.error(`Error loading Lottie animation for ${title}:`, error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadAnimation();
  }, [url, title]);

  const handleComplete = () => {
    // Animation completed
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            {title.includes("Individual") ? (
              <svg
                className="w-16 h-16 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            ) : title.includes("Couples") ? (
              <svg
                className="w-16 h-16 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-16 h-16 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            )}
          </div>
          <p className="text-white/60 text-sm">{title}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
            <p className="text-white/60 text-xs">Loading...</p>
          </div>
        </div>
      )}

      {animationData && (
        <Lottie
          animationData={animationData}
          loop
          autoplay
          style={{ width: "100%", height: "100%" }}
          onComplete={handleComplete}
          className={`w-full h-full ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        />
      )}
    </div>
  );
}

interface TherapyStep {
  id: number;
  title: string;
  subtitle: string;
  description: string[];
  techniques: string[];
  lottieUrl: string;
  gradient: string;
}

// Using reliable, working Lottie JSON animations
const therapySteps: TherapyStep[] = [
  {
    id: 1,
    title: "Individual Therapy",
    subtitle: "Your Personal Mental Health Journey",
    description: [
      "Work one-on-one with Dr. Elliot Mackaphy, your AI therapist specializing in CBT and mindfulness",
      "Address anxiety, depression, stress, and personal challenges",
      "Develop coping strategies and build emotional resilience",
    ],
    techniques: [
      "Cognitive Behavioral Therapy (CBT)",
      "Acceptance & Commitment Therapy (ACT)",
      "Mindfulness-Based Stress Reduction",
      "Values Clarification",
    ],
    lottieUrl: "/animations/solo-therapy.json",
    gradient: "from-purple-600 to-pink-600",
  },
  {
    id: 2,
    title: "Couples Therapy",
    subtitle: "Heal and Strengthen Your Relationship",
    description: [
      "Join Dr. Maya Thompson for evidence-based couples counseling",
      "Learn to identify and break destructive patterns",
      "Build deeper emotional bonds and secure attachment",
    ],
    techniques: [
      "Gottman Method",
      "Emotionally Focused Therapy (EFT)",
      "Conflict Resolution",
      "Building Love Maps",
    ],
    lottieUrl: "/animations/couples-therapy.json",
    gradient: "from-blue-600 to-cyan-600",
  },
  {
    id: 3,
    title: "Family Therapy",
    subtitle: "Unite Your Family Through Understanding",
    description: [
      "Work with Dr. Jada Pearson to strengthen family bonds",
      "Support up to 7 family members in collaborative sessions",
      "Each member gets equal time to share their perspective",
    ],
    techniques: [
      "Structural Family Therapy",
      "Narrative Therapy",
      "Systems-Based Approach",
      "Circular Questioning",
    ],
    lottieUrl: "/animations/family-therapy.json", // Local animation for family therapy
    gradient: "from-green-600 to-teal-600",
  },
];

export default function IntroWelcomeScreen() {
  const router = useRouter();
  // Removed useAuth destructuring since update doesn't exist
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (currentStep < therapySteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGetStarted = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Update user to mark intro as seen
      const response = await fetch("/api/user/intro-seen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Failed to update intro status:", response.status);
        setError("Continuing to onboarding...");
      }

      // Navigate to onboarding
      router.push("/welcome");
    } catch (error) {
      console.error("Error updating intro status:", error);
      setError("Continuing to onboarding...");
      // Continue anyway after a short delay
      setTimeout(() => {
        router.push("/welcome");
      }, 1000);
    } finally {
      // Don't set loading to false here since we're navigating away
    }
  };

  const currentTherapy = therapySteps[currentStep];

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Animated background gradient */}
      <motion.div
        className={`absolute inset-0 opacity-30 bg-gradient-to-br ${currentTherapy.gradient}`}
        animate={{
          background: `linear-gradient(135deg, ${currentTherapy.gradient})`,
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Particle effect - reduced for mobile performance */}
      <div className="absolute inset-0 hidden md:block">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-20"
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
            }}
            animate={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        ))}
      </div>

      {/* Simplified mobile background */}
      <div className="absolute inset-0 md:hidden">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-10"
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
            }}
            animate={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
            }}
            transition={{
              duration: Math.random() * 30 + 20,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          {/* Header - hidden on mobile */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden md:block text-center mb-8"
          >
            <h1 className="text-5xl font-bold text-white mb-4">
              Welcome to TherapyAI
            </h1>
          </motion.div>

          {/* Progress indicators - hidden on mobile */}
          <div className="hidden md:flex justify-center mb-8 space-x-2">
            {therapySteps.map((_, index) => (
              <motion.div
                key={index}
                className={`h-2 w-16 rounded-full transition-colors cursor-pointer ${
                  index === currentStep ? "bg-white" : "bg-white/30"
                }`}
                whileHover={{ scale: 1.1 }}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-center"
            >
              <p className="text-yellow-400 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Main content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  {/* Content */}
                  <div className="order-1 space-y-6">
                    {/* Title and Subtitle */}
                    <div className="text-center md:text-left">
                      <h2 className="text-3xl font-bold text-white mb-2">
                        {currentTherapy.title}
                      </h2>
                      <p className="text-lg text-blue-400">
                        {currentTherapy.subtitle}
                      </p>
                    </div>

                    {/* Mobile Lottie Animation - positioned between subtitle and techniques */}
                    <div className="md:hidden">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="w-full h-48 max-w-sm mx-auto flex items-center justify-center"
                      >
                        <div className="w-48 h-48 max-w-full">
                          <LottieAnimation
                            url={currentTherapy.lottieUrl}
                            title={currentTherapy.title}
                          />
                        </div>
                      </motion.div>
                    </div>

                    {/* Techniques */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Evidence-Based Techniques:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {currentTherapy.techniques.map((technique, index) => (
                          <motion.span
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + index * 0.05 }}
                            className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/80 border border-white/20"
                          >
                            {technique}
                          </motion.span>
                        ))}
                      </div>
                    </div>

                    {/* Description points */}
                    <div className="space-y-3">
                      {currentTherapy.description.map((point, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="flex items-start space-x-3"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mt-0.5">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <p className="text-white/90">{point}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop Lottie Animation */}
                  <div className="order-2 hidden md:block">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="w-full h-96 flex items-center justify-center"
                    >
                      <div className="w-full h-full max-w-md max-h-96">
                        <LottieAnimation
                          url={currentTherapy.lottieUrl}
                          title={currentTherapy.title}
                        />
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between items-center mt-8">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className={`px-6 py-3 rounded-xl font-medium transition-all ${
                      currentStep === 0
                        ? "bg-white/5 text-white/30 cursor-not-allowed"
                        : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20"
                    }`}
                  >
                    Previous
                  </motion.button>

                  {currentStep === therapySteps.length - 1 ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleGetStarted}
                      disabled={isLoading}
                      className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg"
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Getting Started...
                        </span>
                      ) : (
                        "Get Started"
                      )}
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleNext}
                      className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all"
                    >
                      Next
                    </motion.button>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </AnimatePresence>

          {/* Skip button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-6"
          >
            <button
              onClick={handleGetStarted}
              className="text-white/50 hover:text-white/70 text-sm transition-colors"
            >
              Skip Introduction →
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
