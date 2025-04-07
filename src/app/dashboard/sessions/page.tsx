'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import SessionTranscript from '@/components/SessionTranscript'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Session = {
  id: string
  date: string
  duration: number
  theme: string
  status: string
  transcript?: string | null
  notes?: string | null
}

export default function SessionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'details'>('list')
  
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
  
  function viewSessionTranscript(sessionId: string) {
    setSelectedSessionId(sessionId)
  }
  
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
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
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
          <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">Your Sessions</span>
          <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 py-1 px-2 rounded-full">
            {sessions.filter(s => s.status === 'completed').length} Total
          </span>
        </h1>
        
        {/* Mobile Tabs */}
        <div className="mt-4 md:hidden w-full">
          <div className="flex rounded-md bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
                activeTab === 'list'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
                activeTab === 'details'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
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
          className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-center"
        >
          <svg className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
          >
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Session History
              </h2>
            </div>
            
            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-gray-500 flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  Loading sessions...
                </div>
              ) : sessions.length === 0 ? (
                <motion.div 
                  variants={itemVariants}
                  className="p-6 text-center"
                >
                  <div className="bg-indigo-50 rounded-lg p-4 text-indigo-800">
                    <p className="font-medium mb-2">No sessions found</p>
                    <p className="text-sm text-indigo-600">Start your first therapy session from the dashboard.</p>
                  </div>
                </motion.div>
              ) : (
                sessions
                  .filter(s => s.status === 'completed')
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(session => (
                    <motion.div
                      key={session.id}
                      variants={itemVariants}
                      whileHover={{ backgroundColor: '#F9FAFB' }}
                      className={`p-4 cursor-pointer transition-all duration-200 ${
                        selectedSessionId === session.id 
                          ? 'bg-indigo-50 border-l-4 border-indigo-500' 
                          : 'border-l-4 border-transparent'
                      }`}
                      onClick={() => {
                        viewSessionTranscript(session.id);
                        if (window.innerWidth < 768) {
                          setActiveTab('details');
                        }
                      }}
                    >
                      <div className="text-sm font-semibold text-gray-800">
                        {format(new Date(session.date), 'PPP')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center">
                        <svg className="h-3 w-3 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {session.duration} minutes
                        <span className="mx-1">•</span>
                        <span className="capitalize">{session.theme}</span>
                      </div>
                      {session.transcript && (
                        <div className="mt-2 text-xs text-indigo-600 font-medium flex items-center">
                          <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Transcript available
                        </div>
                      )}
                    </motion.div>
                  ))
              )}
            </div>
            
            {/* Mobile-only back button */}
            {selectedSessionId && activeTab === 'details' && (
              <div className="p-3 bg-indigo-50 border-t border-indigo-100 md:hidden">
                <button 
                  onClick={() => setActiveTab('list')}
                  className="w-full flex items-center justify-center text-indigo-600 text-sm font-medium py-2"
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
              <SessionTranscript sessionId={selectedSessionId} />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-xl shadow-sm p-8 flex flex-col items-center justify-center text-center h-full border border-gray-100"
            >
              <div className="bg-indigo-50 rounded-full p-4 mb-6">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-12 w-12 text-indigo-500" 
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
              <h3 className="text-xl font-medium text-gray-800 mb-3">No Session Selected</h3>
              <p className="text-gray-500 max-w-md mb-6">
                Select a session from the list to view its transcript and detailed conversation.
              </p>
              <div className="mt-2 text-sm text-indigo-600">
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center font-medium hover:underline"
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
  )
}