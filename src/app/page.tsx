"use client";

// React and Next.js imports
import Link from "next/link";
import { useRef, useState, useEffect, Suspense, lazy } from "react";
import dynamic from "next/dynamic";
import ImagePreloader from "@/components/ImagePreloader";

// Framer Motion imports
import {
  motion,
  useScroll,
  useTransform,
  // useMotionValueEvent, // Removing as it wasn't used in the final logic
  useAnimation,
  useInView,
  useReducedMotion,
} from "framer-motion";

// Regular imports
import ButtonWithSound from "@/components/ButtonWithSound";
import ScrollDownArrow from "@/components/ScrollDownArrow";
import TypewriterText from "@/components/TypewriterText";
import { ImagesSlider, ImageConfig } from "@/components/ui/images-slider";

// Dynamic imports with loading fallbacks

const HeroHighlightDemo = dynamic(
  () => import("@/components/ui/hero-highlight-demo"),
  {
    ssr: true,
    loading: () => (
      <div className="w-full h-32 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl animate-pulse"></div>
    ),
  }
);

// Layout grid for therapy options - lazy loaded
const LayoutGrid = dynamic(
  () => import("@/components/ui/layout-grid").then((mod) => mod.LayoutGrid),
  {
    ssr: true,
    loading: () => (
      <div className="w-full h-[600px] grid grid-cols-2 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800/30 rounded-xl"></div>
        ))}
      </div>
    ),
  }
);

// Media query helper constant
const MOBILE_BREAKPOINT = 768; // px

// --- Optimization: Removed custom smoothScroll function ---
// Relies on CSS `scroll-behavior: smooth;` for anchor links now.
// Button clicks will use element.scrollIntoView().

// Hero images - moved outside component to prevent recreation on each render
// 2025 Standard: Optimize initial load by only loading first few images
const MOBILE_HERO_IMAGES = [
  "/images/home/3.webp", // First image - the one that should show immediately
  "/images/home/2.webp",
  "/images/home/happy-person.webp",
  "/images/home/group.webp",
  "/images/home/4.webp",
  "/images/home/5.webp",
  "/images/home/9.webp",
  "/images/home/10.webp",
  "/images/home/happy-couple.webp",
  "/images/home/hands.webp",
  "/images/home/7.webp",
  "/images/home/6.webp",
];

const DESKTOP_HERO_IMAGES = [
  "/images/home/large/1-lg.webp", // First image - the one that should show immediately
  "/images/home/large/2-lg.webp",
  "/images/home/large/3-lg.webp",
  "/images/home/large/4-lg.webp",
  "/images/home/large/5-lg.webp",
  "/images/home/large/6-lg.webp",
  "/images/home/large/7-lg.webp",
  "/images/home/large/8-lg.webp",
  "/images/home/large/9-lg.webp",
  "/images/home/large/10-lg.webp",
  "/images/home/large/11-lg.webp",
  "/images/home/large/12-lg.webp",
];

// 2025 Standard: Only preload the first 3 images for faster LCP
// The rest will be loaded as needed
const PRIORITY_HERO_IMAGES = [
  MOBILE_HERO_IMAGES[0],
  DESKTOP_HERO_IMAGES[0],
  MOBILE_HERO_IMAGES[1],
  DESKTOP_HERO_IMAGES[1]
];

// Combined array for lazy preloading remaining images
const DEFERRED_HERO_IMAGES = [
  ...MOBILE_HERO_IMAGES.slice(2),
  ...DESKTOP_HERO_IMAGES.slice(2)
];

// --- Standard Animation Variants ---
// (Copied directly from your original code)
const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// --- Reusable Hook for Viewport-Controlled Animation ---
// Encapsulates the useInView + useAnimation pattern
function useViewportAnimation(
  options: { once?: boolean; threshold?: number } = {
    once: false,
    threshold: 0.2,
  }
) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: options.once,
    amount: options.threshold ?? 0.2,
  });
  const controls = useAnimation();
  const didAnimate = useRef(false);

  useEffect(() => {
    if (isInView) {
      if (!options.once || !didAnimate.current) {
        controls.start("visible");
        if (options.once) didAnimate.current = true;
      }
    } else if (!options.once) {
      controls.start("hidden");
    }
  }, [isInView, controls, options.once]);

  return { ref, controls, isInView };
}

// --- Main Component ---
export default function Home() {
  // --- Basic State and Hooks ---
  const prefersReducedMotion = useReducedMotion();
  
  // Enable smooth scrolling for this page
  useEffect(() => {
    document.documentElement.classList.add('smooth-scroll');
    return () => {
      document.documentElement.classList.remove('smooth-scroll');
    };
  }, []);
  // Always initialize as false (desktop) to match SSR — useEffect updates after hydration
  const [isMobileView, setIsMobileView] = useState(false);

  // Track mounted state to prevent hydration mismatches
  const [mounted, setMounted] = useState(false);

  // Set mounted state on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Select appropriate images based on screen size
  const heroImages = isMobileView ? MOBILE_HERO_IMAGES : DESKTOP_HERO_IMAGES;

  // Video sources - not preloaded to avoid console warnings
  // Videos will be loaded when needed

  // Remove video preloading to prevent console warnings
  // Videos will be loaded when needed as user scrolls

  // Effect for mobile view detection (copied from original)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkMobile = () =>
        setIsMobileView(window.innerWidth < MOBILE_BREAKPOINT);
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);

  // --- Optimization Getters ---
  // Simple optimization functions
  const getOptimizedDuration = (defaultDuration: number): number => {
    if (prefersReducedMotion) return 0;
    return defaultDuration;
  };

  const getOptimizedThreshold = (defaultThreshold: number): number => {
    if (isMobileView) return 0.1; // Adjusted threshold slightly
    return defaultThreshold;
  };

  const getOptimizedDelay = (defaultDelay: number): number => {
    if (prefersReducedMotion) return 0;
    if (isMobileView) return defaultDelay * 0.5; // Less aggressive mobile reduction
    return defaultDelay;
  };

  // Enhanced stagger timing with exponential decay for statistics
  const getStaggerDelay = (index: number): number => {
    if (prefersReducedMotion) return 0;
    // Exponential decay: faster initial delays, max 300ms
    const delay = Math.min(index * 0.05, 0.3);
    return isMobileView ? delay * 0.6 : delay;
  };

  // --- Refs for Sections and Key Elements ---
  // (Copied from original, added videoRef and ctaRef)
  const heroRef = useRef<HTMLElement>(null); // Specify element type
  const featuresRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const plansRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null); // Added ref for CTA section
  const videoRef = useRef<HTMLVideoElement>(null); // Specific ref for video element

  // --- Scroll-Linked Opacity ---
  const { scrollYProgress } = useScroll();
  const featuresOpacity = useTransform(
    scrollYProgress,
    [0.15, 0.25, 0.35], // Original trigger points
    [0, 1, 1]
  );

  // --- Button Hover/Tap Animation Variants (Copied from original) ---
  const floatingButtonVariants = {
    hover: { scale: 1.05, boxShadow: "0 10px 25px rgba(96, 165, 250, 0.4)" },
    tap: { scale: 0.98 },
    rest: { scale: 1 },
  };

  // --- Hooks for Viewport-Controlled Animations (Defined Here) ---
  const isHeroInView = true; // Always show Hero3DBackground for better performance

  const statsHeadingView = useViewportAnimation({ threshold: 0.5, once: true });
  const statsCostsTradPulse1 = useViewportAnimation({ threshold: 0.5 });
  const statsCostsTradPulse2 = useViewportAnimation({ threshold: 0.5 });
  const statsCostsTradPulse3 = useViewportAnimation({ threshold: 0.5 });
  const statsCostsAIPulse1 = useViewportAnimation({ threshold: 0.5 });
  const statsCostsAIPulse2 = useViewportAnimation({ threshold: 0.5 });
  const statsVideoCardView = useViewportAnimation({ threshold: 0.3 });
  const statsIconsPulseView = useViewportAnimation({ threshold: 0.2 });

  const plansBeamView = useViewportAnimation({ threshold: 0.1 });
  const ctaBgView = useViewportAnimation({ threshold: 0.1 });

  // --- Video Play/Pause Logic ---
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (statsVideoCardView.isInView && !prefersReducedMotion) {
      if (videoElement.paused) {
        // Only attempt to play if paused
        videoElement.play().catch(console.error);
      }
    } else {
      if (!videoElement.paused) {
        // Only pause if playing
        videoElement.pause();
      }
    }
  }, [statsVideoCardView.isInView, prefersReducedMotion]);

  // --- Animation Performance Control ---
  const [isStatsAnimationPaused, setIsStatsAnimationPaused] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStatsAnimationPaused(!entry.isIntersecting);
        // Update CSS custom property for animation control
        document.documentElement.style.setProperty(
          '--animation-play-state', 
          entry.isIntersecting ? 'running' : 'paused'
        );
      },
      { threshold: 0.1 }
    );

    if (statsVideoCardView.ref.current) {
      observer.observe(statsVideoCardView.ref.current);
    }

    return () => observer.disconnect();
  }, []);

  // --- Smooth Scroll Click Handler (Standard API) ---
  const handleScrollClick = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // --- Define Controlled Animation Variants ---
  // (Defined before return statement)

  // Base variant for pulsing borders
  const pulseBorderVariant = (delay = 0) => ({
    hidden: { scale: 1, opacity: 0, transition: { duration: 0.1 } },
    visible: {
      scale: [1, 1.15, 1.3],
      opacity: [0, 0.7, 0],
      transition: {
        duration: 1.5,
        times: [0, 0.4, 1],
        repeat: Infinity,
        repeatDelay: 2,
        ease: "easeOut",
        delay:
          delay + (typeof window !== "undefined" ? Math.random() * 0.3 : 0),
      },
    },
  });

  // Pulsing Icon Rings
  const pulseIconRingVariant = (delay = 0) => ({
    hidden: { scale: 1, opacity: 0, transition: { duration: 0.1 } },
    visible: {
      scale: [1, 1.2, 1.5, 1.7],
      opacity: [0, 0.5, 0.3, 0],
      transition: {
        duration: 4,
        times: [0, 0.25, 0.6, 1],
        repeat: Infinity,
        ease: "linear",
        delay: delay,
      },
    },
  });

  // Stats Heading Text Shadow - static version (no animation)
  const textShadowVariant = {
    hidden: {
      textShadow: "0px 0px 0px rgba(66, 153, 225, 0)",
      transition: { duration: 0.2 },
    },
    visible: {
      textShadow: "0px 0px 4px rgba(66, 153, 225, 0.2)",
      transition: {
        duration: 0.5,
      },
    },
  };

  // Plans Sliding Beam
  const plansBeamVariant = {
    hidden: { opacity: 0, x: "-100%", transition: { duration: 0.3 } },
    visible: {
      opacity: 0.7, // Use opacity for fade control
      x: ["-100%", "200%"], // Sliding animation
      transition: {
        opacity: { duration: 1, delay: 0.5 },
        x: { duration: 5, repeat: Infinity, ease: "linear" },
      },
    },
  };

  // CTA Sliding Overlay
  const ctaBgVariant = {
    hidden: { opacity: 0, x: "-100%", transition: { duration: 0.5 } },
    visible: {
      opacity: 1, // Fade in control
      x: ["-100%", "0%"], // Slide in control
      transition: {
        opacity: { duration: 1 }, // Fade in duration
        x: { duration: 8, repeat: Infinity, ease: "linear" }, // Sliding duration/loop
      },
    },
  };

  // --- Component Return Start ---
  return (
    <div className="flex flex-col items-center w-full overflow-x-hidden">
      {/* Critical CSS for immediate overlay display */}
      <style jsx>{`
        .hero-overlay {
          position: absolute;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 0 0 4rem 4rem;
          z-index: 10;
        }
        @media (min-width: 768px) {
          .hero-overlay {
            border-radius: 0 0 5rem 5rem;
          }
        }
        /* Ensure hero images fill completely without gaps */
        .hero-images-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .hero-images-container img {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          min-width: 100%;
          min-height: 100%;
          width: auto;
          height: auto;
          object-fit: cover;
        }
      `}</style>
      {/* 2025 Standard: Prioritize critical images for better LCP */}
      <ImagePreloader
        key="priority-hero-images-preloader"
        imagePaths={PRIORITY_HERO_IMAGES}
        priority={true}
      />
      {/* Lazy load remaining images after initial load */}
      {mounted && (
        <ImagePreloader
          key="deferred-hero-images-preloader"
          imagePaths={DEFERRED_HERO_IMAGES}
          priority={false}
        />
      )}
      {/* Hero section with 3D Background */}
      <section
        ref={heroRef} // Assign ref
        className="w-full relative overflow-hidden min-h-[100vh] shadow-md shadow-black/10 rounded-b-[4rem] md:rounded-b-[5rem] bg-gray-900" // Changed from bg-white to bg-gray-900 to prevent white bleed
      >
        {/* Background Images Slider */}
        <div className="hero-images-container z-0">
          {/* Overlay - Show immediately on page load */}
          <div className="hero-overlay"></div>
          <ImagesSlider
            images={
              heroImages.map((src) => ({
                src,
                width: isMobileView ? 1200 : 1920,
                height: isMobileView ? 800 : 1080,
                objectFit: "cover",
                objectPosition: "center center",
                sizes: isMobileView
                  ? "(max-width: 768px) 100vw, 100vw"
                  : "(min-width: 769px) 100vw, 100vw",
                quality: isMobileView ? 85 : 100,
                priority: true,
              })) as (string | ImageConfig)[]
            }
            className="h-full w-full rounded-b-[4rem] md:rounded-b-[5rem]"
            autoplay={true}
            direction="up"
            overlay={false}
          >
            <></>
          </ImagesSlider>
        </div>
        {/* Hero content with enhanced animations (Original Structure) */}
        <motion.div
          className="relative z-10 flex flex-col items-center text-center p-4 sm:py-12 md:py-20 min-h-[100vh] justify-center"
          // Keep original initial animation logic
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.6, 0.05, 0.01, 0.9] }} // Use original duration/ease
        >
          {/* Hero Highlight */}
          <div className="mb-12 md:mb-16">
            <HeroHighlightDemo />
          </div>

          {/* Hero Button Container (Original Structure) */}
          <div
            className="w-full sm:w-auto px-4 sm:px-0" // Original classes
          >
            {/* Button Hover/Tap Wrapper (Original Structure) */}
            <div>
              {/* Button Component (Original Structure) */}
              <ButtonWithSound
                as={Link}
                href="/dashboard/therapy"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium py-3 sm:py-4 px-8 sm:px-10 rounded-full text-base sm:text-lg shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-lg hover:from-blue-600 hover:to-blue-600 focus:ring-4 focus:ring-blue-400 relative overflow-hidden" // Original classes
              >
                <span className="relative z-10">
                  Start Your Therapy Session
                </span>
                {/* Original overlay spans */}
                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
                <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-30 blur-lg"></span>
              </ButtonWithSound>
            </div>
          </div>

          {/* Scroll Down Arrow (Original Structure) */}
          <div className="absolute bottom-16 md:bottom-24 lg:bottom-32 xl:bottom-40 left-1/2 transform -translate-x-1/2 optimize-gpu">
            {" "}
            {/* Responsive positioning: closer on mobile, farther on large screens */}
            <ScrollDownArrow
              // Optimization: Use standard smooth scroll handler
              onClick={() =>
                handleScrollClick(featuresRef as React.RefObject<HTMLElement>)
              }
            />
          </div>
        </motion.div>{" "}
        {/* End Hero Content */}
      </section>
      {/* Mental Health & Therapy Costs Section */}
      {/* Use simple whileInView for section fade-in */}
      <motion.section
        ref={statsRef} // Assign ref
        className="w-full py-20 pb-8 sm:pb-12 md:pb-16"
        initial="hidden" // Use variants for section fade-in
        whileInView="visible"
        viewport={{ once: true, amount: getOptimizedThreshold(0.1) }} // Animate once
        variants={{
          // Define variants directly
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { duration: getOptimizedDuration(0.5) },
          },
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8">
          {" "}
          {/* Original container */}
          {/* Section Heading with Controlled Text Shadow */}
          <motion.h2
            ref={statsHeadingView.ref} // Ref for viewport control
            initial="hidden" // Controlled by hook
            animate={statsHeadingView.controls}
            variants={{
              // Variants for the H2 enter animation itself
              hidden: { opacity: 0, y: 40 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.8, type: "spring", damping: 15 },
              }, // Original transition
            }}
            // Removed viewport prop, handled by hook now
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-16" // Original classes
          >
            {/* Inner span for text shadow */}
            <motion.span
              className="relative" // Original class
              variants={textShadowVariant} // Defined variants for shadow
              initial="hidden" // Start hidden
              // Animate only if not reduced motion, controlled by the same hook as parent H2
              animate={
                prefersReducedMotion ? "hidden" : statsHeadingView.controls
              }
            >
              {/* Original text content */}
              <span className="relative z-10 text-white py-1 text-sm sm:text-lg md:text-2xl overflow-visible">
                Making Therapy{" "}
                <span className="underline decoration-green-500 decoration-4 underline-offset-4">
                  <TypewriterText
                    text="Accessible"
                    isInView={statsHeadingView.isInView}
                    className="text-white"
                  />
                </span>
                for Everyone
              </span>
              {/* Original background blur element */}
              <span className="absolute -inset-1 rounded-lg bg-black/20 -z-10 blur-lg opacity-10"></span>
            </motion.span>
          </motion.h2>
          {/* Grid Container */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-6 lg:gap-8 mb-16 max-w-5xl mx-auto">
            {/* Therapy Costs Card (Left Side) */}
            {/* Use simple whileInView for card entry */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: getOptimizedThreshold(0.1) }}
              variants={fadeInUp}
              className="relative rounded-3xl p-6 sm:p-8 md:p-6 lg:p-8 bg-gradient-to-br from-white/20 to-white/10 border border-white/20 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              {/* Original content */}
              <h3 className="text-xl sm:text-2xl font-bold mb-5 sm:mb-6 relative z-10 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent drop-shadow-lg">
                Average Therapy Costs
              </h3>
              <p className="text-white text-sm sm:text-base md:text-lg mb-6 sm:mb-8 relative z-10">
                Traditional therapy can be costly and inaccessible for many. We
                break down these barriers by offering affordable, AI-powered
                therapy solutions that provide the same quality of care at a
                fraction of the cost.
              </p>
              {/* Inner grid for cost boxes */}
              <div className="grid grid-cols-1 gap-4 sm:gap-5 mb-8">
                {/* Traditional Therapy Box */}
                <div className="relative">
                  <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-white/70 to-white/50 border border-white/30 shadow-md hover:shadow-lg transition-shadow duration-300">
                    {/* Original Heading */}
                    <h4 className="text-lg font-bold mb-3 flex flex-wrap items-center gap-2 relative z-10">
                      <span className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-3 py-1 rounded-lg shadow-md">
                        TRADITIONAL
                      </span>
                      <span className="text-gray-800 font-semibold">Therapy</span>
                      <span className="sm:ml-auto text-xs sm:text-sm font-bold px-2 py-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md">
                        HIGH COST
                      </span>
                    </h4>
                    {/* Grid for individual traditional costs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 max-w-lg mx-auto sm:max-w-none">
                      {[
                        { title: "Solo Session", price: "$100-150" },
                        { title: "Couples Session", price: "$150-250" },
                        { title: "Family Session", price: "$175-300" },
                      ].map((session, index) => {
                        const pulseControls = [
                          statsCostsTradPulse1,
                          statsCostsTradPulse2,
                          statsCostsTradPulse3,
                        ][index];
                        return (
                          // Item card - simple whileInView enter animation
                          <motion.div
                            key={session.title}
                            ref={pulseControls.ref} // Ref for CONTROLLING the pulse animation inside
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }} // Animate item once
                            variants={fadeInUp} // Use standard fade in
                            transition={{
                              delay: getOptimizedDelay(index * 0.15),
                            }} // Apply optimized stagger
                            className="rounded-2xl p-4 text-center bg-gradient-to-br from-white to-red-50/30 border border-red-200/50 shadow-md hover:shadow-lg transition-shadow duration-300 relative overflow-hidden"
                          >
                            {/* Large X Animation Overlay - covers entire card */}
                            <motion.div
                              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                              initial={{ opacity: 0 }}
                              animate={{ 
                                opacity: [0, 0.4, 0, 0.3, 0],
                              }}
                              transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            >
                              <div 
                                className="text-red-500/80 select-none flex items-center justify-center w-full h-full"
                                style={{ 
                                  fontSize: '12rem', 
                                  lineHeight: '1',
                                  width: '100%',
                                  height: '100%'
                                }}
                              >
                                ✕
                              </div>
                            </motion.div>
                            {/* Price container */}
                            <div className="relative inline-block mb-2">
                              {/* Original price span */}
                              <span className="block text-red-600 font-bold text-xl sm:text-2xl relative z-10">
                                {session.price}
                              </span>
                            </div>
                            {/* Original tag */}
                            <div className="mt-1">
                              <span className="inline-block text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm">
                                EXPENSIVE
                              </span>
                            </div>
                            {/* Original title */}
                            <span className="text-sm text-gray-700 font-medium relative z-10">
                              {session.title}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                    {/* Original footnote */}
                    <div className="text-sm text-gray-600 text-center italic">
                      *Average costs per session based on nationwide survey data
                    </div>
                  </div>
                </div>

                {/* AI Powered Box */}
                {/* Simple whileInView enter animation */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{
                    duration: getOptimizedDuration(0.5),
                    delay: getOptimizedDelay(0.2),
                  }} // Original delay relative to card entry
                  variants={fadeInUp}
                  className="relative"
                >
                  <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-white/70 to-blue-50/40 border border-blue-200/50 shadow-md hover:shadow-lg transition-shadow duration-300">
                    {/* Original heading */}
                    <h4 className="text-lg font-bold mb-4 relative z-10 flex flex-wrap items-center gap-2">
                      <span className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-3 py-1 rounded-lg shadow-md">
                        AI-POWERED
                      </span>
                      <span className="text-blue-600 font-semibold">Therapy</span>
                      <span className="sm:ml-auto text-xs sm:text-sm font-bold px-2 py-1 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md">
                        AFFORDABLE
                      </span>
                    </h4>
                    {/* Grid for AI costs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 mb-5 relative z-10 max-w-md mx-auto sm:max-w-none">
                      {/* 30 Min Session Card */}
                      {/* Simple fade-in for this inner card */}
                      <motion.div
                        ref={statsCostsAIPulse1.ref}
                        className="rounded-2xl p-4 pt-4 sm:p-4 bg-gradient-to-br from-white to-green-50/30 border border-green-200/50 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                      >
                        {/* Original card title */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg -mt-2 mb-3 inline-block text-sm sm:text-base shadow-md max-w-fit">
                          30-Minute Session
                        </div>
                        {/* Original price section */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-green-500 font-bold">
                            Quick Therapy
                          </span>
                          <div className="relative inline-block">
                            {/* Controlled Green Pulse */}
                            <motion.span
                              className="absolute inset-0 border-2 border-green-400/70 rounded-full" // Added shape
                              variants={pulseBorderVariant()} // Use base variant
                              initial="hidden"
                              animate={
                                prefersReducedMotion
                                  ? "hidden"
                                  : statsCostsAIPulse1.controls
                              }
                            />
                            {/* Original price text */}
                            <span className="text-3xl font-bold text-green-500 relative z-10">
                              $2.65
                            </span>
                          </div>
                        </div>
                        {/* Original cost breakdown list */}
                        <ul className="text-sm text-gray-600 space-y-2">
                          <li className="flex items-start">
                            <div className="flex-shrink-0 w-5 h-5 mt-0.5 mr-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-200">
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                            <span>Vapi platform: $1.50</span>
                          </li>
                          <li className="flex items-start">
                            <div className="flex-shrink-0 w-5 h-5 mt-0.5 mr-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-200">
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                            <span>Claude 3.7 AI: $0.07</span>
                          </li>
                          <li className="flex items-start">
                            <div className="flex-shrink-0 w-5 h-5 mt-0.5 mr-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-200">
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                            <span>Voice synthesis: $0.75</span>
                          </li>
                          <li className="flex items-start">
                            <div className="flex-shrink-0 w-5 h-5 mt-0.5 mr-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-200">
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                            <span>Transcription: $0.30</span>
                          </li>
                        </ul>
                      </motion.div>

                      {/* 60 Min Session Card */}
                      {/* Simple fade-in for this inner card */}
                      <motion.div
                        ref={statsCostsAIPulse2.ref}
                        className="rounded-2xl p-4 pt-4 sm:p-4 bg-gradient-to-br from-white to-green-50/30 border border-green-200/50 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                      >
                        {/* Original card title */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg -mt-2 mb-3 inline-block text-sm sm:text-base shadow-md max-w-fit">
                          60-Minute Session
                        </div>
                        {/* Original price section */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-green-500 font-bold">
                            Full Therapy
                          </span>
                          <div className="relative inline-block">
                            {/* Controlled Green Pulse */}
                            <motion.span
                              className="absolute inset-0 border-2 border-green-400/70 rounded-full" // Added shape
                              variants={pulseBorderVariant(0.15)} // Use variant + delay
                              initial="hidden"
                              animate={
                                prefersReducedMotion
                                  ? "hidden"
                                  : statsCostsAIPulse2.controls
                              }
                            />
                            {/* Original price text */}
                            <span className="text-3xl font-bold text-green-500 relative z-10">
                              $5.25
                            </span>
                          </div>
                        </div>
                        {/* Original cost breakdown list */}
                        <ul className="text-sm text-gray-600 space-y-2">
                          <li className="flex items-start">
                            <div className="flex-shrink-0 w-5 h-5 mt-0.5 mr-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-200">
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                            <span>Vapi platform: $3.00</span>
                          </li>
                          <li className="flex items-start">
                            <div className="flex-shrink-0 w-5 h-5 mt-0.5 mr-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-200">
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                            <span>Claude 3.7 AI: $0.15</span>
                          </li>
                          <li className="flex items-start">
                            <div className="flex-shrink-0 w-5 h-5 mt-0.5 mr-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-200">
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                            <span>Voice synthesis: $1.50</span>
                          </li>
                          <li className="flex items-start">
                            <div className="flex-shrink-0 w-5 h-5 mt-0.5 mr-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-200">
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                            <span>Transcription: $0.60</span>
                          </li>
                        </ul>
                      </motion.div>
                    </div>
                    {/* End AI costs grid */}
                    {/* Final savings text */}
                    {/* Simple whileInView */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                      className="text-center my-4 relative"
                    >
                      <div className="text-white font-bold text-lg sm:text-xl relative inline-block">
                        Save up to{" "}
                        <span
                          className="text-green-400 relative inline-block"
                          style={{
                            textShadow:
                              "-0.5px -0.5px 0 #000, 0.5px -0.5px 0 #000, -0.5px 0.5px 0 #000, 0.5px 0.5px 0 #000",
                          }}
                        >
                          97%
                        </span>{" "}
                        compared to traditional therapy costs!
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.4, 0.7, 0.4] }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            repeatType: "mirror",
                          }}
                          className="absolute inset-0 blur-md bg-white/10 -z-10"
                        />
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
                {/* End AI Powered Box */}
              </div>
              {/* End inner grid for cost boxes */}
            </motion.div>
            {/* End Therapy Costs Card (Left Side) */}
            {/* Mental Health Statistics Card (Right Side) */}
            {/* Use simple whileInView for card entry, ref controls video */}
            <motion.div
              ref={statsVideoCardView.ref} // Ref for video control via useEffect
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: getOptimizedThreshold(0.1) }} // Original threshold logic
              variants={fadeInUp} // Original variant
              whileHover={
                !prefersReducedMotion
                  ? {
                      boxShadow:
                        "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    }
                  : {}
              } // Original hover, check reduced motion
              className="bg-black/25 backdrop-blur-[2px] p-6 sm:p-8 rounded-3xl shadow-xl border border-white/5 relative overflow-hidden" // Original classes
            >
              {/* Video Background */}
              <div className="absolute inset-0 w-full h-full z-0 overflow-hidden rounded-3xl">
                <video
                  ref={videoRef} // Assign ref
                  // Removed autoPlay - controlled by useEffect
                  loop
                  muted
                  playsInline
                  preload="metadata" // Only load metadata initially for faster load
                  className="absolute inset-0 w-full h-full object-cover opacity-80 will-change-transform" // GPU optimization
                  style={{ 
                    transform: 'translateZ(0)', // Force GPU layer
                    backfaceVisibility: 'hidden' // Prevent flickering
                  }}
                  // poster="/videos/rain-poster.webp" // Optional: Add poster image
                >
                  <source src="/videos/depressed.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                {/* Overlay (Original) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-indigo-900/50 to-purple-900/50 z-0"></div>
              </div>
              {/* Card Content */}
              <h3 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6 text-white relative z-10">
                Mental Health Challenges
              </h3>
              {/* Container to control all icon pulses */}
              <div
                ref={statsIconsPulseView.ref}
                className={`space-y-5 sm:space-y-6 relative z-10 ${isStatsAnimationPaused ? 'animation-paused' : ''}`}
              >
                {[
                  {
                    value: "1/5",
                    text: "Nearly one in five U.S. adults experiences mental illness each year, with relationship conflicts often being a significant contributing factor.",
                  },
                  {
                    value: "60%",
                    text: "Approximately 60% of people who could benefit from therapy never receive it due to barriers like cost, stigma, and limited access to providers.",
                  },
                  {
                    value: "42%",
                    text: "42% of people cite cost as the primary barrier to seeking professional mental health support, even when insurance is available.",
                  },
                  {
                    value: "78%",
                    text: "78% of couples report improved relationship satisfaction after completing just 5 therapeutic sessions addressing communication patterns.",
                  },
                  {
                    value: "35%",
                    text: "35% of relationships struggle with communication issues that could be effectively addressed through consistent therapeutic intervention.",
                  },
                  {
                    value: "90%",
                    text: "Over 90% of therapy clients report that having a supportive, judgment-free environment is crucial to their progress and healing.",
                  },
                  {
                    value: "67%",
                    text: "67% of couples who attend regular therapy sessions report significant improvements in conflict resolution skills within 3 months.",
                  },
                  {
                    value: "53%",
                    text: "53% of individuals with relationship difficulties experience improved mental health when both partners engage in therapy together.",
                  },
                  {
                    value: "84%",
                    text: "84% of couples using digital therapy tools report greater consistency in practicing therapeutic techniques between sessions.",
                  },
                  {
                    value: "71%",
                    text: "71% of long-term relationships benefit from periodic therapeutic check-ins, even when not experiencing acute issues.",
                  },
                ].map((stat, index) => (
                  // Stat Item - simple whileInView entry
                  <motion.div
                    key={index}
                    initial="hidden" // Use variants for item entry
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.5 }} // Animate once
                    variants={fadeInUp} // Use standard variant
                    transition={{ delay: getStaggerDelay(index) }} // Enhanced stagger with exponential decay
                    className="flex items-start" // Original classes
                  >
                    {/* Icon Container */}
                    <motion.div
                      // Keep original hover effect
                      whileHover={
                        !prefersReducedMotion
                          ? {
                              scale: 1.1,
                              backgroundColor: "rgb(224, 231, 255)",
                            }
                          : {}
                      }
                      className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-100 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0 shadow-sm relative" // Original classes
                    >
                      {/* High-Performance CSS Pulse Rings */}
                      {!prefersReducedMotion && (
                        <>
                          <span className="absolute inset-0 rounded-full border border-indigo-300/30 pulse-ring" />
                          <span className="absolute inset-0 rounded-full border border-indigo-300/30 pulse-ring pulse-ring-delay-1" />
                          <span className="absolute inset-0 rounded-full border border-indigo-300/30 pulse-ring pulse-ring-delay-2" />
                        </>
                      )}
                      {/* Original stat value */}
                      <span className="relative z-10 text-blue-500 font-bold text-base sm:text-lg">
                        {stat.value}
                      </span>
                    </motion.div>
                    {/* Original stat text */}
                    <p className="text-sm sm:text-base text-white">
                      {stat.text}
                    </p>
                  </motion.div>
                ))}
              </div>{" "}
              {/* End Stats List */}
            </motion.div>{" "}
            {/* End Mental Health Stats Card */}
          </div>
          {/* End Main Grid */}
          {/* 4-Container Layout Grid */}
          <div className="bg-transparent p-2 sm:p-6 md:p-8 rounded-3xl relative overflow-hidden antialiased">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: getOptimizedThreshold(0.2) }}
              transition={{ duration: getOptimizedDuration(0.7) }}
              variants={fadeInUp}
              className="relative z-10 mb-4 sm:mb-8"
            >
              <div className="w-full rounded-xl h-24 sm:h-36 mt-8 sm:mt-12 overflow-hidden">
                <h3 className="text-xl sm:text-3xl md:text-5xl text-center font-bold text-white">
                  Discover Our Therapy Options
                </h3>
              </div>
            </motion.div>

            <div className="h-auto min-h-[800px] sm:min-h-[700px] md:min-h-[600px] lg:min-h-[650px] relative z-10">
              <LayoutGrid
                cards={[
                  {
                    id: 1,
                    content: (
                      <div className="relative w-full h-full overflow-hidden">
                        {/* Adjust height as needed (e.g., h-[500px]) */}
                        <video
                          className="absolute w-full h-[246px] md:h-[280px] lg:h-[320px] object-cover z-0"
                          autoPlay
                          loop
                          muted
                          playsInline
                          // Optional: poster="/images/fallback-image.webp" // Add path to fallback image here
                        >
                          {/* PLACE YOUR VIDEO SOURCE PATHS HERE */}
                          <source
                            src="/videos/couple.mp4"
                            type="video/mp4"
                          />{" "}
                          {/* Replace with your .mp4 path */}
                          {/* <source src="/videos/your-background-video.webm" type="video/webm" /> */}{" "}
                          {/* Optional: Add other formats */}
                          {/* <source src="/videos/your-background-video.ogg" type="video/ogg" /> */}{" "}
                          {/* Optional: Add other formats */}
                          Your browser does not support the video tag.
                        </video>
                        {/* Optional: Semi-transparent Overlay for better text readability */}
                        <div className="absolute inset-0 bg-black/50 z-10"></div>{" "}
                        {/* Adjust color/opacity (e.g., bg-blue-500/75) */}
                        {/* Text Content Container */}
                        <div className="absolute inset-0 z-20 p-5">
                          {/* Add positioning/centering classes here if needed */}

                          <p className="text-white/80 text-xs sm:text-sm md:text-base lg:text-lg mt-4 md:mt-8 lg:mt-14">
                            Rebuild trust, improve communication, and rediscover
                            intimacy with our specialized couples therapy. Our
                            AI therapist uses evidence-based techniques from
                            Gottman Method and Emotionally Focused Therapy to
                            help you navigate conflicts and strengthen your
                            bond.
                          </p>
                        </div>
                      </div>
                    ),
                    className:
                      "md:col-span-2 row-span-1 md:row-span-1 md:col-start-1 md:row-start-1", // Position in first row, first column for md+
                    thumbnail: "/images/therapyType/couple.webp",
                    size: "large",
                    title: "Couples Therapy",
                  },
                  {
                    id: 2,
                    content: (
                      <div className="relative w-full h-full overflow-hidden">
                        {/* Adjust height as needed (e.g., h-[500px]) */}
                        <video
                          className="absolute w-full h-[246px] md:h-[280px] lg:h-[350px] object-cover z-0"
                          autoPlay
                          loop
                          muted
                          playsInline
                          // Optional: poster="/images/fallback-image.webp" // Add path to fallback image here
                        >
                          {/* PLACE YOUR VIDEO SOURCE PATHS HERE */}
                          <source
                            src="/videos/mental_health.mp4"
                            type="video/mp4"
                          />{" "}
                          {/* Replace with your .mp4 path */}
                          {/* <source src="/videos/your-background-video.webm" type="video/webm" /> */}{" "}
                          {/* Optional: Add other formats */}
                          {/* <source src="/videos/your-background-video.ogg" type="video/ogg" /> */}{" "}
                          {/* Optional: Add other formats */}
                          Your browser does not support the video tag.
                        </video>
                        {/* Optional: Semi-transparent Overlay for better text readability */}
                        <div className="absolute inset-0 bg-black/50 z-10"></div>{" "}
                        {/* Adjust color/opacity (e.g., bg-blue-500/75) */}
                        {/* Text Content Container */}
                        <div className="absolute inset-0 z-20 p-5">
                          {/* Add positioning/centering classes here if needed */}

                          <p className="text-white/80 text-xs sm:text-sm md:text-base lg:text-lg mt-4 md:mt-8 lg:mt-14">
                            Address anxiety, depression, and stress with
                            personalized therapy approaches that promote
                            emotional well-being. Our AI therapist employs
                            Cognitive Behavioral Therapy (CBT), mindfulness
                            practices, and solution-focused techniques to help
                            you overcome obstacles.
                          </p>
                        </div>
                      </div>
                    ),
                    className:
                      "md:col-span-1 row-span-1 md:row-span-1 md:col-start-1 md:row-start-2", // Position in second row, first column for md+
                    thumbnail: "/images/therapyType/mental_health.webp",
                    size: "medium",
                    title: "Mental Health Challenges",
                  },
                  {
                    id: 3,
                    content: (
                      <div className="relative w-full h-full overflow-hidden">
                        {/* Adjust height as needed (e.g., h-[500px]) */}
                        <video
                          className="absolute w-full h-[246px] md:h-[280px] lg:h-[380px] object-cover z-0"
                          autoPlay
                          loop
                          muted
                          playsInline
                          // Optional: poster="/images/fallback-image.webp" // Add path to fallback image here
                        >
                          {/* PLACE YOUR VIDEO SOURCE PATHS HERE */}
                          <source
                            src="/videos/family.mp4"
                            type="video/mp4"
                          />{" "}
                          {/* Replace with your .mp4 path */}
                          {/* <source src="/videos/your-background-video.webm" type="video/webm" /> */}{" "}
                          {/* Optional: Add other formats */}
                          {/* <source src="/videos/your-background-video.ogg" type="video/ogg" /> */}{" "}
                          {/* Optional: Add other formats */}
                          Your browser does not support the video tag.
                        </video>
                        {/* Optional: Semi-transparent Overlay for better text readability */}
                        <div className="absolute inset-0 bg-black/50 z-10"></div>{" "}
                        {/* Adjust color/opacity (e.g., bg-blue-500/75) */}
                        {/* Text Content Container */}
                        <div className="absolute inset-0 z-20 p-5">
                          {/* Add positioning/centering classes here if needed */}

                          <p className="text-white/80 text-xs sm:text-sm md:text-base lg:text-lg mt-4 md:mt-8 lg:mt-14">
                            Heal family dynamics and build stronger connections
                            through our systemic family therapy approach.
                            Address intergenerational patterns, resolve
                            conflicts, and improve communication between all
                            family members in a collaborative, supportive
                            environment.
                          </p>
                        </div>
                      </div>
                    ),
                    className:
                      "md:col-span-1 row-span-1 md:row-span-1 md:col-start-2 md:row-start-2", // Position in second row, second column for md+
                    thumbnail: "/images/therapyType/family.webp",
                    size: "medium",
                    title: "Family Therapy",
                  },
                  {
                    id: 4,
                    content: (
                      <div className="relative w-full h-full overflow-hidden">
                        {/* Adjust height as needed (e.g., h-[500px]) */}
                        <video
                          className="absolute w-full h-[246px] md:h-[280px] lg:h-[320px] object-cover z-0"
                          autoPlay
                          loop
                          muted
                          playsInline
                          // Optional: poster="/images/fallback-image.webp" // Add path to fallback image here
                        >
                          {/* PLACE YOUR VIDEO SOURCE PATHS HERE */}
                          <source
                            src="/videos/solo.mp4"
                            type="video/mp4"
                          />{" "}
                          {/* Replace with your .mp4 path */}
                          {/* <source src="/videos/your-background-video.webm" type="video/webm" /> */}{" "}
                          {/* Optional: Add other formats */}
                          {/* <source src="/videos/your-background-video.ogg" type="video/ogg" /> */}{" "}
                          {/* Optional: Add other formats */}
                          Your browser does not support the video tag.
                        </video>
                        {/* Optional: Semi-transparent Overlay for better text readability */}
                        <div className="absolute inset-0 bg-black/50 z-10"></div>{" "}
                        {/* Adjust color/opacity (e.g., bg-blue-500/75) */}
                        {/* Text Content Container */}
                        <div className="absolute inset-0 z-20 p-5">
                          {/* Add positioning/centering classes here if needed */}

                          <p className="text-white/80 text-xs sm:text-sm md:text-base lg:text-lg mt-4 md:mt-8 lg:mt-14">
                            Embark on a personal growth journey with our
                            individualized solo therapy. Enhance your mental
                            wellbeing, develop effective coping strategies, and
                            gain profound self-awareness through personalized
                            therapeutic approaches tailored to your unique
                            needs.
                          </p>
                        </div>
                      </div>
                    ),
                    className:
                      "md:col-span-1 row-span-1 md:row-span-1 md:col-start-2 md:row-start-1", // Position in first row, second column for md+
                    thumbnail: "/images/therapyType/solo.webp",
                    size: "large",
                    title: "Solo Therapy",
                  },
                ]}
              />
            </div>

            {/* Button */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: getOptimizedThreshold(0.2) }}
              transition={{ duration: getOptimizedDuration(0.7), delay: 0.3 }}
              variants={fadeInUp}
              className="text-center mt-8 sm:mt-12 md:mt-16 lg:mt-20 mb-12 sm:mb-16 md:mb-20 lg:mb-24 relative z-10"
            >
              <motion.div
                variants={floatingButtonVariants}
                initial="rest"
                whileHover={prefersReducedMotion ? "rest" : "hover"}
                whileTap={prefersReducedMotion ? "rest" : "tap"}
                className="inline-block"
              >
                <ButtonWithSound
                  as={Link}
                  href="/dashboard/therapy"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium py-3 sm:py-4 px-8 sm:px-10 rounded-full text-base sm:text-lg shadow-lg shadow-gray-500/20 transition-all duration-300 hover:shadow-sm hover:from-blue-600 hover:to-blue-600 focus:ring-4 focus:ring-blue-400 relative overflow-hidden" // Original classes
                >
                  <span className="relative z-10">
                    Start Your Therapy Session
                  </span>
                  {/* Original overlay spans */}
                  <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-30 blur-sm"></span>
                </ButtonWithSound>
              </motion.div>
            </motion.div>
          </div>{" "}
          {/* End Access Gap Box */}
        </div>
        {/* End Max Width Container */}
      </motion.section>
      {/* Features section with creative card animations */}
      {/* Apply scroll-linked opacity directly */}
      <motion.section
        ref={featuresRef} // Assign ref
        className="w-full py-16 sm:py-20 min-h-screen"
        // Apply opacity driven by useTransform hook with mobile fallback
        style={{
          opacity: featuresOpacity,
        }}
        // Add fallback animation for mobile
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8">
          {" "}
          {/* Original container */}
          {/* Section Heading - simple whileInView */}
          <motion.h2
            initial="hidden" // Use variants
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }} // Animate once
            transition={{
              // Original transition
              duration: 0.7,
              type: "spring",
              stiffness: 100,
            }}
            variants={fadeInUp} // Use standard variant
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-14  sm:mb-20 text-white overflow-visible" // Simplified to white text
          >
            How We Support Your Relationship
          </motion.h2>
          {/* Feature Card Grid - Apply stagger directly */}
          <motion.div
            className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-6 lg:gap-8" // Enhanced tablet responsiveness
            initial="hidden" // Parent controls children
            whileInView="visible"
            viewport={{ once: true, amount: getOptimizedThreshold(0.1) }} // Trigger earlier for container
            // Define stagger directly in variants.visible
            variants={{
              visible: {
                transition: { staggerChildren: getOptimizedDelay(0.15) },
              },
            }} // Use optimized delay
          >
            {/* Map over features (Original data structure) */}
            {(
              [
                {
                  title: "Private Sessions",
                  description:
                    "Connect with an AI therapist in a safe, confidential environment. Our virtual sessions provide the same privacy as traditional therapy, with enhanced security protocols to protect your conversations and personal information.",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                  ),
                },
                {
                  title: "24/7 Availability",
                  description:
                    "Get help whenever you need it, any day, any time. Relationship issues don't follow a schedule, and neither do we. Start a therapy session at your convenience without waiting for appointments or office hours.",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  ),
                },
                {
                  title: "Proven Techniques",
                  description:
                    "Our AI is trained in evidence-based therapeutic approaches including Cognitive Behavioral Therapy, Emotionally Focused Therapy, and Gottman Method principles to help couples build stronger connections and resolve conflicts effectively.",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  ),
                },
              ] as const
            ).map((feature, index) => (
              // Feature Card Item
              <motion.div
                key={index} // Use index as key if titles aren't unique, otherwise feature.title
                variants={fadeInUp} // Each card uses the variant defined in the parent
                whileHover={
                  !prefersReducedMotion
                    ? {
                        // Original hover effect, check reduced motion
                        boxShadow:
                          "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                      }
                    : {}
                }
                className="bg-white/10 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 border border-white/20 group" // Semi-transparent with backdrop blur
              >
                {/* Icon Container */}
                <motion.div
                  // Original hover animation for icon, check reduced motion
                  whileHover={
                    !prefersReducedMotion
                      ? { scale: 1.1, rotate: [0, -10, 10, -5, 0] }
                      : {}
                  }
                  transition={{ duration: 0.5 }} // Original transition
                  className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-white/30 transition-colors duration-300 shadow-md" // Keep translucent background
                >
                  {feature.icon}
                </motion.div>
                {/* Card Title */}
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white group-hover:text-white/90 transition-colors duration-300">
                  {feature.title}
                </h3>
                {/* Card Description */}
                <p className="text-sm sm:text-base text-white/80">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>{" "}
          {/* End Feature Card Grid */}
        </div>{" "}
        {/* End Max Width Container */}
      </motion.section>
      {/* Call to action section */}
      {/* Simple fade-in for section container */}
      <motion.section
        ref={ctaRef} // Assign ref
        className="w-full py-20 sm:py-24 pb-32 text-white overflow-hidden relative"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: getOptimizedThreshold(0.2) }} // Animate once, use optimized threshold
        variants={{
          // Define variants directly
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { duration: getOptimizedDuration(0.8) },
          }, // Use optimized duration
        }}
      >
        {/* Controlled Animated Background Overlay */}
        <motion.div
          ref={ctaBgView.ref} // Ref for viewport control
          className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0" // Original classes + ensure behind content
          initial="hidden" // Start hidden
          animate={prefersReducedMotion ? "hidden" : ctaBgView.controls} // Controlled animation
          variants={ctaBgVariant} // Use defined variant
          // Removed original whileInView/transition from this wrapper
        >
          {/* The actual sliding element (no animation props needed here) */}
          <div
            className="absolute top-0 left-0 h-full w-[200%]" // Original classes
            style={{
              // Original style
              background:
                "linear-gradient(90deg, rgba(30, 58, 138, 0) 0%, rgba(30, 58, 138, 0.3) 15%, rgba(30, 58, 138, 0) 30%)",
            }}
          />
        </motion.div>{" "}
        {/* End Overlay Container */}
        {/* CTA Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8 relative z-10">
          {" "}
          {/* Original container + z-10 */}
          <div className="text-center relative z-10 mb-6">
            {" "}
            {/* Original wrapper + z-10 */}
            {/* CTA Heading - simple whileInView */}
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }} // Animate once
              transition={{
                // Original transition
                duration: 0.7,
                type: "spring",
                stiffness: 50,
              }}
              variants={fadeInUp} // Use standard variant
              className="text-2xl sm:text-3xl md:text-4xl font-bold pb-8 mb-6 sm:mb-8" // Original classes
            >
              Ready to Transform Your Relationship?
            </motion.h2>
            {/* CTA Button */}
            <motion.div
              variants={floatingButtonVariants} // Original variants
              initial="rest"
              whileHover={prefersReducedMotion ? "rest" : "hover"} // Check reduced motion
              whileTap={prefersReducedMotion ? "rest" : "tap"} // Check reduced motion
              className="inline-block mb-8" // Original class
            >
              <ButtonWithSound
                as={Link}
                href="/dashboard/therapy"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium py-3 sm:py-4 px-8 sm:px-10 rounded-full text-base sm:text-lg shadow-lg shadow-gray-500/20 transition-all duration-300 hover:shadow-sm hover:from-blue-600 hover:to-blue-600 focus:ring-4 focus:ring-blue-400 relative overflow-hidden" // Original classes
              >
                <span className="relative z-10">
                  Begin Your Therapy Journey
                </span>
                {/* Original overlay spans */}
                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
                <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-30 blur-sm"></span>
              </ButtonWithSound>
            </motion.div>
          </div>
        </div>{" "}
        {/* End Max Width Container */}
      </motion.section>
      {/* Footer section (Using <footer> tag for semantics) */}
      <footer className="w-full py-10 text-white">
        {" "}
        {/* Original classes */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8">
          {" "}
          {/* Original container */}
          <div className="text-center">
            {" "}
            {/* Original wrapper */}
            <p className="text-sm text-white mb-4">
              © {new Date().getFullYear()} TherapyAI. All rights reserved.
            </p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <Link
                href="/terms"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Terms and Conditions
              </Link>
              <span className="text-xs text-gray-500">|</span>
              <Link
                href="/privacy"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
            <p className="text-xs text-white">
              Powered by advanced AI to help the planet build stronger,
              healthier relationships
            </p>
          </div>
        </div>
      </footer>{" "}
      {/* End Footer Section */}
    </div> // End Page Container
  ); // End Component Return
} // End Component Definition
