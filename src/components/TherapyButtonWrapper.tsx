'use client'

import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { TherapyButtonRefactored } from './TherapyButtonRefactored' // Primary component
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
 * Wrapper component that determines which version of TherapyButton to render
 * based on feature flags. This enables gradual rollout of the refactored version.
 */
export function TherapyButtonWrapper(props: TherapyButtonWrapperProps) {
  const { user } = useAuth()
  
  // Always use refactored version (original component has been removed)
  return (
    <TherapyButtonErrorBoundary
      fallback={<div className="text-red-500">Therapy button temporarily unavailable</div>}
      userId={user?.id}
    >
      <TherapyButtonRefactored {...props} />
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
    console.error('[TherapyButton] Refactored version error:', {
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
      //     component: 'TherapyButtonRefactored',
      //     feature_flag: 'useRefactoredTherapyButton'
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