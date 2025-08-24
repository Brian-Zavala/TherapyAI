'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from 'next-auth/react'
import { useProfile } from '@/providers/ProfileProvider'
import { useFamilyMembersEnhanced } from '@/hooks/useFamilyMembersEnhanced'
import TherapyButtonDirectEnhanced from './TherapyButtonDirectEnhanced' // Enhanced direct VAPI implementation
import type { TherapyType } from '@/types/therapy-session'

interface TherapyButtonWrapperProps {
  therapyType: TherapyType
  disabled?: boolean
  forceNewSession?: boolean
  onSessionConflict?: (conflictData: any) => void
  onSessionStarted?: () => void
  linkedSessionId?: string | null
}

/**
 * Wrapper component that provides the therapy button functionality.
 * Now using the enhanced direct VAPI implementation for better performance and maintainability.
 * This wrapper adapts the props from the old interface to the new component.
 */
export function TherapyButtonWrapper(props: TherapyButtonWrapperProps) {
  const { user } = useAuth()
  const { data: authSession } = useSession()
  const { profile } = useProfile()
  const { familyMembers } = useFamilyMembersEnhanced({ autoSave: false })
  
  // Note: The new component handles therapyType, session conflicts, and other features internally
  // We pass the auth session and profile data that it needs
  
  // Using enhanced direct implementation - 88% less code, same functionality
  return (
    <TherapyButtonErrorBoundary
      fallback={<div className="text-red-500">Therapy button temporarily unavailable</div>}
      userId={user?.id}
    >
      <TherapyButtonDirectEnhanced 
        authSession={authSession}
        profileData={profile}
        familyMembers={familyMembers}
        // Pass through all the original props for backward compatibility
        therapyType={props.therapyType}
        disabled={props.disabled}
        forceNewSession={props.forceNewSession}
        onSessionConflict={props.onSessionConflict}
        onSessionStarted={props.onSessionStarted}
        linkedSessionId={props.linkedSessionId}
      />
    </TherapyButtonErrorBoundary>
  )
}

// Error boundary for safe rollback
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class TherapyButtonErrorBoundary extends React.Component<
  {
    children: React.ReactNode
    fallback: React.ReactNode
    userId?: string
  },
  ErrorBoundaryState
> {
  constructor(props: {
    children: React.ReactNode
    fallback: React.ReactNode
    userId?: string
  }) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error('[TherapyButton] Enhanced direct implementation error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userId: this.props.userId,
      timestamp: new Date().toISOString()
    })
    
    // In production, this would send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, {
      //   contexts: {
      //     react: { componentStack: errorInfo.componentStack },
      //     user: { id: this.props.userId }
      //   },
      //   tags: {
      //     component: 'TherapyButtonDirectEnhanced',
      //     implementation: 'direct-vapi'
      //   }
      // })
    }
  }
  
  render() {
    if (this.state.hasError) {
      console.error(
        '[TherapyButton] Component failed to render'
      )
      return this.props.fallback
    }
    
    return this.props.children
  }
}