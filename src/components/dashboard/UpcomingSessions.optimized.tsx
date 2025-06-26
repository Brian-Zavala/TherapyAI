'use client'

import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, ClockIcon, VideoIcon, PlusIcon } from '@/components/ui/icons'
import Link from 'next/link'
import { format, formatDistanceToNow, isToday, isTomorrow, isThisWeek } from 'date-fns'

interface Session {
  id: string
  date: string
  time: string
  duration: number
  therapyType: 'couple' | 'family' | 'individual'
  status: 'scheduled' | 'confirmed' | 'reminder_sent'
  therapistName?: string
  notes?: string
}

interface UpcomingSessionsProps {
  sessions?: Session[]
  isLoading?: boolean
  error?: Error | null
  onScheduleClick?: () => void
  expanded?: boolean
}

// Session card component
const SessionCard = memo(({ session }: { session: Session }) => {
  const sessionDate = new Date(`${session.date} ${session.time}`)
  const isPast = sessionDate < new Date()
  
  const timeLabel = useMemo(() => {
    if (isToday(sessionDate)) return 'Today'
    if (isTomorrow(sessionDate)) return 'Tomorrow'
    if (isThisWeek(sessionDate)) return format(sessionDate, 'EEEE')
    return format(sessionDate, 'MMM d')
  }, [sessionDate])
  
  const therapyTypeColors = {
    couple: 'bg-purple-900/50 text-purple-300 border-purple-700',
    family: 'bg-blue-900/50 text-blue-300 border-blue-700',
    individual: 'bg-green-900/50 text-green-300 border-green-700'
  }
  
  const statusIcons = {
    scheduled: '📅',
    confirmed: '✅',
    reminder_sent: '🔔'
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className={`
        relative overflow-hidden rounded-lg border transition-all
        ${isPast 
          ? 'bg-gray-800/30 border-gray-700 opacity-60' 
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
        }
      `}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-lg font-semibold text-white">{timeLabel}</span>
              <span className="text-sm text-gray-400">
                {format(sessionDate, 'h:mm a')}
              </span>
              <span className="text-sm">{statusIcons[session.status]}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <ClockIcon className="w-4 h-4" />
              <span>{session.duration} minutes</span>
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className={therapyTypeColors[session.therapyType]}
          >
            {session.therapyType}
          </Badge>
        </div>
        
        {/* Therapist info */}
        {session.therapistName && (
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {session.therapistName.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <span className="text-sm text-gray-300">{session.therapistName}</span>
          </div>
        )}
        
        {/* Notes */}
        {session.notes && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">{session.notes}</p>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {formatDistanceToNow(sessionDate, { addSuffix: true })}
          </div>
          {!isPast && (
            <Link href={`/dashboard/therapy?sessionId=${session.id}`}>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-purple-400 hover:text-purple-300"
              >
                <VideoIcon className="w-4 h-4 mr-1" />
                Join
              </Button>
            </Link>
          )}
        </div>
      </div>
      
      {/* Status indicator */}
      {!isPast && isToday(sessionDate) && (
        <div className="absolute top-0 right-0 w-2 h-2 m-2">
          <div className="w-full h-full bg-green-500 rounded-full animate-pulse" />
        </div>
      )}
    </motion.div>
  )
})

SessionCard.displayName = 'SessionCard'

// Empty state component
const EmptyState = memo(({ onScheduleClick }: { onScheduleClick?: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
    className="text-center py-12"
  >
    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
      <CalendarIcon className="w-10 h-10 text-gray-600" />
    </div>
    <h3 className="text-lg font-medium text-white mb-2">No upcoming sessions</h3>
    <p className="text-gray-400 mb-6 max-w-sm mx-auto">
      Schedule your next therapy session to continue your journey
    </p>
    {onScheduleClick ? (
      <Button onClick={onScheduleClick} className="bg-purple-600 hover:bg-purple-700">
        <PlusIcon className="w-4 h-4 mr-2" />
        Schedule Session
      </Button>
    ) : (
      <Link href="/schedule">
        <Button className="bg-purple-600 hover:bg-purple-700">
          <PlusIcon className="w-4 h-4 mr-2" />
          Schedule Session
        </Button>
      </Link>
    )}
  </motion.div>
))

EmptyState.displayName = 'EmptyState'

// Main component
function UpcomingSessionsOptimized({ 
  sessions = [], 
  isLoading = false, 
  error = null,
  onScheduleClick 
}: UpcomingSessionsProps) {
  // Sort sessions by date
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`)
      const dateB = new Date(`${b.date} ${b.time}`)
      return dateA.getTime() - dateB.getTime()
    })
  }, [sessions])
  
  // Group sessions
  const { upcoming, past } = useMemo(() => {
    const now = new Date()
    return sortedSessions.reduce((acc, session) => {
      const sessionDate = new Date(`${session.date} ${session.time}`)
      if (sessionDate >= now) {
        acc.upcoming.push(session)
      } else {
        acc.past.push(session)
      }
      return acc
    }, { upcoming: [] as Session[], past: [] as Session[] })
  }, [sortedSessions])
  
  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-800 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Upcoming Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400">Failed to load sessions</p>
            <p className="text-sm text-gray-500 mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Upcoming Sessions
          </div>
          {upcoming.length > 0 && (
            <Badge variant="secondary" className="bg-gray-800 text-gray-300">
              {upcoming.length} scheduled
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <EmptyState onScheduleClick={onScheduleClick} />
        ) : (
          <div className="space-y-4">
            {/* Upcoming sessions */}
            {upcoming.length > 0 && (
              <div className="space-y-3">
                {upcoming.slice(0, 3).map((session, index) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
            
            {/* Show more link */}
            {upcoming.length > 3 && (
              <Link href="/dashboard/sessions">
                <Button variant="ghost" className="w-full text-purple-400 hover:text-purple-300">
                  View all {upcoming.length} sessions
                </Button>
              </Link>
            )}
            
            {/* Divider */}
            {upcoming.length === 0 && past.length > 0 && (
              <div className="border-t border-gray-700 pt-4">
                <p className="text-sm text-gray-500 mb-3">Recent sessions</p>
                <div className="space-y-3 opacity-60">
                  {past.slice(0, 2).map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default memo(UpcomingSessionsOptimized)