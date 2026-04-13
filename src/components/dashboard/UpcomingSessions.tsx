// components/UpcomingSessions.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format, isBefore, addHours, differenceInDays, isToday, isTomorrow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardLoading } from '@/app/dashboard/page';
import { DashboardAPIError, DataErrorCard } from './DashboardAPIErrorBoundary';
import { useErrorRecovery } from './DashboardAPIErrorBoundary';
import CalendarLoadingSpinner from './CalendarLoadingSpinner';

type Session = {
  id: string;
  date: string;
  duration: number;
  theme: string;
  notes?: string;
  status: string;
  emailReminderSent?: boolean;
  oneHourReminderSent?: boolean;
};

export default function UpcomingSessions() {
  const { isInitialLoading } = useDashboardLoading();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const errorRecovery = useErrorRecovery();

  // Track screen size for responsive design
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      errorRecovery.clearErrors();
      
      const response = await fetch('/api/sessions/upcoming');
      
      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.error || 'Failed to fetch sessions');
        (error as any).status = response.status;
        (error as any).endpoint = '/api/sessions/upcoming';
        throw error;
      }
      
      const data = await response.json();
      setSessions(data.sessions || data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      const error = err as Error;
      setError(error);
      errorRecovery.recordError(error);
    } finally {
      setLoading(false);
    }
  }, [errorRecovery]);

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
          status: 'CANCELLED'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel session');
      }
      
      // Refresh the sessions list
      fetchSessions();
      
    } catch (err) {
      console.error('Error cancelling session:', err);
      alert(`Failed to cancel session: ${(err as Error).message}`);
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

  // Show placeholder during initial dashboard load
  if (isInitialLoading) {
    return null;
  }

  if (loading) {
    return <CalendarLoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-[520px] bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl p-6">
        <DashboardAPIError
          error={error}
          onRetry={errorRecovery.canRetry ? fetchSessions : undefined}
          componentName="UpcomingSessions"
          showDetails={process.env.NODE_ENV === 'development'}
        />
        {sessions.length === 0 && (
          <div className="mt-4">
            <DataErrorCard
              title="No Sessions Available"
              message="You don't have any upcoming sessions scheduled yet."
              icon={<svg className="w-8 h-8 text-muted-foreground mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl p-6 w-full h-full overflow-y-auto"
    >
      {/* Minimal header with just session count */}
      {sessions.length > 0 && (
        <div className="flex justify-end mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-400/30 rounded-full px-4 py-1.5 text-sm font-medium text-purple-300 whitespace-nowrap"
          >
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </motion.div>
        </div>
      )}


      <div className="h-full overflow-y-auto">
        {sessions.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="h-full min-h-[400px] flex items-center justify-center"
        >
          <div className="text-center p-8 max-w-md">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-6"
            >
              {/* Creative Empty Calendar Visualization */}
              <div className="relative w-24 h-24 mx-auto mb-4">
                {/* Main Calendar */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-purple-500/80 to-pink-500/80 rounded-2xl shadow-xl"
                  animate={{ 
                    rotateY: [0, 10, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {/* Calendar Header */}
                  <div className="absolute top-0 left-0 right-0 h-6 bg-white/20 rounded-t-2xl flex items-center justify-center">
                    <div className="flex space-x-1.5">
                      <motion.div 
                        className="w-2 h-4 bg-white/80 rounded-full"
                        animate={{ height: [16, 12, 16] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <motion.div 
                        className="w-2 h-4 bg-white/80 rounded-full"
                        animate={{ height: [16, 12, 16] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                      />
                    </div>
                  </div>
                  
                  {/* Calendar Grid with Animation */}
                  <div className="absolute top-8 left-2 right-2 bottom-2 grid grid-cols-4 gap-1">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="bg-white/20 rounded-sm"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ 
                          opacity: [0.2, 0.4, 0.2],
                          scale: [0.8, 1, 0.8]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.1
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
                
                {/* Floating Plus Sign */}
                <motion.div
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                </motion.div>
                
                {/* Decorative Stars */}
                <motion.div
                  className="absolute -top-2 -left-2"
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    delay: 0.5
                  }}
                >
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </motion.div>
              </div>
            </motion.div>
            <motion.h3 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-2xl font-bold text-white mb-3"
            >
              Your Calendar Awaits
            </motion.h3>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-white/80 mb-8 leading-relaxed"
            >
              Schedule your therapy sessions to begin your transformative journey towards stronger relationships and better communication.
            </motion.p>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                href="/schedule" 
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium transition-all duration-200 cursor-pointer hover:from-purple-600 hover:to-pink-600 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/20"
              >
                Schedule Your First Session
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
                className={`bg-white/90 backdrop-blur-sm border rounded-xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300 ${isExpanded ? 'border-purple-400 shadow-purple-500/20' : 'border-purple-200/50 hover:border-purple-300'} ${isSmallScreen ? 'mx-1' : ''} cursor-pointer`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className={`font-semibold text-purple-800 ${isSmallScreen ? 'text-sm' : 'text-base'} leading-tight`}>{session.theme}</h3>
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className={`text-xs px-3 py-1 rounded-full font-medium shadow-md whitespace-nowrap flex-shrink-0
                        ${badgeStyles.label === 'Happening soon' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border border-red-400/30' :
                        badgeStyles.label === 'Today' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border border-amber-400/30' :
                        badgeStyles.label === 'Tomorrow' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-400/30' :
                        'bg-gradient-to-r from-green-500 to-green-600 text-white border border-green-400/30'}`}>
                        {badgeStyles.label}
                      </motion.span>
                      {/* Notification status indicators */}
                      <div className="ml-2 flex items-center space-x-1">
                        {session.emailReminderSent && (
                          <div className="group relative">
                            <span className="text-green-600" title="24-hour reminder sent">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </span>
                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              24-hour reminder sent
                            </span>
                          </div>
                        )}
                        {session.oneHourReminderSent && (
                          <div className="group relative">
                            <span className="text-amber-600" title="1-hour reminder sent">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              1-hour reminder sent
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`${isSmallScreen ? 'space-y-1' : 'space-y-1.5'}`}>
                      <p className={`${isSmallScreen ? 'text-xs' : 'text-sm'} text-gray-700 flex items-center font-medium`}>
                        <svg className={`${isSmallScreen ? 'w-3 h-3' : 'w-4 h-4'} mr-2 text-purple-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {format(sessionDate, isSmallScreen ? 'MMM d, yyyy' : 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className={`${isSmallScreen ? 'text-xs' : 'text-sm'} text-gray-700 flex items-center font-medium`}>
                        <svg className={`${isSmallScreen ? 'w-3 h-3' : 'w-4 h-4'} mr-2 text-purple-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {format(sessionDate, 'h:mm a')} ({session.duration} min)
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2 items-center">
                    <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.95 }}>
                      <button
                        onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                        className={`p-2 rounded-full transition-all duration-300 ${isExpanded ? 'bg-purple-100 shadow-md' : 'hover:bg-purple-50'} border border-purple-200/50 cursor-pointer`}
                        title={isExpanded ? 'Collapse details' : 'View details'}
                      >
                        <svg className={`${isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'} text-purple-600 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                      
                      <div className={`flex ${isSmallScreen ? 'flex-col space-y-2' : 'flex-row space-x-2'} justify-end mt-4`}>
                        {badgeStyles.label !== 'Happening soon' && (
                          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                            <Link
                              href={`/dashboard/therapy?sessionId=${session.id}`}
                              className={`flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white ${isSmallScreen ? 'px-4 py-3 w-full' : 'px-4 py-2'} rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:from-blue-400 hover:to-blue-500 transition-all duration-300 border border-blue-400/30`}
                            >
                              <svg className={`${isSmallScreen ? 'w-5 h-5' : 'w-4 h-4'} mr-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Start Session
                            </Link>
                          </motion.div>
                        )}
                        <motion.div whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}>
                          <Link
                            href={`/schedule?reschedule=${session.id}`}
                            className={`flex items-center justify-center bg-white/90 backdrop-blur-sm border border-blue-400 text-blue-600 hover:bg-blue-50 ${isSmallScreen ? 'px-4 py-3 w-full' : 'px-4 py-2'} rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg`}
                          >
                            <svg className={`${isSmallScreen ? 'w-5 h-5' : 'w-4 h-4'} mr-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Reschedule
                          </Link>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}>
                          <button
                            onClick={() => handleCancelSession(session.id)}
                            disabled={isCancelling}
                            className={`flex items-center justify-center bg-white/90 backdrop-blur-sm border border-red-400 text-red-600 hover:bg-red-50 ${isSmallScreen ? 'px-4 py-3 w-full' : 'px-4 py-2'} rounded-xl font-medium transition-all duration-300 disabled:opacity-50 shadow-md hover:shadow-lg`}
                          >
                            {isCancelling ? (
                              <>
                                <svg className={`animate-spin ${isSmallScreen ? 'w-5 h-5' : 'w-4 h-4'} mr-2 text-red-600`} fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Cancelling...
                              </>
                            ) : (
                              <>
                                <svg className={`${isSmallScreen ? 'w-5 h-5' : 'w-4 h-4'} mr-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel
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