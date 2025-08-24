"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PreSessionWarmupProps {
  onBeginSession: () => void;
}

const preparationTips = [
  {
    title: "Find Your Space",
    content:
      "Choose a quiet, comfortable area where you won't be interrupted. This is your safe space for healing.",
    icon: "🏠",
  },
  {
    title: "Set Your Intention",
    content:
      "Take a moment to think about what you'd like to explore or achieve in today's session.",
    icon: "💭",
  },
  {
    title: "Breathe & Center",
    content:
      "Take a few deep breaths to ground yourself. You're in control of this journey.",
    icon: "🧘",
  },
  {
    title: "Open Your Heart",
    content:
      "Come with an open mind and heart. Growth happens when we're willing to be vulnerable.",
    icon: "❤️",
  },
];

const therapyVideos = [
  {
    title: "Breathing Exercises",
    duration: "10:33",
    videoId: "LiUnFJ8P4gM",
    description: "Calm your mind with guided breathing techniques",
  },
  {
    title: "5-Minute Meditation",
    duration: "5:16",
    videoId: "inpok4MKVLM",
    description: "Quick meditation to center yourself before therapy",
  },
  {
    title: "Facing Your Fears",
    duration: "18:12",
    videoId: "jryCoo0BrRk",
    description: "Build courage and resilience for your journey",
  },
];

export default function PreSessionWarmup({
  onBeginSession,
}: PreSessionWarmupProps) {
  const [currentTip, setCurrentTip] = useState(0);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">(
    "inhale"
  );
  const [loadingVideos, setLoadingVideos] = useState<{
    [key: number]: boolean;
  }>({
    0: true,
    1: true,
    2: true,
  });

  // Rotate through tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % preparationTips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Breathing animation cycle
  useEffect(() => {
    const breathingCycle = () => {
      // Inhale for 4 seconds
      setBreathPhase("inhale");
      setTimeout(() => {
        // Hold for 4 seconds
        setBreathPhase("hold");
        setTimeout(() => {
          // Exhale for 6 seconds
          setBreathPhase("exhale");
          setTimeout(breathingCycle, 6000);
        }, 4000);
      }, 4000);
    };

    breathingCycle();
    return () => {
      // Cleanup timeouts if needed
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-sky-50 relative overflow-hidden">
      {/* Ambient background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-10 md:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent mb-3 sm:mb-4 leading-tight sm:leading-tight md:leading-tight">
            Prepare Your Mind & Heart
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4 sm:px-6 md:px-0 leading-relaxed">
            Take a moment to center yourself before beginning your therapeutic
            journey
          </p>
        </motion.div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left side - Breathing exercise */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8"
          >
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6 text-center">
              Breathing Exercise
            </h2>

            {/* Breathing circle */}
            <div className="flex justify-center items-center h-64 relative">
              <motion.div
                className="absolute w-32 h-32 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full opacity-20"
                animate={{
                  scale:
                    breathPhase === "inhale"
                      ? 2
                      : breathPhase === "hold"
                        ? 2
                        : 1,
                }}
                transition={{
                  duration:
                    breathPhase === "inhale"
                      ? 4
                      : breathPhase === "exhale"
                        ? 6
                        : 0,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="w-24 h-24 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium"
                animate={{
                  scale:
                    breathPhase === "inhale"
                      ? 1.3
                      : breathPhase === "hold"
                        ? 1.3
                        : 1,
                }}
                transition={{
                  duration:
                    breathPhase === "inhale"
                      ? 4
                      : breathPhase === "exhale"
                        ? 6
                        : 0,
                  ease: "easeInOut",
                }}
              >
                <span className="text-sm">
                  {breathPhase === "inhale"
                    ? "Inhale"
                    : breathPhase === "hold"
                      ? "Hold"
                      : "Exhale"}
                </span>
              </motion.div>
            </div>

            <p className="text-center text-gray-600 mt-6">
              Follow the circle to regulate your breathing and calm your mind
            </p>
          </motion.div>

          {/* Right side - Tips carousel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8"
          >
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6 text-center">
              Preparation Tips
            </h2>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentTip}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">
                  {preparationTips[currentTip].icon}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
                  {preparationTips[currentTip].title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 px-2 sm:px-0">
                  {preparationTips[currentTip].content}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Tip indicators */}
            <div className="flex justify-center mt-6 space-x-2">
              {preparationTips.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTip(index)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer hover:scale-110 ${
                    index === currentTip
                      ? "bg-blue-500 w-8"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Video resources section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 sm:mt-10 md:mt-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8"
        >
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6 text-center">
            Guided Video Exercises
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {therapyVideos.map((video, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className="aspect-video relative overflow-hidden bg-gray-900">
                  {/* Loading state */}
                  {loadingVideos[index] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-sky-100">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">
                          Loading video...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* YouTube iframe embed */}
                  <iframe
                    src={`https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1&color=white&iv_load_policy=3`}
                    title={video.title}
                    className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
                      loadingVideos[index] ? "opacity-0" : "opacity-100"
                    }`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => {
                      setLoadingVideos((prev) => ({ ...prev, [index]: false }));
                    }}
                  />
                </div>
                <div className="p-5 bg-gradient-to-b from-white to-gray-50">
                  <h3 className="font-semibold text-gray-800 mb-2 text-base sm:text-lg">
                    {video.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">
                    {video.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full font-medium">
                      {video.duration}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Watch now
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Begin session button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <button
            onClick={onBeginSession}
            className="group relative inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full hover:from-blue-700 hover:to-blue-600 transform hover:scale-105 shadow-xl cursor-pointer"
          >
            <span className="relative">Click to Begin Session</span>
            <svg
              className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <p className="mt-4 text-gray-600 text-xs sm:text-sm px-4 sm:px-0">
            When you're ready, click above to choose your therapist and begin
            your session
          </p>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
