'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useMotionValueEvent, useAnimation } from 'framer-motion'
import ButtonWithSound from '@/components/ButtonWithSound'
import { useRef, useState, useEffect } from 'react'

// Custom smooth scroll function
const smoothScroll = (target: HTMLElement, duration = 1000) => {
  const targetPosition = target.getBoundingClientRect().top + window.scrollY
  const startPosition = window.scrollY
  const distance = targetPosition - startPosition
  let startTime: number | null = null

  const animation = (currentTime: number) => {
    if (startTime === null) startTime = currentTime
    const timeElapsed = currentTime - startTime
    const progress = Math.min(timeElapsed / duration, 1)
    
    // Easing function - easeInOutCubic
    const ease = (t: number) => t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2
    
    window.scrollTo(0, startPosition + distance * ease(progress))
    
    if (timeElapsed < duration) {
      requestAnimationFrame(animation)
    }
  }
  
  requestAnimationFrame(animation)
}

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
}

export default function Home() {
  // Cursor position tracking removed for performance
  const heroRef = useRef(null)
  const featuresRef = useRef(null)
  const statsControls = useAnimation()
  
  // Standard scroll tracking
  const { scrollYProgress } = useScroll()
  
  // Enhanced parallax effect for hero image with smoother motion
  const bgY = useTransform(scrollYProgress, [0, 0.3], [0, -50])
  
  // Cursor tracking effect removed for performance
  
  // Animation trigger based on scroll position with enhanced performance
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest > 0.1) {
      statsControls.start("visible")
    }
  })
  
  // Handle smooth scrolling when clicking on navigation links
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      
      if (link && link.hash && link.hash.startsWith('#')) {
        e.preventDefault()
        const targetElement = document.querySelector(link.hash)
        
        if (targetElement) {
          smoothScroll(targetElement as HTMLElement, 1500)
        }
      }
    }
    
    // Add event listener
    document.addEventListener('click', handleLinkClick)
    
    // Clean up
    return () => document.removeEventListener('click', handleLinkClick)
  }, [])
  
  // Floating animation for button
  const floatingButtonVariants = {
    hover: { scale: 1.05, boxShadow: "0 10px 25px rgba(124, 58, 237, 0.4)" },
    tap: { scale: 0.98 },
    rest: { scale: 1 }
  }

  return (
    <div className="flex flex-col items-center w-full overflow-hidden">
      {/* Cursor glow effect removed for performance */}
      
      {/* Hero section with enhanced animations */}
      <section ref={heroRef} className="w-full relative overflow-hidden min-h-[70vh] sm:min-h-[80vh] md:min-h-[90vh] shadow-lg shadow-indigo-500/10 rounded-b-[3rem]">
        {/* Background gradient with enhanced colors */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-100/80 via-purple-100/70 to-white/40 z-0"></div>
        
        {/* Static background image */}
        <div className="absolute inset-0 w-full h-full z-0">
          <Image
            src="/images/happy-couple.jpg"
            alt="Happy couple laughing together"
            fill
            className="object-cover object-center opacity-40 md:opacity-50 scale-110 rounded-b-[3rem]" 
            priority
            sizes="100vw"
            quality={85}
          />
          {/* Gradient overlay with reduced opacity */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/40 to-purple-100/40"></div>
        </div>
        
        {/* Static decorative elements instead of floating particles */}
        <div className="absolute inset-0 w-full h-full overflow-hidden z-1 opacity-40">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 sm:w-5 sm:h-5 rounded-full bg-indigo-300/30"
              style={{
                left: `${Math.floor(Math.random() * 80 + 10)}%`,
                top: `${Math.floor(Math.random() * 80 + 10)}%`,
                opacity: 0.2 + Math.random() * 0.3
              }}
            />
          ))}
        </div>
        
        {/* Hero content with enhanced animations */}
        <div className="relative z-10 flex flex-col items-center text-center p-4 sm:py-12 md:py-20 min-h-[70vh] sm:min-h-[80vh] md:min-h-[90vh] justify-center">
          <h1 
            className="text-3xl sm:text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600 mb-8 md:mb-10 px-2 tracking-tight leading-normal py-1 overflow-visible"
          >
            Strengthen Your Relationships
          </h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-base sm:text-xl text-gray-700 max-w-2xl mb-12 md:mb-16 leading-relaxed"
            >
            Discover AI-powered therapy that helps you build healthier, more fulfilling relationships with those who matter most.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="w-full sm:w-auto px-4 sm:px-0"
          >
            <motion.div
              variants={floatingButtonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
            >
              <ButtonWithSound
                as={Link}
                href="/dashboard/therapy" 
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 
                text-white 
                font-medium 
                py-3 sm:py-4
                px-8 sm:px-10
                rounded-full 
                text-base sm:text-lg 
                shadow-lg shadow-blue-500/30
                transition-all duration-300
                hover:shadow-lg
                hover:from-blue-600
                hover:to-blue-600
                focus:ring-4 
                focus:ring-blue-400
                relative
                overflow-hidden"
              >
                  <span className="relative z-10">Start Your Therapy Session</span>
                  {/* Replace the hover classes with this overlay approach */}
                  <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
                  {/* Adjust the glow to ensure it's properly contained */}
                  <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-30 blur-lg"></span>
                </ButtonWithSound>
            </motion.div>
          </motion.div>
          
          {/* Improved scroll guide animation with smoother easing and click handler */}
          <motion.div 
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 optimize-gpu cursor-pointer"
            animate={{ 
              y: [0, 10, 0],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ 
              y: { 
                duration: 2.5, 
                repeat: Infinity, 
                ease: "easeInOut"
              },
              opacity: {
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
            onClick={() => {
              if (featuresRef.current) {
                smoothScroll(featuresRef.current as HTMLElement, 1500)
              }
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </div>
      </section>
      
      {/* Mental Health & Therapy Costs Section with enhanced visualization */}
      <section className="w-full py-20 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-16"
          >
            <span className="relative">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-br from-blue-500 to-blue-600 py-1 overflow-visible">
                Making Therapy <span className="underline decoration-green-500 decoration-4 underline-offset-4">Accessible</span> for Everyone
              </span>
              <span className="absolute -inset-1 rounded-lg bg-gradient-to-r from-indigo-100 to-purple-100 -z-10 blur-lg opacity-50"></span>
            </span>
          </motion.h2>
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate={statsControls}
            className="grid lg:grid-cols-2 gap-8 mb-16"
          >
            {/* Therapy Costs Card with animated price tags */}
            <motion.div
              variants={fadeInUp}
              className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-100 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-full -mr-16 -mt-16"></div>
              
              <h3 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6 text-blue-500">Average Therapy Costs</h3>
              <p className="text-gray-600 mb-6 sm:mb-8 relative z-10">Traditional therapy can be costly, creating barriers to mental healthcare for many individuals and families.</p>
              
              <div className="grid grid-cols-1 gap-4 sm:gap-5 mb-8">
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-5 sm:p-6 rounded-xl shadow-sm border-2 border-gray-300 relative">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 flex flex-wrap items-center gap-2 relative z-10">
                    <span className="bg-gray-700 text-white px-3 py-1 rounded-lg">TRADITIONAL</span> 
                    <span>Therapy</span>
                    <span className="sm:ml-auto text-xs sm:text-sm text-red-600 font-bold border border-red-200 px-2 py-1 rounded-lg">HIGH COST</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                    {[
                      { title: 'Solo Session', price: '$100-150' },
                      { title: 'Couples Session', price: '$150-250' },
                      { title: 'Family Session', price: '$175-300' }
                    ].map((session, index) => (
                      <motion.div
                        key={session.title}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: index * 0.2 }}
                        className="bg-white p-4 rounded-xl text-center shadow-sm relative overflow-hidden border border-gray-200"
                      >
                        <span className="absolute top-0 right-0 bg-gray-200/50 w-12 h-12 rounded-full -mr-6 -mt-6"></span>
                        <div className="relative inline-block mb-2">
                          {/* Red pulsing animation around price */}
                          <motion.span 
                            className="absolute inset-0 border-2 border-red-300/70"
                            initial={{ scale: 1, opacity: 0 }}
                            animate={{
                              scale: [1, 1.15, 1.3],
                              opacity: [0, 0.7, 0],
                            }}
                            transition={{
                              duration: 1.5,
                              times: [0, 0.4, 1],
                              repeat: Infinity,
                              repeatDelay: 2,
                              ease: "easeOut",
                              delay: index * 3,
                            }}
                          />
                          <span className="block text-red-600 font-bold text-xl sm:text-2xl relative z-10">
                            {session.price}
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className="inline-block bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">EXPENSIVE</span>
                        </div>
                        <span className="text-sm text-gray-700 font-medium relative z-10">{session.title}</span>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="text-sm text-gray-600 text-center italic">
                    *Average costs per session based on nationwide survey data
                  </div>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-gradient-to-r from-indigo-50 to-purple-100 p-5 sm:p-6 rounded-xl shadow-lg relative overflow-hidden border-2 border-indigo-300"
                >
                  <div className="absolute top-0 right-0 rounded-full bg-gradient-to-br from-indigo-200/50 to-purple-300/40 w-32 h-32 -mr-10 -mt-10 blur-md"></div>
                  <div className="absolute bottom-0 left-0 rounded-full bg-gradient-to-tr from-indigo-200/30 to-purple-200/30 w-32 h-32 -ml-10 -mb-10 blur-md"></div>
                  
                  <h4 className="text-lg font-semibold text-blue-500 mb-4 relative z-10 flex flex-wrap items-center gap-2">
                    <span className="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-3 py-1 rounded-lg">AI-POWERED</span>
                    <span>Therapy</span>
                    <span className="sm:ml-auto text-xs sm:text-sm bg-green-100 text-green-700 font-bold px-2 py-1 rounded-lg flex items-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      AFFORDABLE
                    </span>
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5 relative z-10">
                    <motion.div
                      className="bg-white rounded-xl p-4 pt-8 sm:p-4 shadow-md border border-indigo-200 relative"
                    >
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg -mt-7 mb-3 shadow-md inline-block text-sm sm:text-base">
                        30-Minute Session
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-green-500 font-bold">Quick Therapy</span>
                        <div className="relative inline-block">
                          {/* Green pulsing animation around price */}
                          <motion.span 
                            className="absolute inset-0 border-2 border-green-400/70"
                            initial={{ scale: 1, opacity: 0 }}
                            animate={{
                              scale: [1, 1.15, 1.3],
                              opacity: [0, 0.7, 0],
                            }}
                            transition={{
                              duration: 1.5,
                              times: [0, 0.4, 1],
                              repeat: Infinity,
                              repeatDelay: 2,
                              ease: "easeOut",
                              delay: 0,
                            }}
                          />
                          <span className="text-3xl font-bold text-green-500 relative z-10">$2.65</span>
                        </div>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-start">
                          <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Vapi platform: $1.50</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Claude 3.7 AI: $0.07</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Voice synthesis: $0.75</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Transcription: $0.30</span>
                        </li>
                      </ul>
                    </motion.div>
                    
                    <motion.div
                      className="bg-white rounded-xl p-4 pt-8 sm:p-4 shadow-md border border-indigo-200 relative"
                    >
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg -mt-7 mb-3 shadow-md inline-block text-sm sm:text-base">
                        60-Minute Session
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-green-500 font-bold">Full Therapy</span>
                        <div className="relative inline-block">
                          {/* Green pulsing animation around price */}
                          <motion.span 
                            className="absolute inset-0 border-2 border-green-400/70"
                            initial={{ scale: 1, opacity: 0 }}
                            animate={{
                              scale: [1, 1.15, 1.3],
                              opacity: [0, 0.7, 0],
                            }}
                            transition={{
                              duration: 1.5,
                              times: [0, 0.4, 1],
                              repeat: Infinity,
                              repeatDelay: 2,
                              ease: "easeOut",
                              delay: 1.5,
                            }}
                          />
                          <span className="text-3xl font-bold text-green-500 relative z-10">$5.25</span>
                        </div>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-start">
                          <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Vapi platform: $3.00</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Claude 3.7 AI: $0.15</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Voice synthesis: $1.50</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Transcription: $0.60</span>
                        </li>
                      </ul>
                    </motion.div>
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="text-center text-white font-bold p-3 sm:p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl relative z-10 shadow-lg text-sm sm:text-base"
                  >
                    Save up to 97% compared to traditional therapy costs!
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Mental Health Statistics Card with video background */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              className="bg-black/25 backdrop-blur-[2px] p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-200 relative overflow-hidden"
            >
              {/* Rain video background */}
              <div className="absolute inset-0 w-full h-full z-0 overflow-hidden rounded-3xl">
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                >
                  <source src="/videos/rain-background.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                {/* Overlay to ensure text readability */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-indigo-900/30 to-purple-900/30 z-0"></div>
              </div>
              
              <h3 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6 text-white relative z-10">Mental Health Challenges</h3>
              <div className="space-y-5 sm:space-y-6 relative z-10">
                {[
                  { value: "1/5", text: "Nearly one in five adults experience mental illness each year in the United States." },
                  { value: "60%", text: "Approximately 60% of adults with mental illness didn't receive treatment in the past year." },
                  { value: "42%", text: "42% of people cite cost as the primary barrier to seeking mental health services." },
                  { value: "78%", text: "78% of couples report improved relationship satisfaction after completing therapy." },
                  { value: "35%", text: "35% of relationships struggle with communication issues as their primary challenge." },
                  { value: "90%", text: "Over 90% of therapy clients report feeling heard and understood is essential to progress." },
                  { value: "67%", text: "67% of couples who attend therapy together report increased emotional intimacy within 3 months." },
                  { value: "53%", text: "53% of individuals with relationship difficulties also experience symptoms of anxiety or depression." },
                  { value: "84%", text: "84% of couples using digital therapy tools report better conflict resolution skills." },
                  { value: "71%", text: "71% of long-term relationships benefit from regular check-ins with a therapist, even without specific issues." }
                ].map((stat, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    className="flex items-start"
                  >
                    <motion.div 
                      whileHover={{ scale: 1.1, backgroundColor: "rgb(224, 231, 255)" }}
                      className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-100 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0 shadow-sm relative"
                    >
                      {/* First pulsing ring - continuous without reset */}
                      <motion.span 
                        className="absolute inset-0 rounded-full border border-indigo-300/30"
                        initial={{ scale: 1, opacity: 0 }}
                        animate={{
                          scale: [1, 1.1, 1.25, 1.4, 1.5, 1.6],
                          opacity: [0, 0.5, 0.4, 0.3, 0.2, 0],
                        }}
                        transition={{
                          duration: 4,
                          times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                          repeat: Infinity,
                          repeatDelay: 0,
                          ease: "linear",
                        }}
                      />
                      
                      {/* Second pulsing ring with offset */}
                      <motion.span 
                        className="absolute inset-0 rounded-full border border-indigo-300/30"
                        initial={{ scale: 1, opacity: 0 }}
                        animate={{
                          scale: [1, 1.1, 1.25, 1.4, 1.5, 1.7],
                          opacity: [0, 0.4, 0.35, 0.25, 0.15, 0],
                        }}
                        transition={{
                          duration: 4,
                          times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                          repeat: Infinity,
                          repeatDelay: 0,
                          ease: "linear",
                          delay: 1.33,
                        }}
                      />
                      
                      {/* Third pulsing ring with different offset */}
                      <motion.span 
                        className="absolute inset-0 rounded-full border border-indigo-300/30"
                        initial={{ scale: 1, opacity: 0 }}
                        animate={{
                          scale: [1, 1.1, 1.25, 1.4, 1.6, 1.8],
                          opacity: [0, 0.3, 0.25, 0.2, 0.1, 0],
                        }}
                        transition={{
                          duration: 4,
                          times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                          repeat: Infinity,
                          repeatDelay: 0,
                          ease: "linear",
                          delay: 2.66,
                        }}
                      />
                      <span className="text-blue-500 font-bold text-base sm:text-lg">{stat.value}</span>
                    </motion.div>
                    <p className="text-sm sm:text-base text-white">{stat.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
          
          {/* Access Gap Box with enhanced graphics */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-100 text-center relative overflow-hidden"
          >
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-indigo-100/30 to-purple-100/30 rounded-full -ml-32 -mt-32"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-indigo-100/30 to-purple-100/30 rounded-full -mr-32 -mb-32"></div>
            
            <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-5 text-blue-500 relative z-10">Bridging the Access Gap</h3>
            <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8 relative z-10">
              Many people struggle to find suitable therapists due to cost, location, scheduling conflicts, or lengthy waitlists. 
              Our AI-powered therapy platform makes quality mental health support accessible to everyone - anytime, anywhere, at a fraction of the cost.
            </p>
            
            <motion.div
              variants={floatingButtonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="relative z-10 inline-block"
            >
              <ButtonWithSound
                as={Link}
                href="/dashboard/therapy" 
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 
                text-white 
                font-medium 
                py-3 sm:py-4 
                px-8 sm:px-10 
                rounded-full 
                text-base sm:text-lg 
                shadow-lg shadow-blue-500/30
                transition-all 
                duration-300
                hover:shadow-xl
                hover:from-blue-400
                hover:to-blue-500 
                focus:outline-none 
                focus:ring-4 
                focus:ring-blue-400
                relative
                overflow-hidden"
              >
                <span className="relative z-10">Experience Affordable Therapy</span>
                <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 hover:opacity-30 transition-opacity duration-300"></span>
                {/* Subtle glow behind button */}
                <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 opacity-30 blur-lg"></span>
              </ButtonWithSound>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Features section with creative card animations */}
      <section ref={featuresRef} className="w-full py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-14 sm:mb-20 text-transparent bg-clip-text bg-gradient-to-r py-1 overflow-visible from-blue-500 to-blue-600"
          >
            How We Support Your Relationship
          </motion.h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Enhanced feature cards with icon animations */}
            {[
              {
                title: "Private Sessions",
                description: "Connect with an AI therapist from the comfort of your home, with complete privacy and confidentiality.",
                icon: (
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )
              },
              {
                title: "24/7 Availability",
                description: "Get help whenever you need it - any time, any day. Our AI therapist is always ready to support your relationship.",
                icon: (
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              },
              {
                title: "Proven Techniques",
                description: "Our AI is trained in evidence-based therapeutic approaches that help couples build stronger, healthier relationships.",
                icon: (
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )
              }
            ].map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{ 
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  backgroundColor: "rgb(249, 250, 255)" // Very light indigo
                }}
                className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 border border-indigo-100 group"
              >
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: [0, -10, 10, -5, 0] }}
                  transition={{ duration: 0.5 }}
                  className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-indigo-200 transition-colors duration-300 shadow-md"
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-blue-700 group-hover:text-indigo-600 transition-colors duration-300">{feature.title}</h3>
                <p className="text-sm sm:text-base text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Testimonials Section with Animation */}
      <section className="w-full py-16 sm:py-20 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r py-1 overflow-visible from-blue-500 to-blue-600 mb-4">
              What Our Clients Say
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-base sm:text-lg">
              Here are some success stories from couples who have transformed their relationships using our AI therapy platform.
            </p>
          </motion.div>
          
          {/* Testimonial Carousel */}
          <div className="relative">
            {/* Testimonial Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  name: "John & Sarah",
                  location: "New York, NY",
                  testimonial: "We were struggling with communication issues for years. After just a few sessions with the AI therapist, we've learned techniques that have completely changed how we talk to each other.",
                  rating: 5
                },
                {
                  name: "Michael & David",
                  location: "San Francisco, CA",
                  testimonial: "The privacy aspect was important for us. Being able to work through our issues without judgment and in our own home made all the difference. Highly recommend!",
                  rating: 5
                },
                {
                  name: "Rebecca & Ava",
                  location: "Chicago, IL",
                  testimonial: "As a busy couple with opposite schedules, finding time for therapy seemed impossible. The 24/7 availability meant we could connect when it worked for us. Game-changer!",
                  rating: 4
                }
              ].map((testimonial, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{ 
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                  }}
                  className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-indigo-100 relative overflow-hidden"
                >
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-12 -mt-12"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-purple-50/50 rounded-full -ml-8 -mb-8"></div>
                  
                  <div className="mb-4 relative z-10">
                    {/* Star rating */}
                    <div className="flex mb-3">
                      {[...Array(5)].map((_, i) => (
                        <svg 
                          key={i}
                          className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300'} mr-1`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    
                    {/* Quote icon */}
                    <svg className="w-10 h-10 text-indigo-100 absolute top-0 right-0" fill="currentColor" viewBox="0 0 32 32">
                      <path d="M10,8H6a2,2,0,0,0-2,2v4a2,2,0,0,0,2,2h4v6H6a6,6,0,0,1-6-6V10A6,6,0,0,1,6,4h4Zm16,0H22a2,2,0,0,0-2,2v4a2,2,0,0,0,2,2h4v6H22a6,6,0,0,1-6-6V10A6,6,0,0,1,22,4h4Z"/>
                    </svg>
                  </div>
                  
                  <p className="text-gray-600 mb-6 relative z-10">&ldquo;{testimonial.testimonial}&rdquo;</p>
                  
                  <div className="flex items-center">
                    {/* Avatar placeholder */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-green-500 flex items-center justify-center text-white font-bold text-sm mr-3">
                      {testimonial.name.split(' ')[0][0]}{testimonial.name.split(' ')[2] ? testimonial.name.split(' ')[2][0] : ''}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{testimonial.name}</h4>
                      <p className="text-sm text-gray-500">{testimonial.location}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
          </div>
        </div>
      </section>
      
      {/* Subscription Plans Section */}
      <section className="w-full py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text py-1 overflow-visible bg-gradient-to-r from-blue-500 to-blue-600 mb-4">
              Affordable Subscription Plans
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-base sm:text-lg">
              Choose the plan that fits your needs and budget. All plans include unlimited access to our AI therapist.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ 
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)"
              }}
              className="bg-gradient-to-b from-white to-indigo-50 rounded-2xl shadow-lg overflow-hidden border border-indigo-100 transition-all duration-500"
            >
              <div className="p-6 sm:p-8">
                <h3 className="text-xl font-bold text-blue-600 mb-2">Basic Plan</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-3xl font-bold text-blue-600">$19</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">5 therapy sessions/month</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">30 minutes per session</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Basic relationship assessment</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Session transcripts</span>
                  </li>
                  <li className="flex items-start text-gray-400">
                    <svg className="w-5 h-5 text-gray-300 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Advanced relationship insights</span>
                  </li>
                </ul>
                
                <motion.div variants={floatingButtonVariants} initial="rest" whileHover="hover" whileTap="tap">
                  <ButtonWithSound
                    as={Link}
                    href="/dashboard/therapy" 
                    className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-xl shadow-md 
                    hover:bg-blue-700 transition duration-300 flex items-center justify-center"
                  >
                    Get Started
                  </ButtonWithSound>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Standard Plan (Highlighted) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ 
                boxShadow: "0 25px 50px -12px rgba(124, 58, 237, 0.25)"
              }}
              className="bg-gradient-to-b from-white to-indigo-50 rounded-2xl shadow-xl overflow-hidden border-1 border-green-500 md:-mt-4 md:-mb-4 relative z-10 transition-all duration-500"
            >
              
              <div className="bg-blue-500 text-white text-center text-sm font-semibold py-1">MOST POPULAR</div>
              
              <div className="p-6 sm:p-8">
                <h3 className="text-xl font-bold text-blue-600 mb-2">Standard Plan</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-3xl font-bold text-blue-600">$39</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">10 therapy sessions/month</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">60 minutes per session</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Comprehensive relationship assessment</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Session transcripts & summaries</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Advanced relationship insights</span>
                  </li>
                </ul>
                
                <motion.div variants={floatingButtonVariants} initial="rest" whileHover="hover" whileTap="tap">
                  <ButtonWithSound
                    as={Link}
                    href="/dashboard/therapy" 
                    className="w-full bg-gradient-to-r from-green-400 to-green-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg hover:overflow-hidden
                    hover:ring-1 hover:ring-bg-blue-700 hover:from-green-500 hover:to-green-600 transition duration-300 flex items-center justify-center"
                  >
                    Select Plan
                  </ButtonWithSound>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Premium Plan */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ 
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)"
              }}
              className="bg-gradient-to-b from-white to-indigo-50 rounded-2xl shadow-lg overflow-hidden border border-indigo-100 transition-all duration-500"
            >
              <div className="p-6 sm:p-8">
                <h3 className="text-xl font-bold text-blue-600 mb-2">Premium Plan</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-3xl font-bold text-blue-600">$69</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Unlimited therapy sessions</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">60 minutes per session</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Comprehensive relationship assessment</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Session transcripts & detailed insights</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Priority support & customized therapy options</span>
                  </li>
                </ul>
                
                <motion.div variants={floatingButtonVariants} initial="rest" whileHover="hover" whileTap="tap">
                  <ButtonWithSound
                    as={Link}
                    href="/dashboard/therapy" 
                    className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-xl shadow-md 
                    hover:bg-blue-700 transition duration-300 flex items-center justify-center"
                  >
                    Get Premium
                  </ButtonWithSound>
                </motion.div>
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-center mt-10 text-gray-500 text-sm"
          >
            All plans include a 7-day free trial. Cancel anytime. No credit card required to start.
          </motion.div>
        </div>
      </section>
      
      {/* Call to action section - decorative elements removed */}
      <section className="w-full py-20 sm:py-24 pb-32 bg-gradient-to-br from-blue-900 to-green-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          <div className="text-center relative z-10 mb-6">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8"
            >
              Ready to Transform Your Relationship?
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-indigo-100 text-base sm:text-lg max-w-3xl mx-auto mb-8 sm:mb-10"
            >
              Start your journey to a healthier relationship today with our AI-powered therapy platform.
            </motion.p>
            
            <motion.div
              variants={floatingButtonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="inline-block mb-8"
            >
              <ButtonWithSound
                as={Link}
                href="/dashboard/therapy" 
                className="bg-white text-blue-700 
                font-medium 
                py-3 sm:py-4 
                px-8 sm:px-12 
                rounded-full 
                text-base sm:text-lg 
                shadow-lg shadow-indigo-900/30
                hover:shadow-xl
                transition-all 
                duration-300
                focus:outline-none 
                focus:ring-4 
                focus:ring-indigo-300
                relative
                overflow-hidden"
              >
                <span className="relative z-10">Begin Your Therapy Journey</span>
                <span className="absolute inset-0 bg-indigo-100 opacity-0 hover:opacity-30 transition-opacity duration-300"></span>
              </ButtonWithSound>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Footer section for better page balance */}
      <section className="w-full py-10 bg-indigo-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-indigo-200 mb-4">© {new Date().getFullYear()} TherapyAI. All rights reserved.</p>
            <p className="text-xs text-indigo-300">
              Powered by advanced AI to help the planet build stronger, healthier relationships
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}