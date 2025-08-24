"use client"

import { Suspense, lazy, useState, useEffect, useCallback, memo } from 'react'
import dynamic from 'next/dynamic'
import { useReducedMotion } from 'framer-motion'
import { ProgressiveImageSlider } from '@/components/ui/progressive-image-slider'

// Optimized dynamic imports with proper loading states
const HeroSection = lazy(() => import('@/components/sections/HeroSection'))
const StatsSection = lazy(() => import('@/components/sections/StatsSection'))
const FeaturesSection = lazy(() => import('@/components/sections/FeaturesSection'))
const PlansSection = lazy(() => import('@/components/sections/PlansSection'))
const FAQSection = lazy(() => import('@/components/sections/FAQSection'))

// Critical components loaded immediately
import ButtonWithSound from '@/components/ui/buttons/ButtonWithSound'
import ScrollDownArrow from '@/components/ui/buttons/ScrollDownArrow'
import Link from 'next/link'

// Performance monitoring
const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('LCP:', entry.startTime)
        }
        if (entry.entryType === 'first-input') {
          console.log('FID:', entry.processingStart - entry.startTime)
        }
      }
    })
    
    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] })
    
    return () => observer.disconnect()
  }, [])
}

// Optimized image configurations
const createImageConfig = (src: string, isMobile: boolean) => ({
  src,
  width: isMobile ? 1200 : 1920,
  height: isMobile ? 800 : 1080,
  alt: 'Couple therapy session background'
})

// Memoized section skeletons for better loading experience
const HeroSkeleton = memo(() => (
  <div className="w-full h-screen bg-gradient-to-br from-purple-900/20 to-blue-900/20 animate-pulse">
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-96 h-12 bg-white/10 rounded-lg animate-pulse"></div>
        <div className="w-80 h-8 bg-white/10 rounded-lg animate-pulse"></div>
        <div className="w-40 h-12 bg-purple-500/20 rounded-lg animate-pulse"></div>
      </div>
    </div>
  </div>
))

const SectionSkeleton = memo(({ height = "h-96" }: { height?: string }) => (
  <div className={`w-full ${height} bg-gray-900/5 animate-pulse rounded-lg`}>
    <div className="p-8 space-y-4">
      <div className="w-64 h-8 bg-gray-300/20 rounded animate-pulse"></div>
      <div className="w-full h-4 bg-gray-300/20 rounded animate-pulse"></div>
      <div className="w-3/4 h-4 bg-gray-300/20 rounded animate-pulse"></div>
    </div>
  </div>
))

export default function OptimizedLandingPage() {
  const [isMobileView, setIsMobileView] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  
  // Performance monitoring hook
  usePerformanceMonitoring()
  
  // Optimized mobile detection with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const checkMobile = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setIsMobileView(window.innerWidth < 768)
      }, 100)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile, { passive: true })
    return () => {
      window.removeEventListener('resize', checkMobile)
      clearTimeout(timeoutId)
    }
  }, [])
  
  // Optimized image arrays - load only what's needed
  const heroImages = isMobileView 
    ? [
        "/images/home/3.webp",
        "/images/home/2.webp", 
        "/images/home/happy-person.webp",
        "/images/home/group.webp"
      ].map(src => createImageConfig(src, true))
    : [
        "/images/home/large/1-lg.webp",
        "/images/home/large/2-lg.webp",
        "/images/home/large/3-lg.webp",
        "/images/home/large/4-lg.webp"
      ].map(src => createImageConfig(src, false))
  
  return (
    <main className="min-h-screen">
      {/* Critical CSS for above-the-fold content */}
      <style jsx>{`
        .hero-container {
          background: linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%);
        }
      `}</style>
      
      {/* Hero Section - Above the fold, critical loading */}
      <section className="hero-container relative w-full min-h-screen overflow-hidden">
        <ProgressiveImageSlider
          images={heroImages}
          autoSlide={!prefersReducedMotion}
          slideDuration={4000}
          initialBatchSize={1} // Load only first image immediately
          loadBatchSize={2}     // Load 2 more after interaction
          className="absolute inset-0 z-0"
        />
        
        {/* Hero content overlay */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="text-center text-white max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Transform Your Relationship with{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI-Powered Therapy
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-2xl mx-auto">
              Experience personalized couple therapy sessions designed to strengthen 
              your bond and improve communication.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <ButtonWithSound
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Start Your Journey
                </ButtonWithSound>
              </Link>
              
              <Link href="#features">
                <ButtonWithSound
                  className="border-2 border-white/20 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 hover:bg-white/10"
                >
                  Learn More
                </ButtonWithSound>
              </Link>
            </div>
          </div>
        </div>
        
        <ScrollDownArrow />
      </section>
      
      {/* Progressive loading of other sections */}
      <div className="space-y-16 py-16">
        <Suspense fallback={<SectionSkeleton height="h-64" />}>
          <StatsSection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton height="h-96" />}>
          <FeaturesSection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton height="h-screen" />}>
          <PlansSection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton height="h-96" />}>
          <FAQSection />
        </Suspense>
      </div>
    </main>
  )
}

// Export with React.memo for prop change optimization
export const LandingPageOptimized = memo(OptimizedLandingPage)