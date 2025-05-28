'use client'

import { useState, useEffect, memo, lazy, Suspense } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'

// Lazy load heavy components
const TherapeuticBokehBackground = lazy(() => import('@/components/ui/therapeutic-bokeh-background'))

// Resource type definition
type Resource = {
  id: string
  title: string
  description: string
  type: 'article' | 'video' | 'exercise' | 'book' | 'podcast' | 'community'
  url: string
  source?: string
  tags?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}

// Categories for organizing resources
type Category = {
  id: string
  title: string
  description: string
  icon: string
  color: string
}

// Memoized components for better performance
const ResourceCard = memo(({ resource, index }: { resource: Resource; index: number }) => {
  const getTypeIcon = (type: Resource['type']) => {
    switch(type) {
      case 'article': return '📝'
      case 'video': return '🎥'
      case 'exercise': return '✏️'
      case 'book': return '📚'
      case 'podcast': return '🎧'
      case 'community': return '👥'
      default: return '📝'
    }
  }

  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ 
        y: -5,
        transition: { type: "spring", stiffness: 300 }
      }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group relative"
    >
      {/* Glow effect on hover */}
      <div className={`absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg bg-gradient-to-r ${
        resource.tags?.includes('communication') ? 'from-blue-500 to-blue-600' :
        resource.tags?.includes('conflict') ? 'from-amber-500 to-amber-600' :
        resource.tags?.includes('intimacy') ? 'from-rose-500 to-rose-600' :
        resource.tags?.includes('growth') ? 'from-green-500 to-green-600' :
        resource.tags?.includes('crisis') ? 'from-red-500 to-red-600' :
        'from-blue-500 to-blue-600'
      }`} />
      
      {/* Card container */}
      <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20 hover:border-white/30 transition-all duration-300 group-hover:bg-white/15 group-hover:shadow-2xl">
        {/* Top accent bar */}
        <div className={`h-1 bg-gradient-to-r ${
          resource.tags?.includes('communication') ? 'from-blue-400 to-blue-600' :
          resource.tags?.includes('conflict') ? 'from-amber-400 to-amber-600' :
          resource.tags?.includes('intimacy') ? 'from-rose-400 to-rose-600' :
          resource.tags?.includes('growth') ? 'from-green-400 to-green-600' :
          resource.tags?.includes('crisis') ? 'from-red-400 to-red-600' :
          'from-blue-400 to-blue-600'
        }`} />
        
        <div className="p-5 sm:p-6">
          <div className="flex items-start mb-4">
            <div className={`rounded-xl w-12 h-12 flex items-center justify-center mr-4 bg-gradient-to-br shadow-lg ${
              resource.type === 'article' ? 'from-blue-500 to-blue-600 shadow-blue-500/30' :
              resource.type === 'video' ? 'from-red-500 to-red-600 shadow-red-500/30' :
              resource.type === 'exercise' ? 'from-green-500 to-green-600 shadow-green-500/30' :
              resource.type === 'book' ? 'from-blue-500 to-blue-600 shadow-blue-500/30' :
              resource.type === 'podcast' ? 'from-amber-500 to-amber-600 shadow-amber-500/30' :
              'from-indigo-500 to-indigo-600 shadow-indigo-500/30'
            }`}>
              <span className="text-xl text-white">{getTypeIcon(resource.type)}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-white leading-tight mb-1">{resource.title}</h3>
              {resource.source && (
                <p className="text-xs sm:text-sm text-blue-300/70">Source: {resource.source}</p>
              )}
            </div>
          </div>
          
          <p className="text-sm text-white/80 mb-4 line-clamp-3">{resource.description}</p>
          
          <div className="mt-3 mb-4 flex flex-wrap gap-2">
            {resource.tags?.map(tag => (
              <span 
                key={tag}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur-sm border ${
                  tag === 'communication' ? 'border-blue-400/50 text-blue-300' :
                  tag === 'conflict' ? 'border-amber-400/50 text-amber-300' :
                  tag === 'intimacy' ? 'border-rose-400/50 text-rose-300' :
                  tag === 'growth' ? 'border-green-400/50 text-green-300' :
                  tag === 'crisis' ? 'border-red-400/50 text-red-300' :
                  'border-gray-400/50 text-gray-300'
                }`}
              >
                {tag.charAt(0).toUpperCase() + tag.slice(1)}
              </span>
            ))}
            
            {resource.difficulty && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur-sm border ${
                resource.difficulty === 'beginner' ? 'border-green-400/50 text-green-300' :
                resource.difficulty === 'intermediate' ? 'border-blue-400/50 text-blue-300' :
                'border-blue-400/50 text-blue-300'
              }`}>
                {resource.difficulty === 'beginner' ? 'Beginner' :
                 resource.difficulty === 'intermediate' ? 'Intermediate' : 'Advanced'}
              </span>
            )}
          </div>
          
          <motion.a 
            href={resource.url} 
            target="_blank" 
            rel="noopener noreferrer"
            whileHover={{ x: 5 }}
            className="inline-flex items-center text-blue-300 hover:text-blue-200 font-medium transition-colors group/link"
          >
            <span className="mr-1">Access Resource</span>
            <svg className="w-4 h-4 transition-transform group-hover/link:translate-x-1 group-hover/link:-translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </motion.a>
        </div>
      </div>
    </motion.div>
  )
})

ResourceCard.displayName = 'ResourceCard'

// Animation variants defined outside component to prevent recreation
const fadeInUp = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 20,
      mass: 0.8
    }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
      when: "beforeChildren"
    }
  }
}

const scaleIn = {
  hidden: { scale: 0.6, opacity: 0, rotate: -5 },
  visible: { 
    scale: 1, 
    opacity: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 25,
      mass: 0.8
    }
  }
}

const floatingAnimation = {
  hidden: { y: 0 },
  visible: {
    y: [-5, 5, -5],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

const glowPulse = {
  hidden: { opacity: 0.3 },
  visible: {
    opacity: [0.3, 0.8, 0.3],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

export default function Resources() {
  // State for active category filter
  const [activeCategory, setActiveCategory] = useState<string>('all')
  // State for search query
  const [searchQuery, setSearchQuery] = useState<string>('')
  // State for emergency support visibility
  const [showEmergencySupport, setShowEmergencySupport] = useState<boolean>(false)
  // State for mobile tab management
  const [activeTab, setActiveTab] = useState<'search' | 'results'>('search')
  const [isMobile, setIsMobile] = useState(false)

  // Categories for relationship resources
  const categories: Category[] = [
    {
      id: 'all',
      title: 'All Resources',
      description: 'Browse our complete collection of relationship support materials',
      icon: '🔍',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'communication',
      title: 'Communication',
      description: 'Tools to improve dialogue and understanding between partners',
      icon: '💬',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'conflict',
      title: 'Conflict Resolution',
      description: 'Strategies for navigating disagreements in healthy ways',
      icon: '🤝',
      color: 'bg-amber-100 text-amber-600'
    },
    {
      id: 'intimacy',
      title: 'Intimacy & Connection',
      description: 'Resources for deepening emotional and physical bonds',
      icon: '❤️',
      color: 'bg-rose-100 text-rose-600'
    },
    {
      id: 'growth',
      title: 'Personal Growth',
      description: 'Support for individual development within relationships',
      icon: '🌱',
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 'crisis',
      title: 'Crisis Support',
      description: 'Immediate help for couples facing serious challenges',
      icon: '🆘',
      color: 'bg-red-100 text-red-600'
    }
  ]

  // Resources with actual external links
  const resources: Resource[] = [
    {
      id: '1',
      title: 'The Gottman Institute: The Four Horsemen',
      description: 'Learn to identify and counteract the four communication styles that can predict the end of a relationship.',
      type: 'article',
      url: 'https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/',
      source: 'The Gottman Institute',
      tags: ['communication', 'conflict'],
      difficulty: 'beginner'
    },
    {
      id: '2',
      title: 'Active Listening Exercise for Couples',
      description: 'Practice truly hearing your partner with this guided step-by-step exercise for deeper understanding.',
      type: 'exercise',
      url: 'https://www.therapistaid.com/therapy-worksheet/active-listening',
      source: 'TherapistAid',
      tags: ['communication'],
      difficulty: 'beginner'
    },
    {
      id: '3',
      title: 'Emotional Intelligence Assessment',
      description: 'Discover your emotional intelligence patterns and how they affect your relationships.',
      type: 'exercise',
      url: 'https://www.psychologytoday.com/us/tests/personality/emotional-intelligence-test',
      source: 'Psychology Today',
      tags: ['intimacy', 'growth'],
      difficulty: 'intermediate'
    },
    {
      id: '4',
      title: 'The 5 Love Languages Online Quiz',
      description: 'Find out how you and your partner express and receive love with this popular assessment.',
      type: 'exercise',
      url: 'https://5lovelanguages.com/quizzes/love-language',
      source: 'The 5 Love Languages',
      tags: ['intimacy', 'communication'],
      difficulty: 'beginner'
    },
    {
      id: '5',
      title: 'Nonviolent Communication Basics',
      description: 'Learn the fundamentals of expressing needs and feelings without blame or criticism.',
      type: 'article',
      url: 'https://www.cnvc.org/learn-nvc/what-is-nvc',
      source: 'Center for Nonviolent Communication',
      tags: ['communication', 'conflict'],
      difficulty: 'intermediate'
    },
    {
      id: '6',
      title: 'Rebuilding Trust After Betrayal',
      description: 'Evidence-based guidance for couples healing from infidelity or broken trust.',
      type: 'article',
      url: 'https://www.gottman.com/blog/reviving-trust-after-an-affair/',
      source: 'The Gottman Institute',
      tags: ['crisis', 'intimacy'],
      difficulty: 'advanced'
    },
    {
      id: '7',
      title: 'Esther Perel: Rethinking Infidelity',
      description: 'A fresh perspective on affair recovery that has helped countless couples rebuild trust.',
      type: 'video',
      url: 'https://www.youtube.com/watch?v=P2AUat93a8Q',
      source: 'TED',
      tags: ['crisis', 'intimacy'],
      difficulty: 'intermediate'
    },
    {
      id: '8',
      title: 'Conflict Resolution Skills for Couples',
      description: 'Research-based strategies for managing disagreements in healthy ways.',
      type: 'article',
      url: 'https://www.gottman.com/blog/manage-conflict-solvable-vs-perpetual-problems/',
      source: 'The Gottman Institute',
      tags: ['conflict'],
      difficulty: 'intermediate'
    },
    {
      id: '9',
      title: 'Relationship Repair After an Argument',
      description: 'Evidence-based strategies for reconnecting after conflict.',
      type: 'article',
      url: 'https://www.healthline.com/health/relationships/how-to-fix-a-relationship-after-a-fight',
      source: 'Healthline',
      tags: ['conflict', 'communication'],
      difficulty: 'intermediate'
    },
    {
      id: '10',
      title: 'Where Should We Begin? Podcast',
      description: 'Real couples anonymously share their stories in therapy with relationship expert Esther Perel.',
      type: 'podcast',
      url: 'https://whereweshouldbegin.estherperel.com/',
      source: 'Esther Perel',
      tags: ['intimacy', 'communication', 'growth'],
      difficulty: 'beginner'
    },
    {
      id: '11',
      title: 'Hold Me Tight: EFT for Couples',
      description: 'Based on Dr. Sue Johnson\'s Emotionally Focused Therapy approach to building secure attachment.',
      type: 'book',
      url: 'https://iceeft.com/what-is-eft/',
      source: 'ICEEFT',
      tags: ['intimacy', 'communication'],
      difficulty: 'intermediate'
    },
    {
      id: '12',
      title: 'National Domestic Violence Hotline',
      description: 'Immediate support for anyone experiencing domestic violence or abuse in their relationship.',
      type: 'community',
      url: 'https://www.thehotline.org/',
      source: 'National Domestic Violence Hotline',
      tags: ['crisis'],
      difficulty: 'beginner'
    },
    {
      id: '13',
      title: 'Couples Communication Exercises',
      description: 'Free downloadable worksheets to practice effective communication skills.',
      type: 'exercise',
      url: 'https://positivepsychology.com/communication-exercises-couples/',
      source: 'PositivePsychology.com',
      tags: ['communication'],
      difficulty: 'beginner'
    },
    {
      id: '14',
      title: 'Self-Compassion Practices for Relationship Healing',
      description: 'Learn how self-compassion can transform your relationship dynamics.',
      type: 'article',
      url: 'https://self-compassion.org/the-three-elements-of-self-compassion-2/',
      source: 'Dr. Kristin Neff',
      tags: ['growth', 'intimacy'],
      difficulty: 'intermediate'
    },
    {
      id: '15',
      title: 'Relationship Help: When to Seek Support',
      description: 'Understanding when and how to find professional help for your relationship.',
      type: 'article',
      url: 'https://www.apa.org/topics/healthy-relationships',
      source: 'American Psychological Association',
      tags: ['crisis', 'growth'],
      difficulty: 'beginner'
    }
  ]

  // Emergency support resources
  const emergencyResources = [
    {
      title: "National Domestic Violence Hotline",
      phone: "1-800-799-SAFE (7233)",
      website: "https://www.thehotline.org/",
      description: "24/7 support for anyone experiencing domestic violence"
    },
    {
      title: "Crisis Text Line",
      phone: "Text HOME to 741741",
      website: "https://www.crisistextline.org/",
      description: "Text-based mental health support and crisis intervention"
    },
    {
      title: "SAMHSA's National Helpline",
      phone: "1-800-662-HELP (4357)",
      website: "https://www.samhsa.gov/find-help/national-helpline",
      description: "Treatment referral for mental health and substance use"
    }
  ]

  // Filter resources based on active category and search query
  const filteredResources = resources.filter(resource => {
    // Filter by category
    const matchesCategory = activeCategory === 'all' || 
      (resource.tags && resource.tags.includes(activeCategory))
    
    // Filter by search query
    const matchesSearch = 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (resource.source && resource.source.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesCategory && matchesSearch
  })
  
  // Change to results tab when search is performed on mobile
  useEffect(() => {
    if (isMobile && searchQuery && filteredResources.length > 0) {
      setActiveTab('results');
    }
  }, [searchQuery, filteredResources.length, isMobile]);

  
  // Check if it's mobile view on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Parallax scroll effects
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 1000], [0, -200]);
  const textY = useTransform(scrollY, [0, 300], [0, -50]);
  
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-black">
      {/* Therapeutic Background with parallax */}
      <Suspense fallback={<div className="absolute inset-0 bg-slate-900" />}>
        <motion.div style={{ y: backgroundY }}>
          <TherapeuticBokehBackground />
        </motion.div>
      </Suspense>
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-pink-900/20 animate-gradient-xy" />
      
      {/* Main overlay for content readability */}
      <div className="relative z-10 min-h-screen backdrop-blur-lg bg-gradient-to-b from-slate-900/60 via-slate-900/70 to-slate-900/80 py-12 px-4 sm:px-6 lg:px-8">
        {/* Mobile tabs */}
        {isMobile && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="sticky top-0 z-20 bg-black/30 backdrop-blur-xl border-b border-white/20 mb-6 -mx-4 px-4 py-3 rounded-b-xl"
        >
          <div className="flex rounded-lg bg-black/40 backdrop-blur-md p-1 shadow-xl border border-white/20">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-300 ${
                activeTab === 'search'
                  ? 'bg-white/20 backdrop-blur-md text-blue-300 shadow-lg border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="flex items-center justify-center">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </span>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-300 ${
                activeTab === 'results'
                  ? 'bg-white/20 backdrop-blur-md text-blue-300 shadow-lg border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="flex items-center justify-center">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Resources {filteredResources.length > 0 && `(${filteredResources.length})`}
              </span>
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Header with supportive message */}
      <div className={`max-w-7xl mx-auto text-center mb-16 ${isMobile && activeTab === 'results' ? 'hidden' : ''}`}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative"
        >
          {/* Animated background blur effect */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
            animate={{ 
              scale: [0.3, 1.2, 1],
              opacity: [0, 0.4, 0.3],
              rotate: [-10, 5, 0]
            }}
            transition={{ 
              duration: 2.5, 
              ease: "easeOut",
              times: [0, 0.6, 1]
            }}
            className="absolute inset-0 -top-20 -bottom-20 bg-blue-500 blur-3xl"
          />
          
          {/* Additional floating particles */}
          <motion.div
            variants={floatingAnimation}
            initial="hidden"
            animate="visible"
            className="absolute top-10 left-10 w-2 h-2 bg-blue-400 rounded-full opacity-60"
          />
          <motion.div
            variants={floatingAnimation}
            initial="hidden"
            animate="visible"
            transition={{ delay: 1 }}
            className="absolute top-20 right-20 w-1 h-1 bg-blue-400 rounded-full opacity-40"
          />
          <motion.div
            variants={floatingAnimation}
            initial="hidden"
            animate="visible"
            transition={{ delay: 2 }}
            className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-blue-400 rounded-full opacity-50"
          />
          
          <motion.div style={{ y: textY }} className="relative">
            <motion.h1 
              variants={fadeInUp}
              className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 relative"
            >
              <span className="text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.3)]">Relationship</span>
              <br />
              <span className="text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.3)]">Resources</span>
            </motion.h1>
            <motion.p 
              variants={fadeInUp}
              className="text-xl sm:text-2xl lg:text-3xl text-white/90 max-w-4xl mx-auto mb-10 leading-relaxed font-light"
            >
              Every relationship faces challenges. You're not alone, and reaching out for support
              is a <span className="text-white font-semibold">sign of strength</span> and courage.
            </motion.p>
          </motion.div>
          
          {/* Emergency Support Button */}
          <motion.div 
            variants={scaleIn}
            className="mt-8 inline-block"
          >
            <motion.button
              whileHover={{ 
                scale: 1.05, 
                boxShadow: "0 20px 40px rgba(239, 68, 68, 0.4)",
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowEmergencySupport(!showEmergencySupport)}
              className="group relative inline-flex items-center px-8 py-4 sm:px-10 sm:py-5 text-base font-semibold rounded-full text-white overflow-hidden transition-all duration-300"
            >
              {/* Animated gradient background */}
              <span className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-red-600 animate-gradient-x" />
              
              {/* Glass overlay */}
              <span className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
              
              {/* Border gradient */}
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-red-400 via-pink-400 to-red-400 opacity-50 blur-md animate-pulse" />
              
              {/* Content */}
              <span className="relative flex items-center">
                <svg className="h-5 w-5 mr-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {showEmergencySupport ? 'Hide Emergency Help' : 'Need Immediate Help?'}
              </span>
            </motion.button>
          </motion.div>
        </motion.div>
        
        {/* Emergency Support Panel */}
        <AnimatePresence>
          {showEmergencySupport && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
              className="mt-8 max-w-5xl mx-auto overflow-hidden"
            >
              <div className="relative bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-xl rounded-3xl p-1 border border-red-400/30">
                <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 sm:p-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 flex items-center justify-center sm:justify-start">
                    <div className="relative mr-3">
                      <div className="absolute inset-0 bg-red-500 rounded-full animate-ping" />
                      <svg className="relative h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    Immediate Support Resources
                  </h2>
                  <p className="text-red-200 mb-8 text-base sm:text-lg">If you're in danger or experiencing a crisis, please use these resources for immediate help:</p>
                  
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {emergencyResources.map((resource, index) => (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="relative bg-white/10 backdrop-blur-md p-5 rounded-xl border border-white/20 hover:border-red-400/50 transition-all duration-300"
                      >
                        <div className="absolute top-2 right-2 h-2 w-2 bg-red-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(248,113,113,0.8)]" />
                        <h3 className="font-bold text-lg text-white mb-2">{resource.title}</h3>
                        <p className="font-mono text-red-300 text-lg my-3">{resource.phone}</p>
                        <motion.a 
                          href={resource.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          whileHover={{ x: 2 }}
                          className="inline-flex items-center text-blue-300 hover:text-blue-200 font-medium mb-3 transition-colors"
                        >
                          Visit Website
                          <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </motion.a>
                        <p className="text-sm text-white/70">{resource.description}</p>
                      </motion.div>
                    ))}
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8 p-5 bg-red-500/20 backdrop-blur-sm rounded-xl border border-red-400/30"
                  >
                    <p className="text-white flex items-start">
                      <svg className="h-6 w-6 mr-3 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>
                        <strong className="text-red-300">In case of immediate danger:</strong> 
                        <span className="text-white/90"> Call emergency services (911 in the US) if you or someone you know is in immediate danger.</span>
                      </span>
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Featured Video Section */}
      <div className="max-w-6xl mx-auto mb-16">
        <div className="relative group">
          {/* Glass card container */}
          <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-1 border border-white/20 shadow-2xl overflow-hidden">
            {/* Static gradient border */}
            <div className="absolute inset-0 bg-blue-500 opacity-20" />
            
            {/* Inner container */}
            <div className="relative bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 sm:p-8">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center mr-4 shadow-lg shadow-red-500/30">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23 7l-7 5 7 5V7z"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">Featured Resource</h2>
                    <p className="text-blue-200/80">Essential viewing for couples</p>
                  </div>
                </div>
                <p className="text-lg text-white/90 leading-relaxed">
                  Discover powerful insights on building lasting relationships through this transformative talk that has helped millions of couples worldwide.
                </p>
              </div>
              
              {/* Video container */}
              <div className="relative rounded-xl overflow-hidden shadow-2xl">
                {/* Static video border effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-30 blur-xl" />
                
                {/* YouTube iframe */}
                <div className="relative aspect-video">
                  <iframe
                    src="https://www.youtube.com/embed/uPh4-DU6MDU"
                    title="Transformative Relationship Insights"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
              
              {/* Video details */}
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                  <h3 className="font-semibold text-blue-300 mb-1">Key Topics</h3>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span>Communication strategies</li>
                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span>Building trust & intimacy</li>
                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span>Conflict resolution</li>
                  </ul>
                </div>
                <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                  <h3 className="font-semibold text-blue-300 mb-1">Perfect For</h3>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Couples at any stage</li>
                    <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Relationship counselors</li>
                    <li className="flex items-center"><span className="text-blue-400 mr-2">•</span>Anyone seeking growth</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto">
        <div className={`${isMobile ? (activeTab === 'search' ? 'block' : 'hidden') : 'block'}`}>
          {/* Category navigation */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
            className="mb-12"
          >
            <h2 className="text-xl font-semibold text-white mb-6 pl-1 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">Filter by category:</h2>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {categories.map((category, index) => (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: activeCategory === category.id 
                      ? "0 10px 30px rgba(99, 102, 241, 0.4)" 
                      : "0 5px 20px rgba(255, 255, 255, 0.1)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveCategory(category.id)}
                  className={`relative px-4 sm:px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 overflow-hidden group ${
                    activeCategory === category.id 
                      ? 'text-white shadow-lg' 
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {/* Background gradient */}
                  <span className={`absolute inset-0 transition-opacity duration-300 ${
                    activeCategory === category.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <span className={`absolute inset-0 bg-gradient-to-r ${
                      category.id === 'communication' ? 'from-blue-500 to-blue-600' :
                      category.id === 'conflict' ? 'from-amber-500 to-amber-600' :
                      category.id === 'intimacy' ? 'from-rose-500 to-rose-600' :
                      category.id === 'growth' ? 'from-green-500 to-green-600' :
                      category.id === 'crisis' ? 'from-red-500 to-red-600' :
'from-blue-500 to-blue-600'
                    }`} />
                  </span>
                  
                  {/* Glass effect background */}
                  <span className={`absolute inset-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full transition-opacity duration-300 ${
                    activeCategory === category.id ? 'opacity-0' : 'opacity-100'
                  }`} />
                  
                  {/* Content */}
                  <span className="relative flex items-center">
                    <span className="mr-2 text-lg">{category.icon}</span>
                    <span className="hidden sm:inline">{category.title}</span>
                    <span className="inline sm:hidden">{category.id === 'all' ? 'All' : category.title.split(' ')[0]}</span>
                    {activeCategory === category.id && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-2 h-2 w-2 bg-white rounded-full"
                      />
                    )}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
          
          {/* Search bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 100 }}
            className="mb-8"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500 rounded-2xl opacity-20 group-hover:opacity-30 blur-xl transition-opacity duration-300" />
              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-1 border border-white/20">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resources by keyword, topic, or source..."
                  className="w-full px-6 py-4 bg-slate-900/60 backdrop-blur-md rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
                />
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
                  onClick={() => {
                    if (isMobile && filteredResources.length > 0) {
                      setActiveTab('results');
                    }
                  }}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
            {filteredResources.length > 0 && isMobile && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3"
              >
                <motion.button 
                  onClick={() => setActiveTab('results')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center shadow-lg transition-all duration-300"
                >
                  <span>View {filteredResources.length} results</span>
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </div>
        
        {/* Resource grid */}
        <div className={`${isMobile ? (activeTab === 'results' ? 'block' : 'hidden') : 'block'}`}>
          {isMobile && activeTab === 'results' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center justify-between bg-white/10 backdrop-blur-xl rounded-xl p-3 border border-white/20"
            >
              <motion.button 
                onClick={() => setActiveTab('search')}
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center text-blue-300 hover:text-white transition-colors"
              >
                <svg className="mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Search
              </motion.button>
              <span className="text-sm text-white/70">
                {filteredResources.length} {filteredResources.length === 1 ? 'result' : 'results'}
              </span>
            </motion.div>
          )}
          
          {filteredResources.length > 0 ? (
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            >
              {filteredResources.map((resource, index) => (
                <ResourceCard key={resource.id} resource={resource} index={index} />
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
              className="text-center py-12 bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 relative overflow-hidden"
            >
              {/* Subtle animated background */}
              <motion.div
                variants={glowPulse}
                initial="hidden"
                animate="visible"
                className="absolute inset-0 bg-blue-500/10"
              />
              <motion.div 
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 0.9, 1],
                  opacity: [0.8, 1, 0.8, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  repeatDelay: 2,
                  ease: "easeInOut"
                }}
                className="relative text-5xl mb-6"
              >
                <span className="relative z-10">🔍</span>
                <motion.div
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0, 0.3, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                  className="absolute inset-0 bg-blue-500 rounded-full blur-xl"
                />
              </motion.div>
              <div className="relative z-10">
                <h3 className="text-2xl font-semibold text-white mb-3 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">No resources found</h3>
                <p className="text-white/70 mb-6">Try adjusting your search or category filter to find what you're looking for.</p>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                  if (isMobile) setActiveTab('search');
                }}
                className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Search
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Support message */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        className="max-w-4xl mx-auto mt-16 mb-16"
      >
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-1 border border-white/20 shadow-2xl overflow-hidden">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-blue-500 opacity-20 animate-pulse" />
          
          {/* Inner container */}
          <div className="relative bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 sm:p-8">
            <div className="text-center">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-xl sm:text-2xl font-bold text-white mb-3 flex items-center justify-center"
              >
                <svg className="h-6 w-6 mr-2 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                Need Personalized Support?
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-white/80 mb-6 text-sm sm:text-base"
              >
                While these resources are helpful, sometimes you need professional guidance tailored to your unique situation.
                Our trained therapists are ready to support you and your partner.
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/schedule" className="group relative inline-flex justify-center items-center px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium rounded-xl text-white bg-blue-500 hover:bg-blue-600 transition-all duration-300 shadow-lg hover:shadow-blue-500/25">
                    <span className="relative flex items-center">
                      <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Schedule a Session
                    </span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/dashboard/therapy" className="group relative inline-flex justify-center items-center px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium rounded-xl text-white border border-white/30 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                    <span className="flex items-center">
                      <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 107.072 0m-9.9 2.828a9 9 0 0112.728 0" />
                      </svg>
                      Start Voice Session
                    </span>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Community wisdom section */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        className="max-w-5xl mx-auto mt-16 mb-16"
      >
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xl sm:text-2xl font-bold text-center text-white mb-8 flex items-center justify-center"
        >
          <svg className="h-6 w-6 mr-2 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13h4m-4 0H8m4-6.5v.5m0 7v.5m0-8.75C11.667 2.732 11 2.232 10 2h4c-.667.732-1 1.232-1 1.75z" />
          </svg>
          Community Wisdom
        </motion.h2>
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6"
        >
          <motion.div 
            variants={fadeInUp}
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative bg-white/10 backdrop-blur-xl p-5 rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 group"
          >
            <div className="absolute -inset-0.5 bg-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center mb-3">
                <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white mr-3 shadow-lg">
                  ❤️‍🩹
                </div>
                <h3 className="font-semibold text-white">Healing Takes Time</h3>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                &ldquo;Rebuilding trust is a process, not an event. Be patient with yourselves and each other as you heal.&rdquo;
              </p>
              <p className="text-white/60 mt-3 text-xs italic">— From a couple married 27 years</p>
            </div>
          </motion.div>
          
          <motion.div 
            variants={fadeInUp}
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative bg-white/10 backdrop-blur-xl p-5 rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center mb-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white mr-3 shadow-lg">
                  🌱
                </div>
                <h3 className="font-semibold text-white">Growth Together</h3>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                &ldquo;The strongest relationships aren&apos;t those without problems, but those where couples grow by facing challenges together.&rdquo;
              </p>
              <p className="text-white/60 mt-3 text-xs italic">— From couples therapy group</p>
            </div>
          </motion.div>
          
          <motion.div 
            variants={fadeInUp}
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative bg-white/10 backdrop-blur-xl p-5 rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 group"
          >
            <div className="absolute -inset-0.5 bg-amber-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center mb-3">
                <div className="h-9 w-9 rounded-full bg-amber-500 flex items-center justify-center text-white mr-3 shadow-lg">
                  🔄
                </div>
                <h3 className="font-semibold text-white">Daily Practice</h3>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                &ldquo;Small daily acts of appreciation and connection matter more than grand gestures. Consistency builds security.&rdquo;
              </p>
              <p className="text-white/60 mt-3 text-xs italic">— Relationship counselors</p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
      
      {/* Newsletter signup */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        className="max-w-4xl mx-auto mt-16 mb-16"
      >
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-1 border border-white/20 shadow-2xl overflow-hidden">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-blue-500 opacity-20 animate-pulse" />
          
          {/* Inner container */}
          <div className="relative bg-slate-900/80 backdrop-blur-md rounded-2xl px-5 py-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="sm:w-7/12 mb-5 sm:mb-0 text-center sm:text-left"
              >
                <h3 className="text-xl font-bold text-white mb-2">Weekly Relationship Insights</h3>
                <p className="text-white/70 text-sm">
                  Join our community for expert tips and supportive guidance.
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="sm:w-5/12 w-full"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="email" 
                    placeholder="Your email" 
                    className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 w-full"
                  />
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-medium transition-all duration-300 whitespace-nowrap shadow-lg"
                  >
                    Subscribe
                  </motion.button>
                </div>
                <p className="text-xs text-white/60 mt-2 text-center sm:text-left">We respect your privacy. Unsubscribe anytime.</p>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  )
}