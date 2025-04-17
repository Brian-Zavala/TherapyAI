"use client";

// React and Next.js imports
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useEffect, Suspense } from "react";

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

// Custom components
import TypewriterText from "@/components/TypewriterText";

// Your custom component imports
import ButtonWithSound from "@/components/ButtonWithSound";
import SpiralTextAnimation from "@/components/SpiralTextAnimation";
import ScrollDownArrow from "@/components/ScrollDownArrow";
import Hero3DBackground from "@/components/Hero3DBackground";
import HeroHighlightDemo from "@/components/ui/hero-highlight-demo";

// Background gradient component
import { BackgroundGradient } from "@/components/ui/background-gradient";

// Media query helper constant
const MOBILE_BREAKPOINT = 768; // px

// --- Optimization: Removed custom smoothScroll function ---
// Relies on CSS `scroll-behavior: smooth;` for anchor links now.
// Button clicks will use element.scrollIntoView().

// --- Standard Animation Variants ---
// (Copied directly from your original code)
const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// Stagger container - kept definition if needed elsewhere, but applied directly below
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Default stagger, can be overridden
    },
  },
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
  const [isMobileView, setIsMobileView] = useState(false);

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
  // (Copied from original, checks for reduced motion)
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

  // --- Refs for Sections and Key Elements ---
  // (Copied from original, added videoRef and ctaRef)
  const heroRef = useRef<HTMLElement>(null); // Specify element type
  const featuresRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const testimonialsRef = useRef<HTMLElement>(null);
  const plansRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null); // Added ref for CTA section
  const videoRef = useRef<HTMLVideoElement>(null); // Specific ref for video element

  // --- Scroll-Linked Opacity (Copied from original) ---
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
  const isHeroInView = useInView(heroRef, { amount: 0.1 }); // For 3D background prop

  const statsHeadingView = useViewportAnimation({ threshold: 0.5, once: true });
  const statsCostsTradPulse1 = useViewportAnimation({ threshold: 0.5 });
  const statsCostsTradPulse2 = useViewportAnimation({ threshold: 0.5 });
  const statsCostsTradPulse3 = useViewportAnimation({ threshold: 0.5 });
  const statsCostsAIPulse1 = useViewportAnimation({ threshold: 0.5 });
  const statsCostsAIPulse2 = useViewportAnimation({ threshold: 0.5 });
  const statsVideoCardView = useViewportAnimation({ threshold: 0.3 });
  const statsIconsPulseView = useViewportAnimation({ threshold: 0.2 });

  const testimonialsBgView = useViewportAnimation({ threshold: 0.1 });
  const plansBeamView = useViewportAnimation({ threshold: 0.1 });
  const ctaBgView = useViewportAnimation({ threshold: 0.1 });

  // --- Video Play/Pause Logic ---
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      if (statsVideoCardView.isInView && !prefersReducedMotion) {
        if (videoElement.paused) {
          videoElement.play().catch(console.error);
        }
      } else {
        if (!videoElement.paused) {
          videoElement.pause();
        }
      }
    }
  }, [statsVideoCardView.isInView, prefersReducedMotion]);

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

  // Stats Heading Text Shadow
  const textShadowVariant = {
    hidden: {
      textShadow: "0px 0px 0px rgba(66, 153, 225, 0)",
      transition: { duration: 0.2 },
    },
    visible: {
      textShadow: [
        "0px 0px 0px rgba(66, 153, 225, 0)",
        "0px 0px 10px rgba(66, 153, 225, 0.3)",
        "0px 0px 0px rgba(66, 153, 225, 0)",
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "mirror" as "mirror",
      },
    },
  };

  // Testimonials Background Cycle
  const testimonialsBgVariant = {
    hidden: {
      background:
        "linear-gradient(to bottom right, rgba(238, 242, 255, 0.9), rgba(237, 233, 254, 0.9))",
      transition: { duration: 0.5 },
    },
    visible: {
      background: [
        "linear-gradient(to bottom right, rgba(238, 242, 255, 0.9), rgba(237, 233, 254, 0.9))",
        "linear-gradient(to bottom right, rgba(224, 231, 255, 0.95), rgba(221, 214, 254, 0.95))",
        "linear-gradient(to bottom right, rgba(238, 242, 255, 0.9), rgba(237, 233, 254, 0.9))",
      ],
      transition: { duration: 5, repeat: Infinity, repeatType: "mirror" },
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
    <div className="flex flex-col items-center w-full overflow-x-hidden bg-gradient-to-b from-white via-indigo-50/30 to-purple-50/30">
      {/* Hero section with 3D Background */}
      <section
        ref={heroRef} // Assign ref
        className="w-full relative overflow-hidden min-h-[70vh] sm:min-h-[85vh] md:min-h-[95vh] shadow-lg shadow-indigo-500/10 rounded-b-[4rem] md:rounded-b-[5rem]" // Original classes
      >
        {/* Background Gradient (Original) */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-100 to-white/60 z-0"></div>
        {/* Background Image (Original) */}
        <div className="absolute inset-0 w-full h-full z-0">
          <Image
            src="/images/happy-couple.jpg"
            alt="Happy couple laughing together"
            fill
            className="object-cover object-center opacity-50 mix-blend-luminosity rounded-b-[4rem] md:rounded-b-[5rem]"
            priority // Keep priority for LCP
            sizes="100vw"
            quality={80} // Original quality
          />
          {/* Gradient overlay (Original) */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/50 via-white/10 to-transparent rounded-b-[4rem] md:rounded-b-[5rem]"></div>
        </div>
        {/* Integrated 3D Background (Original Structure) */}
        <Suspense fallback={null}>
          <Hero3DBackground
            pointColor="#a5b4fc" // Original props
            pointSize={0.0035} // Original props
            // Optimization: Pass visibility state
            isVisible={isHeroInView}
          />
        </Suspense>
        {/* Hero content with enhanced animations (Original Structure) */}
        <motion.div
          className="relative z-10 flex flex-col items-center text-center p-4 sm:py-12 md:py-20 min-h-[70vh] sm:min-h-[80vh] md:min-h-[90vh] justify-center"
          // Keep original initial animation logic
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.6, 0.05, 0.01, 0.9] }} // Use original duration/ease
        >
          {/* Spiral Text Animation (Original Structure) */}
          <motion.div
            className="w-full mb-8 md:mb-10 px-2 py-1 overflow-visible"
            initial={{ opacity: 0 }} // Keep original animation
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }} // Keep original transition
          >
            <SpiralTextAnimation className="w-full" />
          </motion.div>

          {/* Hero Highlight Demo */}
          <div className="mb-12 md:mb-16">
            <HeroHighlightDemo />
          </div>

          {/* Hero Button Container (Original Structure) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }} // Keep original animation
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              // Keep original transition
              duration: 0.5,
              delay: 0.6,
              type: "spring",
              stiffness: 200,
            }}
            className="w-full sm:w-auto px-4 sm:px-0" // Original classes
          >
            {/* Button Hover/Tap Wrapper (Original Structure) */}
            <motion.div
              variants={floatingButtonVariants} // Keep original variants
              initial="rest"
              whileHover={prefersReducedMotion ? "rest" : "hover"} // Use optimized check
              whileTap={prefersReducedMotion ? "rest" : "tap"} // Use optimized check
            >
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
            </motion.div>
          </motion.div>

          {/* Scroll Down Arrow (Original Structure) */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 optimize-gpu">
            {" "}
            {/* Keep original class if needed */}
            <ScrollDownArrow
              // Optimization: Use standard smooth scroll handler
              onClick={() =>
                handleScrollClick(featuresRef as React.RefObject<HTMLElement>)
              }
            />
          </div>
        </motion.div>{" "}
        {/* End Hero Content */}
      </section>{" "}
      {/* End Hero Section */}
      {/* Mental Health & Therapy Costs Section */}
      {/* Use simple whileInView for section fade-in */}
      <motion.section
        ref={statsRef} // Assign ref
        className="w-full py-20 bg-gradient-to-br from-pink-500 via-blue-500 to-pink-500 " // Original classes
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 backdrop-blur-md    ">
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
              <span className="relative z-10 text-transparent bg-clip-text bg-stone-50 py-1 text-sm sm:text-lg md:text-2xl overflow-visible">
                Making Therapy{" "}
                <span className="underline decoration-green-500 decoration-4 underline-offset-4">
                  <TypewriterText
                    text="Accessible"
                    isInView={statsHeadingView.isInView}
                    className="text-stone-50"
                  />
                </span>{" "}
                for Everyone
              </span>
              {/* Original background blur element */}
              <span className="absolute -inset-1 rounded-lg bg-black/20 -z-10 blur-lg opacity-10"></span>
            </motion.span>
          </motion.h2>
          {/* Grid Container */}
          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            {/* Therapy Costs Card (Left Side) */}
            {/* Use simple whileInView for card entry */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: getOptimizedThreshold(0.1) }}
              variants={fadeInUp} // Original variant
              className="bg-white/20 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border border-white/30 shadow-lg relative overflow-hidden" // Original classes
            >
              {/* Original content */}
              <h3 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6 text-white">
                Average Therapy Costs
              </h3>
              <p className="text-gray-600 mb-6 sm:mb-8 relative z-10">
                Traditional therapy can be costly and inaccessible for many. We
                break down these barriers by offering affordable, AI-powered
                therapy solutions that provide the same quality of care at a
                fraction of the cost.
              </p>
              {/* Inner grid for cost boxes */}
              <div className="grid grid-cols-1 gap-4 sm:gap-5 mb-8">
                {/* Traditional Therapy Box */}
                <div className="relative">
                  <BackgroundGradient
                    colorScheme="traditional"
                    containerClassName="w-full"
                    borderWidth={5}
                  >
                    <div className="p-5 sm:p-6 rounded-xl shadow-sm relative bg-gray-100">
                      {/* Original Heading */}
                      <h4 className="text-lg font-semibold text-gray-800 mb-3 flex flex-wrap items-center gap-2 relative z-10">
                        <span className="bg-gray-700 text-white px-3 py-1 rounded-lg">
                          TRADITIONAL
                        </span>
                        <span>Therapy</span>
                        <span className="sm:ml-auto text-xs sm:text-sm text-red-600 font-bold border border-red-300 px-2 py-1 rounded-lg">
                          HIGH COST
                        </span>
                      </h4>
                      {/* Grid for individual traditional costs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
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
                              className="bg-white p-4 rounded-xl text-center shadow-sm relative overflow-hidden border border-gray-200"
                            >
                              {/* Original decorative element */}
                              <span className="absolute top-0 right-0 bg-gray-200/50 w-12 h-12 rounded-full -mr-6 -mt-6"></span>
                              {/* Price container */}
                              <div className="relative inline-block mb-2">
                                {/* Controlled Red Pulse */}
                                <motion.span
                                  className="absolute inset-0 border-2 border-red-300/70 rounded-full" // Added shape
                                  variants={pulseBorderVariant(index * 0.1)} // Use defined variant + delay
                                  initial="hidden"
                                  animate={
                                    prefersReducedMotion
                                      ? "hidden"
                                      : pulseControls.controls
                                  } // Controlled animation
                                />
                                {/* Original price span */}
                                <span className="block text-red-600 font-bold text-xl sm:text-2xl relative z-10">
                                  {session.price}
                                </span>
                              </div>
                              {/* Original tag */}
                              <div className="mt-1">
                                <span className="inline-block bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
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
                        *Average costs per session based on nationwide survey
                        data
                      </div>
                    </div>
                  </BackgroundGradient>
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
                  <BackgroundGradient
                    colorScheme="ai"
                    containerClassName="w-full"
                    borderWidth={5}
                  >
                    <div className="p-5 sm:p-6 rounded-xl shadow-lg relative overflow-hidden bg-gradient-to-r from-blue-50 to-blue-100">
                      {/* Original heading */}
                      <h4 className="text-lg font-semibold text-blue-500 mb-4 relative z-10 flex flex-wrap items-center gap-2">
                        <span className="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-3 py-1 rounded-lg">
                          AI-POWERED
                        </span>
                        <span>Therapy</span>
                        <span className="sm:ml-auto text-xs sm:text-sm bg-green-100 text-green-700 font-bold px-2 py-1 rounded-lg flex items-center">
                          <svg
                            className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /* Original SVG */
                          >
                            {" "}
                            <path /* Original path */ />{" "}
                          </svg>
                          AFFORDABLE
                        </span>
                      </h4>
                      {/* Grid for AI costs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5 relative z-10">
                        {/* 30 Min Session Card */}
                        {/* Simple fade-in for this inner card */}
                        <motion.div
                          ref={statsCostsAIPulse1.ref} // Ref for pulse control
                          className="bg-white rounded-xl p-4 pt-8 sm:p-4 shadow-md border border-indigo-200 relative" // Original classes
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.1 }}
                        >
                          {/* Original card title */}
                          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg -mt-7 mb-3 shadow-md inline-block text-sm sm:text-base">
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
                              <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0">
                                {" "}
                                <path d="M5 13l4 4L19 7" />{" "}
                              </svg>
                              <span>Vapi platform: $1.50</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0">
                                {" "}
                                <path d="M5 13l4 4L19 7" />{" "}
                              </svg>
                              <span>Claude 3.7 AI: $0.07</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0">
                                {" "}
                                <path d="M5 13l4 4L19 7" />{" "}
                              </svg>
                              <span>Voice synthesis: $0.75</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0">
                                {" "}
                                <path d="M5 13l4 4L19 7" />{" "}
                              </svg>
                              <span>Transcription: $0.30</span>
                            </li>
                          </ul>
                        </motion.div>

                        {/* 60 Min Session Card */}
                        {/* Simple fade-in for this inner card */}
                        <motion.div
                          ref={statsCostsAIPulse2.ref} // Ref for pulse control
                          className="bg-white rounded-xl p-4 pt-8 sm:p-4 shadow-md border border-indigo-200 relative" // Original classes
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 }}
                        >
                          {/* Original card title */}
                          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg -mt-7 mb-3 shadow-md inline-block text-sm sm:text-base">
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
                              <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0">
                                {" "}
                                <path d="M5 13l4 4L19 7" />{" "}
                              </svg>
                              <span>Vapi platform: $3.00</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0">
                                {" "}
                                <path d="M5 13l4 4L19 7" />{" "}
                              </svg>
                              <span>Claude 3.7 AI: $0.15</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0">
                                {" "}
                                <path d="M5 13l4 4L19 7" />{" "}
                              </svg>
                              <span>Voice synthesis: $1.50</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0">
                                {" "}
                                <path d="M5 13l4 4L19 7" />{" "}
                              </svg>
                              <span>Transcription: $0.60</span>
                            </li>
                          </ul>
                        </motion.div>
                      </div>{" "}
                      {/* End AI costs grid */}
                      {/* Final savings text */}
                      {/* Simple whileInView */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.6 }} // Original transition
                        className="text-center text-white font-bold p-3 sm:p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl relative z-10 shadow-lg text-sm sm:text-base" // Original classes
                      >
                        Save up to 97% compared to traditional therapy costs!
                      </motion.div>
                    </div>
                  </BackgroundGradient>
                </motion.div>{" "}
                {/* End AI Powered Box */}
              </div>{" "}
              {/* End inner grid for cost boxes */}
            </motion.div>{" "}
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
              className="bg-black/25 backdrop-blur-[2px] p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-200 relative overflow-hidden" // Original classes
            >
              {/* Video Background */}
              <div className="absolute inset-0 w-full h-full z-0 overflow-hidden rounded-3xl">
                <video
                  ref={videoRef} // Assign ref
                  // Removed autoPlay - controlled by useEffect
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-80" // Original classes
                  // poster="/videos/rain-poster.jpg" // Optional: Add poster image
                >
                  <source src="/videos/depressed.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                {/* Overlay (Original) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-indigo-900/30 to-purple-900/30 z-0"></div>
              </div>
              {/* Card Content */}
              <h3 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6 text-white relative z-10">
                Mental Health Challenges
              </h3>
              {/* Container to control all icon pulses */}
              <div
                ref={statsIconsPulseView.ref}
                className="space-y-5 sm:space-y-6 relative z-10"
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
                    transition={{ delay: getOptimizedDelay(index * 0.1) }} // Apply optimized stagger
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
                      {/* Controlled Icon Pulses (using parent ref/controls) */}
                      <motion.span
                        className="absolute inset-0 rounded-full border border-indigo-300/30" // Original class
                        variants={pulseIconRingVariant(0)} // Use defined variant
                        initial="hidden"
                        animate={
                          prefersReducedMotion
                            ? "hidden"
                            : statsIconsPulseView.controls
                        } // Controlled by parent
                      />
                      <motion.span
                        className="absolute inset-0 rounded-full border border-indigo-300/30"
                        variants={pulseIconRingVariant(1.33)} // Use defined variant + delay
                        initial="hidden"
                        animate={
                          prefersReducedMotion
                            ? "hidden"
                            : statsIconsPulseView.controls
                        }
                      />
                      <motion.span
                        className="absolute inset-0 rounded-full border border-indigo-300/30"
                        variants={pulseIconRingVariant(2.66)} // Use defined variant + delay
                        initial="hidden"
                        animate={
                          prefersReducedMotion
                            ? "hidden"
                            : statsIconsPulseView.controls
                        }
                      />
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
          </div>{" "}
          {/* End Main Grid */}
          {/* Access Gap Box */}
          {/* Simple whileInView */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: getOptimizedThreshold(0.2) }} // Original threshold logic
            transition={{ duration: getOptimizedDuration(0.7) }} // Original duration logic
            variants={fadeInUp} // Use standard variant
            className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-100 text-center relative overflow-hidden" // Original classes
          >
            {/* Original decorative elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-indigo-100/30 to-purple-100/30 rounded-full -ml-32 -mt-32"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-indigo-100/30 to-purple-100/30 rounded-full -mr-32 -mb-32"></div>

            {/* Original heading */}
            <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-5 text-blue-500 relative z-10">
              Bridging the Access Gap
            </h3>
            {/* Original paragraph */}
            <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8 relative z-10">
              Many people struggle to find suitable therapists due to location,
              cost, and scheduling constraints. Our AI-powered platform removes
              these barriers, making quality relationship therapy accessible to
              anyone with an internet connection, at a fraction of the cost of
              traditional in-person sessions.
            </p>

            {/* Original Button */}
            <motion.div
              variants={floatingButtonVariants} // Original variants
              initial="rest"
              whileHover={prefersReducedMotion ? "rest" : "hover"} // Check reduced motion
              whileTap={prefersReducedMotion ? "rest" : "tap"} // Check reduced motion
              className="relative z-10 inline-block" // Original class
            >
              <ButtonWithSound
                as={Link}
                href="/dashboard/therapy"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium py-3 sm:py-4 px-8 sm:px-10 rounded-full text-base sm:text-lg shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-xl hover:from-blue-400 hover:to-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-400 relative overflow-hidden" /* Original classes */
              >
                <span className="relative z-10">
                  Experience Affordable Therapy
                </span>
                {/* Original overlay spans */}
                <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 hover:opacity-30 transition-opacity duration-300"></span>
                <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 opacity-30 blur-lg"></span>
              </ButtonWithSound>
            </motion.div>
          </motion.div>{" "}
          {/* End Access Gap Box */}
        </div>{" "}
        {/* End Max Width Container */}
      </motion.section>{" "}
      {/* End Stats Section */}
      {/* Features section with creative card animations */}
      {/* Apply scroll-linked opacity directly */}
      <motion.section
        ref={featuresRef} // Assign ref
        className="w-full py-16 sm:py-20 bg-white" // Original classes
        // Apply opacity driven by useTransform hook
        style={{ opacity: featuresOpacity }}
        // Removed initial/animate/transition from section as opacity handles visibility
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-14 sm:mb-20 text-transparent bg-clip-text bg-gradient-to-r py-1 overflow-visible from-blue-500 to-blue-600" // Original classes
          >
            How We Support Your Relationship
          </motion.h2>
          {/* Feature Card Grid - Apply stagger directly */}
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" // Original classes
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
            {[
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
                    className="text-blue-500"
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
                    className="text-blue-500"
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
                    className="text-blue-500"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                ),
              },
            ].map((feature, index) => (
              // Feature Card Item
              <motion.div
                key={index} // Use index as key if titles aren't unique, otherwise feature.title
                variants={fadeInUp} // Each card uses the variant defined in the parent
                whileHover={
                  !prefersReducedMotion
                    ? {
                        // Original hover effect, check reduced motion
                        boxShadow:
                          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                        backgroundColor: "rgb(249, 250, 255)",
                      }
                    : {}
                }
                className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 border border-indigo-100 group" // Original classes
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
                  className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-indigo-200 transition-colors duration-300 shadow-md" // Original classes
                >
                  {feature.icon}
                </motion.div>
                {/* Card Title */}
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-blue-700 group-hover:text-indigo-600 transition-colors duration-300">
                  {" "}
                  {/* Original classes */}
                  {feature.title}
                </h3>
                {/* Card Description */}
                <p className="text-sm sm:text-base text-gray-600">
                  {" "}
                  {/* Original classes */}
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>{" "}
          {/* End Feature Card Grid */}
        </div>{" "}
        {/* End Max Width Container */}
      </motion.section>{" "}
      {/* End Features Section */}
      {/* Subscription Plans Section */}
      {/* Simple whileInView fade-in for section */}
      <motion.section
        ref={plansRef} // Assign ref
        className="w-full py-16 sm:py-20 bg-white relative overflow-hidden" // Original classes + relative/overflow for beam
        initial="hidden" // Use variants
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
        {/* Controlled Sliding Beam Container */}
        <motion.div
          ref={plansBeamView.ref} // Ref for viewport control
          className="absolute left-0 w-full h-32 -top-16 opacity-70 pointer-events-none z-0" // Original classes + z-0
          initial="hidden" // Start hidden
          animate={prefersReducedMotion ? "hidden" : plansBeamView.controls} // Controlled animation
          variants={plansBeamVariant} // Use defined variant
          // Removed original whileInView/transition from this wrapper
        >
          {/* The actual beam element (no animation props needed here) */}
          <div
            className="absolute h-[50px] w-[1000px] opacity-30" // Original classes
            style={{
              // Original styles
              background:
                "linear-gradient(90deg, rgba(79, 70, 229, 0) 0%, rgba(79, 70, 229, 0.3) 50%, rgba(79, 70, 229, 0) 100%)",
              rotate: "-30deg",
            }}
          />
        </motion.div>{" "}
        {/* End Beam Container */}
        {/* Section Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {" "}
          {/* Add relative z-10 */}
          {/* Section Heading - simple whileInView */}
          <motion.div
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
            className="text-center mb-12 sm:mb-16" // Original classes
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text py-1 overflow-visible bg-gradient-to-r from-blue-500 to-blue-600 mb-4">
              {" "}
              {/* Original classes */}
              Affordable Subscription Plans
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-base sm:text-lg">
              {" "}
              {/* Original classes */}
              Choose the plan that fits your needs and relationship goals. All
              our plans offer access to our AI therapy platform with different
              session limits and features to accommodate various budgets and
              requirements.
            </p>
          </motion.div>
          {/* Plan Cards Grid - Apply stagger */}
          <motion.div
            className="grid md:grid-cols-3 gap-8" // Original classes
            initial="hidden" // Parent controls children
            whileInView="visible"
            viewport={{ once: true, amount: getOptimizedThreshold(0.1) }} // Trigger earlier
            variants={{
              visible: {
                transition: { staggerChildren: getOptimizedDelay(0.15) },
              },
            }} // Apply optimized stagger
          >
            {/* Basic Plan Card */}
            <motion.div
              variants={fadeInUp} // Use variant from parent
              whileHover={
                !prefersReducedMotion
                  ? { boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" }
                  : {}
              } // Original hover, check reduced motion
              className="bg-gradient-to-b from-white to-indigo-50 rounded-2xl shadow-lg overflow-hidden border border-indigo-100 transition-all duration-500" // Original classes
            >
              <div className="p-6 sm:p-8">
                {" "}
                {/* Original content structure */}
                <h3 className="text-xl font-bold text-blue-600 mb-2">
                  Basic Plan
                </h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-3xl font-bold text-blue-600">$19</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Unlimited therapy sessions</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>60 minutes per session</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Comprehensive relationship assessment</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Session transcripts & detailed insights</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Priority support & customized therapy options</span>
                  </li>
                </ul>
                <motion.div
                  variants={floatingButtonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <ButtonWithSound
                    as={Link}
                    href="/dashboard/therapy"
                    className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-xl shadow-md hover:bg-blue-700 transition duration-300 flex items-center justify-center"
                  >
                    Get Started
                  </ButtonWithSound>
                </motion.div>
              </div>
            </motion.div>{" "}
            {/* End Basic Plan */}
            {/* Standard Plan Card (Highlighted) */}
            <motion.div
              variants={fadeInUp} // Use variant from parent
              whileHover={
                !prefersReducedMotion
                  ? { boxShadow: "0 25px 50px -12px rgba(124, 58, 237, 0.25)" }
                  : {}
              } // Original hover, check reduced motion
              className="bg-gradient-to-b from-white to-indigo-50 rounded-2xl shadow-xl overflow-hidden border border-green-500 md:-mt-4 md:-mb-4 relative z-10 transition-all duration-500" // Original classes (Tailwind v3 border-1 is just border)
            >
              <div className="bg-blue-500 text-white text-center text-sm font-semibold py-1">
                MOST POPULAR
              </div>{" "}
              {/* Original banner */}
              <div className="p-6 sm:p-8">
                {" "}
                {/* Original content structure */}
                <h3 className="text-xl font-bold text-blue-600 mb-2">
                  Standard Plan
                </h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-3xl font-bold text-blue-600">$39</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>10 therapy sessions/month</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>60 minutes per session</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Comprehensive relationship assessment</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Session transcripts & summaries</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Advanced relationship insights</span>
                  </li>
                </ul>
                <motion.div
                  variants={floatingButtonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <ButtonWithSound
                    as={Link}
                    href="/dashboard/therapy"
                    className="w-full bg-gradient-to-r from-green-400 to-green-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg hover:overflow-hidden hover:ring-1 hover:ring-blue-700 hover:from-green-500 hover:to-green-600 transition duration-300 flex items-center justify-center"
                  >
                    {" "}
                    {/* ring-bg-blue-700 likely needs adjustment -> ring-blue-700 */}
                    Select Plan
                  </ButtonWithSound>
                </motion.div>
              </div>
            </motion.div>{" "}
            {/* End Standard Plan */}
            {/* Premium Plan Card */}
            <motion.div
              variants={fadeInUp} // Use variant from parent
              whileHover={
                !prefersReducedMotion
                  ? { boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" }
                  : {}
              } // Original hover, check reduced motion
              className="bg-gradient-to-b from-white to-indigo-50 rounded-2xl shadow-lg overflow-hidden border border-indigo-100 transition-all duration-500" // Original classes
            >
              <div className="p-6 sm:p-8">
                {" "}
                {/* Original content structure */}
                <h3 className="text-xl font-bold text-blue-600 mb-2">
                  Premium Plan
                </h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-3xl font-bold text-blue-600">$69</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Unlimited therapy sessions</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>60 minutes per session</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Comprehensive relationship assessment</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Session transcripts & detailed insights</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Priority support & customized therapy options</span>
                  </li>
                </ul>
                <motion.div
                  variants={floatingButtonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <ButtonWithSound
                    as={Link}
                    href="/dashboard/therapy"
                    className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-xl shadow-md hover:bg-blue-700 transition duration-300 flex items-center justify-center"
                  >
                    Get Premium
                  </ButtonWithSound>
                </motion.div>
              </div>
            </motion.div>{" "}
            {/* End Premium Plan */}
          </motion.div>{" "}
          {/* End Plan Cards Grid */}
          {/* Free Trial Text - simple whileInView */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }} // Animate once
            transition={{
              duration: getOptimizedDuration(0.5),
              delay: getOptimizedDelay(0.6),
            }} // Original transition
            variants={fadeInUp} // Use standard variant
            className="text-center mt-10 text-gray-500 text-sm" // Original classes
          >
            All plans include a 7-day free trial. Cancel anytime. No credit card
            required to start.
          </motion.div>
        </div>{" "}
        {/* End Max Width Container */}
      </motion.section>{" "}
      {/* End Plans Section */}
      {/* Call to action section */}
      {/* Simple fade-in for section container */}
      <motion.section
        ref={ctaRef} // Assign ref
        className="w-full py-20 sm:py-24 pb-32 bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative" // Original classes + relative/overflow
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8" // Original classes
            >
              Ready to Transform Your Relationship?
            </motion.h2>
            {/* CTA Paragraph - simple whileInView */}
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }} // Animate once
              transition={{
                duration: getOptimizedDuration(0.7),
                delay: getOptimizedDelay(0.2),
              }} // Original transition + optimized helpers
              variants={fadeInUp} // Use standard variant
              className="text-indigo-100 text-base sm:text-lg max-w-3xl mx-auto mb-8 sm:mb-10" // Original classes
            >
              Start your journey to a healthier relationship today with our
              AI-powered therapy platform.
            </motion.p>
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
                className="bg-white text-blue-500 font-medium py-3 sm:py-4 px-8 sm:px-12 rounded-full text-base sm:text-lg shadow-lg shadow-indigo-900/30 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-300 relative overflow-hidden" // Original classes
              >
                <span className="relative z-10">
                  Begin Your Therapy Journey
                </span>
                {/* Original overlay span */}
                <span className="absolute inset-0 bg-indigo-100 opacity-0 hover:opacity-30 transition-opacity duration-300"></span>
              </ButtonWithSound>
            </motion.div>
          </div>
        </div>{" "}
        {/* End Max Width Container */}
      </motion.section>{" "}
      {/* End CTA Section */}
      {/* Footer section (Using <footer> tag for semantics) */}
      <footer className="w-full py-10 bg-green-500/50 text-white">
        {" "}
        {/* Original classes */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {" "}
          {/* Original container */}
          <div className="text-center">
            {" "}
            {/* Original wrapper */}
            <p className="text-sm text-white mb-4">
              © {new Date().getFullYear()} TherapyAI. All rights reserved.
            </p>
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
