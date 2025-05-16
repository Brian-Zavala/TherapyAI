// components/UpcomingSessions.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, isBefore, addHours, differenceInDays, isToday, isTomorrow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

type Session = {
  id: string;
  date: string;
  duration: number;
  theme: string;
  notes?: string;
  status: string;
};

export default function UpcomingSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions/upcoming');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch sessions');
      }
      
      const data = await response.json();
      setSessions(data);
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      setError(err.message || 'An error occurred while fetching sessions');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSession(sessionId: string) {
    if (!confirm('Are you sure you want to cancel this session?')) {
      return;
    }
    
    try {
      setCancelling(sessionId);
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'cancelled'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel session');
      }
      
      // Refresh the sessions list
      fetchSessions();
      
    } catch (err: any) {
      console.error('Error cancelling session:', err);
      alert(`Failed to cancel session: ${err.message}`);
    } finally {
      setCancelling(null);
    }
  }
  
  // Helper function to get appropriate badge styles based on session date
  const getSessionBadgeStyles = (date: Date) => {
    const now = new Date();
    
    if (isBefore(date, addHours(now, 1))) {
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Happening soon'
      };
    } 
    
    if (isToday(date)) {
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        label: 'Today'
      };
    }
    
    if (isTomorrow(date)) {
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        label: 'Tomorrow'
      };
    }
    
    return {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: `In ${differenceInDays(date, now)} days`
    };
  };

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/30 p-6 rounded-xl shadow-lg">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            repeat: Infinity,
            duration: 1.5
          }}
          className="flex flex-col items-center"
        >
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-white font-medium">Finding your next sessions...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-80 flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/30 p-6 rounded-xl shadow-lg">
        <div className="text-center p-6 bg-white/90 rounded-lg max-w-sm shadow-md">
          <svg className="w-12 h-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium text-gray-800">Couldn't load your sessions</p>
          <p className="text-sm mt-2 text-red-600">{error}</p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchSessions}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-sm font-medium shadow-lg"
          >
            Try Again
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl p-6 w-full"
    >
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center text-white mr-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white flex-1">
          Upcoming Sessions
        </h2>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div></div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link 
            href="/schedule" 
            className="flex items-center bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-lg hover:from-blue-600 hover:to-blue-600 focus:ring-4 focus:ring-blue-400 relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Schedule New
            </span>
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
            <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-30 blur-lg"></span>
          </Link>
        </motion.div>
      </div>

      <div className="h-80 overflow-y-auto">
        {sessions.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-64 flex items-center justify-center"
        >
          <div className="text-center p-6 max-w-sm">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <svg className="w-16 h-16 mx-auto text-white/80 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2">Your Calendar Awaits</h3>
            <p className="text-sm text-white/80 mb-6">
              Schedule your therapy sessions to begin your transformative journey towards stronger relationships.
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                href="/schedule" 
                className="inline-flex items-center px-6 py-3 bg-white/20 text-white rounded-full text-sm font-medium hover:bg-white/30 transition-all duration-300 backdrop-blur-sm border border-white/30"
              >
                Schedule Your First Session
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          className="space-y-4"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          initial="hidden"
          animate="show"
        >
          {sessions.map((session) => {
            const sessionDate = new Date(session.date);
            const isCancelling = cancelling === session.id;
            const isExpanded = expandedSession === session.id;
            const badgeStyles = getSessionBadgeStyles(sessionDate);
            
            return (
              <motion.div 
                key={session.id} 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 }
                }}
                className={`bg-white/80 border rounded-lg p-4 shadow-md hover:shadow-lg transition-all ${isExpanded ? 'border-blue-400' : 'border-blue-200'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center">
                      <h3 className="font-medium text-blue-800">{session.theme}</h3>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full 
                        ${badgeStyles.label === 'Happening soon' ? 'bg-red-500 text-white' : 
                        badgeStyles.label === 'Today' ? 'bg-amber-500 text-white' : 
                        badgeStyles.label === 'Tomorrow' ? 'bg-blue-500 text-white' : 
                        'bg-green-500 text-white'} shadow-sm`}>
                        {badgeStyles.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {format(sessionDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {format(sessionDate, 'h:mm a')} ({session.duration} minutes)
                    </p>
                  </div>
                  <div className="flex space-x-2 items-center">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <button
                        onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                        className="p-1 rounded-full hover:bg-blue-100 transition-colors"
                      >
                        <svg className={`w-5 h-5 text-blue-600 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                        </svg>
                      </button>
                    </motion.div>
                  </div>
                </div>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 pt-4 border-t border-gray-200"
                    >
                      {session.notes && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-blue-700 mb-1">Session Notes:</h4>
                          <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-md shadow-sm">{session.notes}</p>
                        </div>
                      )}
                      
                      <div className="flex space-x-2 justify-end mt-2">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Link
                            href={`/dashboard/therapy?sessionId=${session.id}`}
                            className="flex items-center bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg shadow-blue-500/30 relative overflow-hidden"
                          >
                            <span className="relative z-10 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Start Session
                            </span>
                            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
                            <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-30 blur-lg"></span>
                          </Link>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <button
                            onClick={() => handleCancelSession(session.id)}
                            disabled={isCancelling}
                            className="flex items-center bg-white border border-red-400 text-red-600 hover:bg-red-50 px-3 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                          >
                            {isCancelling ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Cancelling...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel Session
                              </>
                            )}
                          </button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}
      </div>
    </motion.div>
  );
}