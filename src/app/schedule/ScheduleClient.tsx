'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, CheckCircle, XCircle, Loader, AlertCircle, Calendar as CalendarIcon, Users, Repeat, Settings } from 'lucide-react'
import Navigation from '@/components/Navigation'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useProfile } from '@/providers/ProfileProvider'
import { motion, AnimatePresence } from 'framer-motion'
import { EnhancedSchedulerModal } from '@/components/enhanced-scheduler/EnhancedSchedulerModal'
import { CalendarOAuth } from '@/lib/calendar-oauth'
import TherapeuticBokehBackground from '@/components/ui/therapeutic-bokeh-background'
import { UserPreferences } from '@/lib/enhanced-scheduler/types'

interface Session {
  id: string
  userId: string
  partnerId?: string
  partnerName?: string
  familyMembers?: any[]
  startTime: string
  endTime?: string
  status: string
  therapyType: string
  notes?: string
  duration: number
}

export default function ScheduleClient() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile, isLoading: profileLoading } = useProfile()
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showScheduler, setShowScheduler] = useState(false)
  const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null)
  const [calendarIntegrations, setCalendarIntegrations] = useState<any[]>([])
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null)
  const [showRecurringOptions, setShowRecurringOptions] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState('weekly')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isLoadingRescheduleSession, setIsLoadingRescheduleSession] = useState(false)

  // Initialize calendar OAuth
  const calendarOAuth = new CalendarOAuth()

  // Redirect if not authenticated
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [authStatus, router])

  // Fetch sessions
  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Handle reschedule query parameter
  useEffect(() => {
    const rescheduleId = searchParams.get('reschedule')
    if (rescheduleId && authStatus === 'authenticated') {
      handleRescheduleSession(rescheduleId)
    }
  }, [searchParams, authStatus])

  // Set user preferences from profile
  useEffect(() => {
    if (profile && !profileLoading) {
      const prefs: UserPreferences = {
        sessionPreference: profile.sessionPreference,
        preferredDays: profile.preferredDays,
        sessionFrequency: profile.sessionFrequency,
        recurringSession: profile.recurringSession,
        reminderTiming: profile.reminderTiming,
        timeZone: 'UTC', // TODO: Add timezone to profile
        communicationStyle: profile.communicationStyle,
      }
      setUserPreferences(prefs)
      
      // Set recurring options based on user preference
      if (profile.recurringSession === 'yes') {
        setShowRecurringOptions(true)
        setRecurringFrequency(profile.sessionFrequency || 'weekly')
      }
    }
  }, [profile, profileLoading])

  // Fetch calendar integrations
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetch('/api/calendar/integrations')
        .then(res => res.json())
        .then(data => setCalendarIntegrations(data.integrations || []))
        .catch(error => console.error('Error fetching calendar integrations:', error))
    }
  }, [authStatus])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions/upcoming')
      if (!response.ok) throw new Error('Failed to fetch sessions')
      
      const data = await response.json()
      setUpcomingSessions(data.sessions || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRescheduleSession = async (sessionId: string) => {
    try {
      setIsLoadingRescheduleSession(true)
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch session for rescheduling')
      }
      
      const sessionData = await response.json()
      
      // Convert the session data to match the expected format
      const formattedSession: Session = {
        id: sessionData.id,
        userId: sessionData.userId,
        partnerId: sessionData.partnerId,
        partnerName: sessionData.partnerName,
        familyMembers: sessionData.familyMembers || [],
        startTime: sessionData.date,
        endTime: sessionData.endTime,
        status: sessionData.status,
        therapyType: sessionData.sessionType || sessionData.theme || 'individual',
        notes: sessionData.notes,
        duration: sessionData.duration || 60
      }
      
      setSessionToEdit(formattedSession)
      setShowScheduler(true)
      
      // Clear the query parameter to avoid re-triggering
      router.replace('/schedule')
    } catch (error) {
      console.error('Error loading session for rescheduling:', error)
      alert('Unable to load session for rescheduling. Please try again.')
    } finally {
      setIsLoadingRescheduleSession(false)
    }
  }

  const handleConnectCalendar = async (provider: 'google' | 'outlook') => {
    try {
      const authUrl = await calendarOAuth.getAuthUrl(provider)
      window.location.href = authUrl
    } catch (error) {
      console.error('Error connecting calendar:', error)
    }
  }

  const handleDisconnectCalendar = async (integrationId: string) => {
    try {
      await fetch(`/api/calendar/integrations/${integrationId}`, {
        method: 'DELETE'
      })
      
      // Refresh integrations
      const response = await fetch('/api/calendar/integrations')
      const data = await response.json()
      setCalendarIntegrations(data.integrations || [])
    } catch (error) {
      console.error('Error disconnecting calendar:', error)
    }
  }

  const handleScheduleSession = () => {
    setSessionToEdit(null)
    setShowScheduler(true)
  }

  const handleEditSession = (session: Session) => {
    setSessionToEdit(session)
    setShowScheduler(true)
  }

  const handleCancelSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel this session?')) return
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to cancel session')
      
      // Refresh sessions
      fetchSessions()
    } catch (error) {
      console.error('Error cancelling session:', error)
    }
  }

  const handleSchedulerClose = () => {
    setShowScheduler(false)
    setSessionToEdit(null)
    fetchSessions() // Refresh sessions after scheduling
  }

  if (authStatus === 'loading' || profileLoading || isLoadingRescheduleSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-white text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>{isLoadingRescheduleSession ? 'Loading session for rescheduling...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navigation />
      <TherapeuticBokehBackground />
      
      <div className="min-h-screen bg-transparent relative z-10 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Schedule Sessions</h1>
              <p className="text-gray-300">Book and manage your therapy sessions</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleScheduleSession}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl p-6 flex items-center justify-center gap-3 shadow-lg"
              >
                <Calendar className="w-6 h-6" />
                <span className="font-semibold">Schedule New Session</span>
              </motion.button>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-white"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-blue-400" />
                  <h3 className="font-semibold">Next Session</h3>
                </div>
                {upcomingSessions.length > 0 ? (
                  <p className="text-sm text-gray-300">
                    {new Date(upcomingSessions[0].startTime).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">No upcoming sessions</p>
                )}
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-white"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-purple-400" />
                  <h3 className="font-semibold">Therapy Type</h3>
                </div>
                <p className="text-sm text-gray-300 capitalize">
                  Not set
                </p>
              </motion.div>
            </div>

            {/* Calendar Integrations */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Calendar Integrations
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Google Calendar */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">Google Calendar</h3>
                        <p className="text-sm text-gray-400">
                          {calendarIntegrations.find(i => i.provider === 'google') ? 'Connected' : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {calendarIntegrations.find(i => i.provider === 'google') ? (
                      <button
                        onClick={() => handleDisconnectCalendar(calendarIntegrations.find(i => i.provider === 'google')!.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectCalendar('google')}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* Outlook Calendar */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">Outlook Calendar</h3>
                        <p className="text-sm text-gray-400">
                          {calendarIntegrations.find(i => i.provider === 'outlook') ? 'Connected' : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {calendarIntegrations.find(i => i.provider === 'outlook') ? (
                      <button
                        onClick={() => handleDisconnectCalendar(calendarIntegrations.find(i => i.provider === 'outlook')!.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectCalendar('outlook')}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Upcoming Sessions</h2>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader className="w-8 h-8 animate-spin mx-auto text-white" />
                </div>
              ) : upcomingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400">No upcoming sessions scheduled</p>
                  <button
                    onClick={handleScheduleSession}
                    className="mt-4 text-blue-400 hover:text-blue-300"
                  >
                    Schedule your first session
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white/5 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-medium">
                            {session.therapyType} Therapy Session
                          </h3>
                          <p className="text-sm text-gray-300 mt-1">
                            {new Date(session.startTime).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            Duration: {session.duration} minutes
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditSession(session)}
                            className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleCancelSession(session.id)}
                            className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Scheduler Modal */}
      <AnimatePresence>
        {showScheduler && (
          <EnhancedSchedulerModal
            isOpen={showScheduler}
            onClose={handleSchedulerClose}
            sessionToEdit={sessionToEdit}
            userPreferences={userPreferences}
            calendarIntegrations={calendarIntegrations}
          />
        )}
      </AnimatePresence>
    </>
  )
}