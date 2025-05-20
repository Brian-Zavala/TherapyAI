'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

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

export default function Resources() {
  // State for active category filter
  const [activeCategory, setActiveCategory] = useState<string>('all')
  // State for search query
  const [searchQuery, setSearchQuery] = useState<string>('')
  // State for emergency support visibility
  const [showEmergencySupport, setShowEmergencySupport] = useState<boolean>(false)

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
      title: 'Emotional Intimacy Questionnaire',
      description: 'Discover your emotional connection patterns with this research-based assessment tool.',
      type: 'exercise',
      url: 'https://www.psychologytoday.com/us/tests/relationships/emotional-intimacy-test',
      source: 'Psychology Today',
      tags: ['intimacy'],
      difficulty: 'intermediate'
    },
    {
      id: '4',
      title: 'The 5 Love Languages Online Quiz',
      description: 'Find out how you and your partner express and receive love with this popular assessment.',
      type: 'exercise',
      url: 'https://www.5lovelanguages.com/quizzes/',
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
      title: 'Affair Recovery: First Steps',
      description: 'Guidance for couples beginning the healing process after infidelity.',
      type: 'article',
      url: 'https://www.affairrecovery.com/surviving-infidelity/first-steps',
      source: 'Affair Recovery',
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
      title: 'Gottman Relationship Coach: Conflict Management',
      description: 'Research-based digital program for managing conflict in healthy ways.',
      type: 'exercise',
      url: 'https://www.gottman.com/product/gottman-relationship-coach-conflict/',
      source: 'The Gottman Institute',
      tags: ['conflict'],
      difficulty: 'intermediate'
    },
    {
      id: '9',
      title: 'Relationship Repair After an Argument',
      description: 'Evidence-based strategies for reconnecting after conflict.',
      type: 'article',
      url: 'https://psychcentral.com/relationships/relationship-repair-after-an-argument',
      source: 'PsychCentral',
      tags: ['conflict', 'communication'],
      difficulty: 'intermediate'
    },
    {
      id: '10',
      title: 'Where Should We Begin? Podcast',
      description: 'Real couples anonymously share their stories in therapy with relationship expert Esther Perel.',
      type: 'podcast',
      url: 'https://www.estherperel.com/podcast',
      source: 'Esther Perel',
      tags: ['intimacy', 'communication', 'growth'],
      difficulty: 'beginner'
    },
    {
      id: '11',
      title: 'Hold Me Tight: Conversations for Connection',
      description: 'Based on Dr. Sue Johnson\'s Emotionally Focused Therapy approach to building secure attachment.',
      type: 'book',
      url: 'https://www.drsuejohnson.com/books/hold-me-tight/',
      source: 'Dr. Sue Johnson',
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
      title: 'Couples Therapy Worksheets: Communication Packet',
      description: 'Downloadable exercises designed by therapists to improve couple communication.',
      type: 'exercise',
      url: 'https://www.therapistaid.com/therapy-worksheets/communication/couples',
      source: 'TherapistAid',
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
      title: 'Relationship Red Flags: When to Seek Help',
      description: 'Understanding warning signs that indicate your relationship needs professional support.',
      type: 'article',
      url: 'https://www.apa.org/topics/marriage/relationship-help',
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

  // Type icon mapping
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

  // Difficulty mapping for visual indicators
  const getDifficultyLabel = (difficulty: Resource['difficulty']) => {
    switch(difficulty) {
      case 'beginner': return { label: 'Beginner', color: 'bg-green-100 text-green-700' }
      case 'intermediate': return { label: 'Intermediate', color: 'bg-blue-100 text-blue-700' }
      case 'advanced': return { label: 'Advanced', color: 'bg-purple-100 text-purple-700' }
      default: return { label: 'All Levels', color: 'bg-gray-100 text-gray-700' }
    }
  }

  // Define animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  // Mobile view handling
  const [activeTab, setActiveTab] = useState<'search' | 'results'>('search');
  const [isMobile, setIsMobile] = useState(false);
  
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
  
  // Change to results tab when search is performed on mobile
  useEffect(() => {
    if (isMobile && searchQuery && filteredResources.length > 0) {
      setActiveTab('results');
    }
  }, [searchQuery, filteredResources.length, isMobile]);
  
  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      {/* Mobile tabs */}
      {isMobile && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 mb-6 -mx-4 px-4 py-3">
          <div className="flex rounded-lg bg-gray-100 p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === 'search'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
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
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === 'results'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
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
        </div>
      )}
      
      {/* Header with supportive message */}
      <div className={`max-w-7xl mx-auto text-center mb-8 ${isMobile && activeTab === 'results' ? 'hidden' : ''}`}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 
            variants={fadeIn}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent"
          >
            Relationship Resources
          </motion.h1>
          <motion.p 
            variants={fadeIn}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-6"
          >
            Every relationship faces challenges. You're not alone, and reaching out for support
            is a sign of strength.
          </motion.p>
          
          {/* Emergency Support Button */}
          <motion.div 
            variants={fadeIn}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="mt-6"
          >
            <button
              onClick={() => setShowEmergencySupport(!showEmergencySupport)}
              className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {showEmergencySupport ? 'Hide Emergency Help' : 'Need Immediate Help?'}
            </button>
          </motion.div>
        </motion.div>
        
        {/* Emergency Support Panel */}
        <AnimatePresence>
          {showEmergencySupport && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6 max-w-4xl mx-auto overflow-hidden"
            >
              <h2 className="text-xl sm:text-2xl font-bold text-red-700 mb-4 flex items-center justify-center sm:justify-start">
                <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Immediate Support Resources
              </h2>
              <p className="text-red-600 mb-6 text-sm sm:text-base">If you're in danger or experiencing a crisis, please use these resources for immediate help:</p>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {emergencyResources.map((resource, index) => (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white p-4 rounded-lg shadow-sm border border-red-100"
                  >
                    <h3 className="font-bold text-lg text-red-700">{resource.title}</h3>
                    <p className="font-mono text-red-600 my-2">{resource.phone}</p>
                    <a 
                      href={resource.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-800 underline block mb-2"
                    >
                      Visit Website
                    </a>
                    <p className="text-sm text-gray-600">{resource.description}</p>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-white rounded-lg border border-red-100">
                <p className="text-gray-700 flex items-start">
                  <svg className="h-5 w-5 mr-2 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    <strong className="text-red-700">In case of immediate danger:</strong> Call emergency services (911 in the US) if you or someone you know is in immediate danger.
                  </span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="max-w-7xl mx-auto">
        <div className={`${isMobile ? (activeTab === 'search' ? 'block' : 'hidden') : 'block'}`}>
          {/* Category navigation */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-800 mb-3 pl-1">Filter by category:</h2>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {categories.map(category => (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeCategory === category.id 
                      ? `${category.color.split(' ')[0].replace('100', '500')} text-white shadow-md`
                      : `${category.color} hover:bg-opacity-80`
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  <span className="hidden sm:inline">{category.title}</span>
                  <span className="inline sm:hidden">{category.id === 'all' ? 'All' : category.title.split(' ')[0]}</span>
                </motion.button>
              ))}
            </div>
          </div>
          
          {/* Search bar */}
          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources by keyword, topic, or source..."
                className="w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
              <button 
                className="absolute right-3 top-2 p-1 text-gray-400 hover:text-indigo-500"
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
            {filteredResources.length > 0 && isMobile && (
              <div className="mt-3">
                <button 
                  onClick={() => setActiveTab('results')}
                  className="w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center"
                >
                  <span>View {filteredResources.length} results</span>
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Resource grid */}
        <div className={`${isMobile ? (activeTab === 'results' ? 'block' : 'hidden') : 'block'}`}>
          {isMobile && activeTab === 'results' && (
            <div className="mb-4 flex items-center justify-between">
              <button 
                onClick={() => setActiveTab('search')}
                className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
              >
                <svg className="mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Search
              </button>
              <span className="text-sm text-gray-500">
                {filteredResources.length} {filteredResources.length === 1 ? 'result' : 'results'}
              </span>
            </div>
          )}
          
          {filteredResources.length > 0 ? (
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            >
              {filteredResources.map((resource, index) => (
                <motion.div
                  key={resource.id}
                  variants={fadeIn}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 border border-gray-100 cursor-pointer"
                >
                  <div className={`h-2 ${
                    resource.tags?.includes('communication') ? 'bg-blue-500' :
                    resource.tags?.includes('conflict') ? 'bg-amber-500' :
                    resource.tags?.includes('intimacy') ? 'bg-rose-500' :
                    resource.tags?.includes('growth') ? 'bg-green-500' :
                    resource.tags?.includes('crisis') ? 'bg-red-500' :
                    'bg-purple-500'
                  }`}></div>
                  
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start mb-3">
                      <div className={`rounded-full w-10 h-10 flex items-center justify-center mr-3 ${
                        resource.type === 'article' ? 'bg-blue-100 text-blue-600' :
                        resource.type === 'video' ? 'bg-red-100 text-red-600' :
                        resource.type === 'exercise' ? 'bg-green-100 text-green-600' :
                        resource.type === 'book' ? 'bg-purple-100 text-purple-600' :
                        resource.type === 'podcast' ? 'bg-amber-100 text-amber-600' :
                        'bg-indigo-100 text-indigo-600'
                      }`}>
                        <span className="text-lg">{getTypeIcon(resource.type)}</span>
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">{resource.title}</h3>
                        {resource.source && (
                          <p className="text-xs sm:text-sm text-gray-500">Source: {resource.source}</p>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">{resource.description}</p>
                    
                    <div className="mt-1 mb-4 flex flex-wrap gap-2">
                      {resource.tags?.map(tag => (
                        <span 
                          key={tag}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            tag === 'communication' ? 'bg-blue-100 text-blue-800' :
                            tag === 'conflict' ? 'bg-amber-100 text-amber-800' :
                            tag === 'intimacy' ? 'bg-rose-100 text-rose-800' :
                            tag === 'growth' ? 'bg-green-100 text-green-800' :
                            tag === 'crisis' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {tag.charAt(0).toUpperCase() + tag.slice(1)}
                        </span>
                      ))}
                      
                      {resource.difficulty && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyLabel(resource.difficulty).color}`}>
                          {getDifficultyLabel(resource.difficulty).label}
                        </span>
                      )}
                    </div>
                    
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      Access Resource
                      <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 bg-white rounded-xl shadow-sm p-6 border border-gray-100"
            >
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No resources found</h3>
              <p className="text-gray-600">Try adjusting your search or category filter.</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                  if (isMobile) setActiveTab('search');
                }}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Reset Search
              </button>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Support message */}
      <div className="max-w-4xl mx-auto mt-10 p-6 sm:p-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-indigo-800 mb-3 flex items-center justify-center">
            <svg className="h-6 w-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            Need Personalized Support?
          </h2>
          <p className="text-gray-700 mb-6 text-sm sm:text-base">
            While these resources are helpful, sometimes you need professional guidance tailored to your unique situation.
            Our trained therapists are ready to support you and your partner.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link href="/schedule" className="inline-flex justify-center items-center px-4 py-2 sm:px-6 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule a Session
            </Link>
            <Link href="/dashboard/therapy" className="inline-flex justify-center items-center px-4 py-2 sm:px-6 sm:py-3 border border-indigo-300 text-sm sm:text-base font-medium rounded-lg shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 107.072 0m-9.9 2.828a9 9 0 0112.728 0" />
              </svg>
              Start Voice Session
            </Link>
          </div>
        </div>
      </div>
      
      {/* Condensed Community wisdom section */}
      <div className="max-w-5xl mx-auto mt-10 mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-6 flex items-center justify-center">
          <svg className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13h4m-4 0H8m4-6.5v.5m0 7v.5m0-8.75C11.667 2.732 11 2.232 10 2h4c-.667.732-1 1.232-1 1.75z" />
          </svg>
          Community Wisdom
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-5 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center mb-3">
              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                ❤️‍🩹
              </div>
              <h3 className="font-semibold text-gray-900">Healing Takes Time</h3>
            </div>
            <p className="text-gray-600 text-sm">
              "Rebuilding trust is a process, not an event. Be patient with yourselves and each other as you heal."
            </p>
            <p className="text-gray-500 mt-2 text-xs">— From a couple married 27 years</p>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-5 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center mb-3">
              <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3">
                🌱
              </div>
              <h3 className="font-semibold text-gray-900">Growth Together</h3>
            </div>
            <p className="text-gray-600 text-sm">
              "The strongest relationships aren't those without problems, but those where couples grow by facing challenges together."
            </p>
            <p className="text-gray-500 mt-2 text-xs">— From couples therapy group</p>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-5 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center mb-3">
              <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mr-3">
                🔄
              </div>
              <h3 className="font-semibold text-gray-900">Daily Practice</h3>
            </div>
            <p className="text-gray-600 text-sm">
              "Small daily acts of appreciation and connection matter more than grand gestures. Consistency builds security."
            </p>
            <p className="text-gray-500 mt-2 text-xs">— Relationship counselors</p>
          </motion.div>
        </div>
      </div>
      
      {/* Compact Newsletter signup */}
      <div className="max-w-4xl mx-auto mt-10 mb-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl overflow-hidden shadow-md">
        <div className="px-5 py-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between">
          <div className="sm:w-7/12 mb-5 sm:mb-0 text-center sm:text-left">
            <h3 className="text-xl font-bold text-white mb-2">Weekly Relationship Insights</h3>
            <p className="text-indigo-100 text-sm">
              Join our community for expert tips and supportive guidance.
            </p>
          </div>
          <div className="sm:w-5/12 w-full">
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="email" 
                placeholder="Your email" 
                className="px-3 py-2 sm:px-4 sm:py-2 rounded-md text-gray-900 border-0 focus:ring-2 focus:ring-white w-full"
              />
              <button className="bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
            <p className="text-xs text-indigo-100 mt-2 text-center sm:text-left">We respect your privacy. Unsubscribe anytime.</p>
          </div>
        </div>
      </div>
    </div>
  )
}