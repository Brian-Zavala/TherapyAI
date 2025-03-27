'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header with supportive message */}
      <div className="max-w-7xl mx-auto text-center mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-gray-900 mb-4"
        >
          Relationship Resources & Support
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl text-gray-600 max-w-3xl mx-auto"
        >
          Every relationship faces challenges. You're not alone, and reaching out for support
          is a sign of strength. Browse our curated resources to find guidance for your journey together.
        </motion.p>
        
        {/* Emergency Support Button */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="mt-8"
        >
          <button
            onClick={() => setShowEmergencySupport(!showEmergencySupport)}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
          >
            {showEmergencySupport ? 'Hide Emergency Resources' : 'Need Immediate Help?'}
          </button>
        </motion.div>
        
        {/* Emergency Support Panel */}
        {showEmergencySupport && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6 max-w-4xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-red-700 mb-4">Immediate Support Resources</h2>
            <p className="text-red-600 mb-6">If you're in danger or experiencing a crisis, please use these resources for immediate help:</p>
            
            <div className="grid md:grid-cols-3 gap-4">
              {emergencyResources.map((resource, index) => (
                <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-red-100">
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
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-white rounded-lg border border-red-100">
              <p className="text-gray-700">
                <strong className="text-red-700">In case of immediate danger:</strong> Call emergency services (911 in the US) if you or someone you know is in immediate danger.
              </p>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Category navigation */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCategory === category.id 
                  ? `${category.color.split(' ')[0].replace('100', '500')} text-white shadow-md`
                  : `${category.color} hover:bg-opacity-80`
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.title}
            </button>
          ))}
        </div>
      </div>
      
      {/* Search bar */}
      <div className="max-w-3xl mx-auto mb-10">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources by keyword, topic, or source..."
            className="w-full px-5 py-3 border border-gray-300 rounded-full shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
          />
          <div className="absolute right-3 top-3 text-gray-400">
            🔍
          </div>
        </div>
      </div>
      
      {/* Resource grid */}
      <div className="max-w-7xl mx-auto">
        {filteredResources.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map(resource => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className={`h-2 ${
                  resource.tags?.includes('communication') ? 'bg-blue-500' :
                  resource.tags?.includes('conflict') ? 'bg-amber-500' :
                  resource.tags?.includes('intimacy') ? 'bg-rose-500' :
                  resource.tags?.includes('growth') ? 'bg-green-500' :
                  resource.tags?.includes('crisis') ? 'bg-red-500' :
                  'bg-purple-500'
                }`}></div>
                
                <div className="p-6">
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
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight">{resource.title}</h3>
                      {resource.source && (
                        <p className="text-sm text-gray-500">Source: {resource.source}</p>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{resource.description}</p>
                  
                  <div className="mt-1 mb-4 flex flex-wrap gap-2">
                    {resource.tags?.map(tag => (
                      <span 
                        key={tag}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyLabel(resource.difficulty).color}`}>
                        {getDifficultyLabel(resource.difficulty).label}
                      </span>
                    )}
                  </div>
                  
                  <a 
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium transition-colors"
                  >
                    Access Resource
                    <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No resources found</h3>
            <p className="text-gray-600">Try adjusting your search or category filter.</p>
          </div>
        )}
      </div>
      
      {/* Support message */}
      <div className="max-w-4xl mx-auto mt-16 p-8 bg-purple-50 rounded-xl shadow-sm border border-purple-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-purple-800 mb-4">Need Personalized Support?</h2>
          <p className="text-gray-700 mb-6">
            While these resources are helpful, sometimes you need professional guidance tailored to your unique situation.
            Our trained therapists are ready to support you and your partner on your journey to a healthier relationship.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/schedule" className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200">
              Schedule a Session
            </Link>
            <Link href="/therapists" className="inline-flex justify-center items-center px-6 py-3 border border-purple-300 text-base font-medium rounded-md shadow-sm text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200">
              Meet Our Therapists
            </Link>
          </div>
        </div>
      </div>
      
      {/* Community wisdom section */}
      <div className="max-w-5xl mx-auto mt-16 mb-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Community Wisdom</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                ❤️‍🩹
              </div>
              <h3 className="font-semibold text-gray-900">Healing Takes Time</h3>
            </div>
            <p className="text-gray-600">
              "Rebuilding trust is a process, not an event. Be patient with yourselves and each other as you heal."
            </p>
            <p className="text-gray-500 mt-2 text-sm">— From a couple married 27 years</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3">
                🌱
              </div>
              <h3 className="font-semibold text-gray-900">Growth Together</h3>
            </div>
            <p className="text-gray-600">
              "The strongest relationships aren't those without problems, but those where couples grow by facing challenges together."
            </p>
            <p className="text-gray-500 mt-2 text-sm">— From couples therapy group insights</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mr-3">
                🔄
              </div>
              <h3 className="font-semibold text-gray-900">Daily Practice</h3>
            </div>
            <p className="text-gray-600">
              "Small daily acts of appreciation and connection matter more than grand gestures. Consistency builds security."
            </p>
            <p className="text-gray-500 mt-2 text-sm">— Shared by relationship counselors</p>
          </div>
        </div>
      </div>
      
      {/* Newsletter signup */}
      <div className="max-w-4xl mx-auto mt-16 mb-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-8 md:p-10 md:py-12 flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-7/12 mb-8 md:mb-0 text-center md:text-left">
            <h3 className="text-2xl font-bold text-white mb-2">Weekly Relationship Insights</h3>
            <p className="text-purple-100">
              Join our community and receive expert tips, new resources, and supportive guidance directly to your inbox.
            </p>
          </div>
          <div className="md:w-5/12">
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="px-4 py-3 rounded-md text-gray-900 border-0 focus:ring-2 focus:ring-white"
              />
              <button className="bg-white text-purple-700 hover:bg-purple-50 px-4 py-3 rounded-md font-medium transition-colors">
                Subscribe
              </button>
            </div>
            <p className="text-xs text-purple-100 mt-2">We respect your privacy. Unsubscribe anytime.</p>
          </div>
        </div>
      </div>
    </div>
  )
}