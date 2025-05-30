"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Suspense,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/glass-card";
// Global animation cache for better performance
const animationCache = new Map<string, any>();

// Preload animations to improve performance
const preloadAnimations = async () => {
  const urls = [
    "/animations/solo-therapy.json",
    "/animations/couples-therapy.json",
    "/animations/family-therapy.json",
  ];

  await Promise.allSettled(
    urls.map(async (url) => {
      if (!animationCache.has(url)) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            animationCache.set(url, data);
          }
        } catch (error) {
          console.warn(`Failed to preload animation: ${url}`, error);
        }
      }
    })
  );
};

// Custom hook for reduced motion preference
const useReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
};

// Custom hook for device capabilities
const useDeviceCapabilities = () => {
  return useMemo(() => {
    const isMobile =
      typeof window !== "undefined" ? window.innerWidth < 768 : false;
    const isLowEnd =
      typeof navigator !== "undefined"
        ? navigator.hardwareConcurrency <= 4
        : false;

    return { isMobile, isLowEnd };
  }, []);
};

// Optimized particle configuration generator
const generateParticleConfigs = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    initialX: Math.random() * 100,
    initialY: Math.random() * 100,
    targetX: Math.random() * 100,
    targetY: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 2,
  }));
};

// Animation skeleton component
const AnimationSkeleton = React.memo(() => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
  </div>
));

// LottieAnimation component with error handling
interface LottieAnimationProps {
  url: string;
  title: string;
}

const LottieAnimation = React.memo(({ url, title }: LottieAnimationProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    const loadAnimation = async () => {
      try {
        // Check cache first
        const cachedData = animationCache.get(url);
        if (cachedData) {
          setAnimationData(cachedData);
          setIsLoading(false);
          return;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load animation: ${response.status}`);
        }
        const data = await response.json();

        // Cache the loaded animation
        animationCache.set(url, data);
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

  const handleComplete = useCallback(() => {
    // Animation completed
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

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
          rendererSettings={{
            preserveAspectRatio: "xMidYMid meet",
            progressiveLoad: true,
            hideOnTransparent: true,
          }}
        />
      )}
    </div>
  );
});

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

// Optimized particle component with therapy-specific colors
const ParticleField = React.memo(
  ({
    particleCount,
    gradientConfig,
  }: {
    particleCount: number;
    gradientConfig: { primary: string[]; secondary?: string[]; tertiary?: string[] };
  }) => {
    const particleConfigs = useMemo(
      () => generateParticleConfigs(particleCount),
      [particleCount]
    );
    const prefersReduced = useReducedMotion();

    if (prefersReduced || particleCount === 0) {
      return null;
    }

    return (
      <div className="absolute inset-0 pointer-events-none">
        {particleConfigs.map((config) => (
          <motion.div
            key={config.id}
            className="absolute rounded-full"
            style={{
              transform: "translate3d(0, 0, 0)", // Enable hardware acceleration
              backgroundColor: gradientConfig.primary[config.id % 2], // Alternate between primary colors
              filter: "blur(1px)", // Soft particle edges
              width: "2px",
              height: "2px",
            }}
            initial={{
              x: `${config.initialX}%`,
              y: `${config.initialY}%`,
              opacity: 0,
            }}
            animate={{
              x: `${config.targetX}%`,
              y: `${config.targetY}%`,
              opacity: [0, 0.2, 0.3, 0.2, 0],
            }}
            transition={{
              x: {
                duration: config.duration,
                repeat: Infinity,
                repeatType: "reverse",
                delay: config.delay,
                ease: "easeInOut",
              },
              y: {
                duration: config.duration,
                repeat: Infinity,
                repeatType: "reverse",
                delay: config.delay,
                ease: "easeInOut",
              },
              opacity: {
                duration: config.duration * 0.8,
                repeat: Infinity,
                delay: config.delay,
                ease: "easeInOut",
              },
            }}
          />
        ))}
      </div>
    );
  }
);

export default function IntroWelcomeScreen() {
  const router = useRouter();
  // Removed useAuth destructuring since update doesn't exist
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Performance optimizations
  const { isMobile, isLowEnd } = useDeviceCapabilities();
  const prefersReduced = useReducedMotion();

  // Calculate optimal particle count based on device capabilities
  const particleCount = useMemo(() => {
    if (prefersReduced) return 0;
    if (isLowEnd && isMobile) return 5;
    if (isMobile) return 10;
    if (isLowEnd) return 15;
    return 30;
  }, [prefersReduced, isLowEnd, isMobile]);

  // Preload animations on component mount
  useEffect(() => {
    preloadAnimations();
  }, []);

  // Handle scroll to top when step changes - immediate and reliable
  useEffect(() => {
    console.log('IntroWelcomeScreen: Step changed to', currentStep, '- scrolling to top');
    console.log('Current scroll position before step change:', window.scrollY);
    
    // Scroll immediately on any step change, including the very first one
    const scrollTimer = setTimeout(() => {
      // Multiple methods for reliable scrolling
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Verify scroll worked
      requestAnimationFrame(() => {
        console.log('IntroWelcomeScreen: Scroll position after step change:', window.scrollY);
      });
    }, 50); // Small delay to ensure DOM updates, then instant scroll

    return () => clearTimeout(scrollTimer);
  }, [currentStep]);

  // Scroll to top when component mounts (user navigated to this page)
  useEffect(() => {
    console.log('IntroWelcomeScreen: Attempting scroll to top on mount');
    console.log('Current scroll position before:', window.scrollY);
    
    // Multiple fallback approaches for reliable scroll-to-top
    const scrollToTop = () => {
      // Method 1: Try with instant behavior
      window.scrollTo({ top: 0, behavior: 'instant' });
      
      // Method 2: Direct property setting as fallback
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Method 3: Force scroll on next frame if still not at top
      requestAnimationFrame(() => {
        if (window.scrollY > 0) {
          console.log('IntroWelcomeScreen: First scroll attempt failed, trying again');
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }
        console.log('IntroWelcomeScreen: Final scroll position:', window.scrollY);
      });
    };
    
    // Execute immediately
    scrollToTop();
    
    // Also try after a small delay in case DOM is still updating
    const timeoutId = setTimeout(scrollToTop, 10);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < therapySteps.length - 1) {
      // Immediate scroll to top when navigating
      console.log('IntroWelcomeScreen: handleNext - scrolling to top');
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      // Immediate scroll to top when navigating
      console.log('IntroWelcomeScreen: handlePrevious - scrolling to top');
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleGetStarted = useCallback(async () => {
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

      // Navigate immediately - welcome page will handle scroll on mount
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
  }, [router]);

  const currentTherapy = therapySteps[currentStep];

  // Enhanced gradient mapping for smooth background transitions
  const gradientMap = useMemo(
    () => ({
      "from-purple-600 to-pink-600": {
        primary: ["#9333ea", "#ec4899"], // purple-600 to pink-600
        secondary: ["#a855f7", "#f472b6"], // lighter shades for variation
        tertiary: ["#7c3aed", "#d946ef"], // darker shades for depth
      },
      "from-blue-600 to-cyan-600": {
        primary: ["#2563eb", "#0891b2"], // blue-600 to cyan-600
        secondary: ["#3b82f6", "#06b6d4"], // lighter shades for variation
        tertiary: ["#1d4ed8", "#0e7490"], // darker shades for depth
      },
      "from-green-600 to-teal-600": {
        primary: ["#16a34a", "#0d9488"], // green-600 to teal-600
        secondary: ["#22c55e", "#14b8a6"], // lighter shades for variation
        tertiary: ["#15803d", "#0f766e"], // darker shades for depth
      },
    }),
    []
  );

  // Get current therapy gradient configuration
  const currentGradientConfig = useMemo(
    () =>
      gradientMap[currentTherapy.gradient as keyof typeof gradientMap] ||
      gradientMap["from-blue-600 to-cyan-600"],
    [currentTherapy.gradient, gradientMap]
  );

  // Optimized motion variants with hardware acceleration
  const contentVariants = useMemo(
    () => ({
      initial: {
        opacity: 0,
        x: 100,
      },
      animate: {
        opacity: 1,
        x: 0,
      },
      exit: {
        opacity: 0,
        x: -100,
      },
    }),
    []
  );

  const fadeInUpVariants = useMemo(
    () => ({
      initial: {
        opacity: 0,
        y: 20,
      },
      animate: {
        opacity: 1,
        y: 0,
      },
    }),
    []
  );

  const scaleVariants = useMemo(
    () => ({
      initial: {
        opacity: 0,
        scale: 0.8,
      },
      animate: {
        opacity: 1,
        scale: 1,
      },
    }),
    []
  );

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Enhanced animated background gradient with smooth transitions */}
      <motion.div
        className="absolute inset-0 transition-all duration-1000 ease-in-out"
        style={{ 
          transform: "translate3d(0, 0, 0)", // Hardware acceleration
          background: `linear-gradient(135deg, ${currentGradientConfig.primary[0]} 0%, ${currentGradientConfig.primary[1]} 100%)`,
          opacity: 0.25,
          '--color-primary-1': currentGradientConfig.primary[0],
          '--color-primary-2': currentGradientConfig.primary[1],
          '--color-secondary-1': currentGradientConfig.secondary?.[0] || currentGradientConfig.primary[0],
          '--color-secondary-2': currentGradientConfig.secondary?.[1] || currentGradientConfig.primary[1],
        } as React.CSSProperties}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.25 }}
        transition={{ duration: 0.5 }}
      >
        {/* Primary gradient layer with smooth color interpolation */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${currentGradientConfig.primary[0]}40 0%, transparent 70%)`,
            transform: "translate3d(0, 0, 0)",
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Secondary gradient layer for depth */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 30% 70%, ${currentGradientConfig.primary[1]}30 0%, transparent 60%)`,
            transform: "translate3d(0, 0, 0)",
          }}
          animate={{
            scale: [1.2, 0.8, 1.2],
            opacity: [0.4, 0.2, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        
        {/* Tertiary gradient layer for movement */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 70% 30%, ${currentGradientConfig.primary[0]}25 0%, transparent 50%)`,
            transform: "translate3d(0, 0, 0)",
          }}
          animate={{
            scale: [0.9, 1.3, 0.9],
            opacity: [0.3, 0.5, 0.3],
            x: ["0%", "10%", "0%"],
            y: ["0%", "-10%", "0%"],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        
        {/* Noise overlay to smooth gradients */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            transform: "translate3d(0, 0, 0)",
          }}
        />
        
        {/* Subtle blur overlay to smooth any hard edges */}
        <div 
          className="absolute inset-0"
          style={{
            backdropFilter: "blur(1px)",
            transform: "translate3d(0, 0, 0)",
          }}
        />
        
        {/* CSS-based gradient animation layer for ultra-smooth transitions */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(
                circle at 20% 80%,
                ${currentGradientConfig.primary[0]}15 0%,
                transparent 50%
              ),
              radial-gradient(
                circle at 80% 20%,
                ${currentGradientConfig.primary[1]}15 0%,
                transparent 50%
              ),
              radial-gradient(
                circle at 40% 40%,
                ${currentGradientConfig.secondary?.[0] || currentGradientConfig.primary[0]}10 0%,
                transparent 50%
              )
            `,
            transform: "translate3d(0, 0, 0)",
            animation: "gradientShift 20s ease-in-out infinite",
          }}
        />
      </motion.div>
      
      {/* CSS Keyframes for smooth gradient animation */}
      <style jsx>{`
        @keyframes gradientShift {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
          }
          25% {
            transform: translate3d(-5%, 5%, 0) scale(1.1) rotate(90deg);
          }
          50% {
            transform: translate3d(5%, -5%, 0) scale(0.9) rotate(180deg);
          }
          75% {
            transform: translate3d(-5%, -5%, 0) scale(1.05) rotate(270deg);
          }
        }
      `}</style>

      {/* Optimized particle system with therapy-specific colors */}
      <ParticleField
        particleCount={particleCount}
        gradientConfig={currentGradientConfig}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          {/* Header - hidden on mobile */}
          <motion.div
            variants={fadeInUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="hidden md:block text-center mb-4"
            style={{ transform: "translate3d(0, 0, 0)" }}
          >
            <h1 className="text-5xl font-bold text-white">
              Welcome to TherapyAI
            </h1>
          </motion.div>

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
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ transform: "translate3d(0, 0, 0)" }}
            >
              <GlassCard className="p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  {/* Content */}
                  <div className="order-1 space-y-6">
                    {/* Title and Subtitle */}
                    <div className="text-center md:text-left">
                      <h2 className="text-3xl font-bold text-sky-100 mb-2">
                        {currentTherapy.title}
                      </h2>
                      <p className="text-lg text-yellow-300">
                        {currentTherapy.subtitle}
                      </p>
                    </div>

                    {/* Mobile Lottie Animation - positioned between subtitle and techniques */}
                    <div className="md:hidden">
                      <motion.div
                        variants={scaleVariants}
                        initial="initial"
                        animate="animate"
                        transition={{
                          delay: 0.2,
                          duration: 0.5,
                          ease: "easeOut",
                        }}
                        className="w-full h-64 max-w-sm mx-auto flex items-center justify-center overflow-visible"
                        style={{ transform: "translate3d(0, 0, 0)" }}
                      >
                        <div className="w-full h-full max-w-full">
                          <Suspense fallback={<AnimationSkeleton />}>
                            <LottieAnimation
                              url={currentTherapy.lottieUrl}
                              title={currentTherapy.title}
                            />
                          </Suspense>
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
                            whileHover={{
                              scale: 1.05,
                              background:
                                "linear-gradient(45deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3))",
                            }}
                            transition={{
                              delay: 0.5 + index * 0.05,
                              hover: { duration: 0.2 },
                            }}
                            className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/80 border border-white/20 cursor-default"
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
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-300 flex items-center justify-center mt-0.5">
                            <motion.svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              animate={{
                                color: [
                                  currentGradientConfig.primary[0],
                                  currentGradientConfig.primary[1],
                                  currentGradientConfig.primary[0],
                                ],
                              }}
                              transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: [0.4, 0.0, 0.2, 1],
                              }}
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </motion.svg>
                          </div>
                          <p className="text-white/90">{point}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop Lottie Animation */}
                  <div className="order-2 hidden md:block">
                    <motion.div
                      variants={scaleVariants}
                      initial="initial"
                      animate="animate"
                      transition={{
                        delay: 0.2,
                        duration: 0.5,
                        ease: "easeOut",
                      }}
                      className="w-full h-[28rem] flex items-center justify-center overflow-visible"
                      style={{ transform: "translate3d(0, 0, 0)" }}
                    >
                      <div className="w-full h-full max-w-full">
                        <Suspense fallback={<AnimationSkeleton />}>
                          <LottieAnimation
                            url={currentTherapy.lottieUrl}
                            title={currentTherapy.title}
                          />
                        </Suspense>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between items-center mt-6 xs:mt-8 gap-1 xs:gap-2 sm:gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05, transition: { duration: 0.1 } }}
                    whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    style={{ transform: "translate3d(0, 0, 0)" }}
                    className={`px-2 xs:px-3 sm:px-4 md:px-6 py-1.5 xs:py-2 sm:py-2.5 md:py-3 rounded-lg xs:rounded-xl font-medium transition-all text-xs xs:text-sm sm:text-base ${
                      currentStep === 0
                        ? "bg-white/5 text-white/30 cursor-not-allowed"
                        : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20 cursor-pointer"
                    }`}
                  >
                    Previous
                  </motion.button>

                  {currentStep === therapySteps.length - 1 ? (
                    <motion.button
                      whileHover={{
                        scale: 1.08,
                        boxShadow: [
                          "0 0 20px rgba(59, 130, 246, 0.3)",
                          "0 0 30px rgba(139, 92, 246, 0.4)",
                          "0 0 40px rgba(6, 182, 212, 0.3)",
                        ],
                        transition: {
                          duration: 0.3,
                          ease: [0.4, 0.0, 0.2, 1],
                        },
                      }}
                      whileTap={{
                        scale: 0.96,
                        transition: { duration: 0.1 },
                      }}
                      onClick={handleGetStarted}
                      disabled={isLoading}
                      className="px-2 xs:px-3 sm:px-4 md:px-6 py-1.5 xs:py-2 sm:py-2.5 md:py-3 text-white rounded-lg xs:rounded-xl font-medium transition-all text-xs xs:text-sm sm:text-base relative overflow-hidden group shadow-lg cursor-pointer"
                      style={{ transform: "translate3d(0, 0, 0)" }}
                      animate={{
                        background: [
                          "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)",
                          "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #6366f1 100%)",
                          "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #8b5cf6 100%)",
                          "linear-gradient(135deg, #0ea5e9 0%, #14b8a6 50%, #0ea5e9 100%)",
                          "linear-gradient(135deg, #06b6d4 0%, #10b981 50%, #06b6d4 100%)",
                          "linear-gradient(135deg, #059669 0%, #0d9488 50%, #059669 100%)",
                          "linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #10b981 100%)",
                          "linear-gradient(135deg, #0891b2 0%, #3b82f6 50%, #0891b2 100%)",
                        ],
                        backgroundSize: ["200% 200%", "200% 200%"],
                        backgroundPosition: ["0% 50%", "100% 50%"],
                      }}
                      transition={{
                        background: {
                          duration: 8,
                          repeat: Infinity,
                          ease: [0.4, 0.0, 0.2, 1],
                        },
                        backgroundPosition: {
                          duration: 4,
                          repeat: Infinity,
                          ease: [0.4, 0.0, 0.2, 1],
                        },
                      }}
                    >
                      {/* Enhanced shimmer overlay */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100"
                        initial={{ x: "-100%" }}
                        whileHover={{
                          x: "100%",
                          transition: {
                            duration: 0.6,
                            ease: [0.4, 0.0, 0.2, 1],
                          },
                        }}
                      />

                      {/* Continuous subtle shimmer */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={{
                          x: ["-100%", "200%"],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                      />

                      <span className="relative z-10">
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
                      </span>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{
                        scale: 1.05,
                        transition: { duration: 0.1 },
                      }}
                      whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                      onClick={handleNext}
                      style={{ transform: "translate3d(0, 0, 0)" }}
                      className="px-2 xs:px-3 sm:px-4 md:px-6 py-1.5 xs:py-2 sm:py-2.5 md:py-3 bg-white/10 text-white rounded-lg xs:rounded-xl font-medium hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all text-xs xs:text-sm sm:text-base cursor-pointer"
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
            variants={fadeInUpVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 1, duration: 0.5 }}
            className="text-center mt-6"
            style={{ transform: "translate3d(0, 0, 0)" }}
          >
            <button
              onClick={handleGetStarted}
              className="text-white/50 hover:text-white/70 text-sm transition-colors cursor-pointer"
            >
              Skip Introduction →
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
