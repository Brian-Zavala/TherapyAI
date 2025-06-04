'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import SessionTranscript from '@/components/SessionTranscript'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type TranscriptEntry = {
  id: string
  sessionId: string
  speaker: string
  text: string
  timestamp: string
  isFinal: boolean
}

type Session = {
  id: string
  date: string
  duration: number
  theme: string
  status: string
  transcript?: string | null
  notes?: string | null
  transcriptEntries?: TranscriptEntry[]
}

export default function SessionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'details'>('list')
  
  // Enable smooth scrolling for this page
  useEffect(() => {
    document.documentElement.classList.add('smooth-scroll');
    return () => {
      document.documentElement.classList.remove('smooth-scroll');
    };
  }, []);
  
  useEffect(() => {
    // Redirect if not logged in
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
    
    async function fetchSessions() {
      try {
        setLoading(true)
        
        const response = await fetch('/api/sessions')
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('API error response:', errorData)
          throw new Error(errorData.error || 'Failed to fetch sessions')
        }
        
        const data = await response.json()
        console.log('Sessions data:', data)
        setSessions(data)
      } catch (err) {
        console.error('Error fetching sessions:', err)
        setError('Could not load sessions. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    
    if (status === 'authenticated') {
      fetchSessions()
    }
  }, [status, router])
  
  // Check URL for session parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sessionParam = params.get('session');
      
      if (sessionParam) {
        setSelectedSessionId(sessionParam);
        setActiveTab('details');
      }
    }
  }, []);
  
  function viewSessionTranscript(sessionId: string) {
    setSelectedSessionId(sessionId)
  }
  
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }
  
  // Define animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  // Mobile tab view is handled above with the other state hooks
  
  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto relative z-10">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
          <span className="text-white">Your Sessions</span>
          <span className="ml-2 text-xs bg-blue-500/30 backdrop-blur-sm text-white py-1 px-2 rounded-full border border-blue-400/30">
            {sessions.length} Total
          </span>
        </h1>
        
        {/* Mobile Tabs */}
        <div className="mt-4 md:hidden w-full">
          <div className="flex rounded-md bg-white/10 backdrop-blur-sm p-1 border border-white/20">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                activeTab === 'list'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                activeTab === 'details'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              } ${!selectedSessionId ? 'opacity-50' : ''}`}
              disabled={!selectedSessionId}
            >
              Transcript
            </button>
          </div>
        </div>
      </motion.div>
      
      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-red-500/20 backdrop-blur-md text-red-300 rounded-xl border border-red-400/30 flex items-center"
        >
          <svg className="h-5 w-5 mr-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className={`md:col-span-1 ${activeTab === 'details' ? 'hidden md:block' : ''}`}>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/20"
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Session History
              </h2>
            </div>
            
            <div className="divide-y divide-white/10 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-white/70 flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                  Loading sessions...
                </div>
              ) : sessions.length === 0 ? (
                <motion.div 
                  variants={itemVariants}
                  className="p-6 text-center"
                >
                  <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg p-4 text-white border border-blue-400/30">
                    <p className="font-medium mb-2">No sessions found</p>
                    <p className="text-sm text-white/80">Start your first therapy session from the dashboard.</p>
                  </div>
                </motion.div>
              ) : (
                sessions
                  // Display all sessions, even those not marked as completed yet (status could be 'active')
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(session => (
                    <motion.div
                      key={session.id}
                      variants={itemVariants}
                      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      className={`p-4 cursor-pointer transition-all duration-200 ${
                        selectedSessionId === session.id 
                          ? 'bg-blue-500/20 border-l-4 border-blue-400' 
                          : 'border-l-4 border-transparent hover:border-white/20'
                      }`}
                      onClick={() => {
                        viewSessionTranscript(session.id);
                        if (window.innerWidth < 768) {
                          setActiveTab('details');
                        }
                      }}
                    >
                      <div className="text-sm font-semibold text-white">
                        {format(new Date(session.date), 'PPP')}
                      </div>
                      <div className="text-xs text-white/70 mt-1 flex items-center">
                        <svg className="h-3 w-3 mr-1 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {session.duration} minutes
                        <span className="mx-1">•</span>
                        <span className="capitalize">{session.theme}</span>
                      </div>
                      <div className="mt-2 text-xs text-blue-400 font-medium flex items-center">
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Session Transcript
                      </div>
                    </motion.div>
                  ))
              )}
            </div>
            
            {/* Mobile-only back button */}
            {selectedSessionId && activeTab === 'details' && (
              <div className="p-3 bg-blue-500/20 backdrop-blur-sm border-t border-blue-400/30 md:hidden">
                <button 
                  onClick={() => setActiveTab('list')}
                  className="w-full flex items-center justify-center text-blue-400 text-sm font-medium py-2 hover:text-blue-300 transition-colors"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Sessions
                </button>
              </div>
            )}
          </motion.div>
        </div>
        
        <div className={`md:col-span-2 ${activeTab === 'list' ? 'hidden md:block' : ''}`}>
          {selectedSessionId ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Pass the sessionId and initial session data for efficient loading */}
            <SessionTranscript 
              sessionId={selectedSessionId} 
              initialSession={sessions.find(s => s.id === selectedSessionId)} 
              key={selectedSessionId} // Force re-render when session changes
            />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-8 flex flex-col items-center justify-center text-center h-full border border-white/20"
            >
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-full p-4 mb-6 border border-blue-400/30">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-12 w-12 text-blue-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-white mb-3">No Session Selected</h3>
              <p className="text-white/70 max-w-md mb-6">
                Select a session from the list to view its transcript and detailed conversation.
              </p>
              <div className="mt-2 text-sm text-blue-400">
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center font-medium hover:text-blue-300 transition-colors"
                >
                  <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}