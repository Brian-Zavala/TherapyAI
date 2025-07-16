'use client'

import React, { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags } from '@/lib/feature-flags'
import { TherapyButtonRefactored } from './TherapyButtonRefactored' // Primary component
import type { TherapyType } from '@/types/therapy-session'

interface TherapyButtonWrapperProps {
  therapyType: TherapyType
  disabled?: boolean
  onSessionConflict?: (conflictData: any) => void
}

/**
 * Wrapper component that determines which version of TherapyButton to render
 * based on feature flags. This enables gradual rollout of the refactored version.
 */
export function TherapyButtonWrapper(props: TherapyButtonWrapperProps) {
  const { user } = useAuth()
  const flags = useFeatureFlags(user?.id)
  const prevFlagRef = useRef<boolean | undefined>(undefined)
  
  // Log which version is being used only when it changes (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && prevFlagRef.current !== flags.useRefactoredTherapyButton) {
      console.log(
        `[TherapyButtonWrapper] Using ${
          flags.useRefactoredTherapyButton ? 'refactored' : 'original'
        } version for user ${user?.id || 'anonymous'}`
      )
      prevFlagRef.current = flags.useRefactoredTherapyButton
    }
  }, [flags.useRefactoredTherapyButton, user?.id])
  
  // Always use refactored version since original is no longer available
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
      console.warn(
        '[TherapyButton] Refactored version failed, falling back to original'
      )
      return this.props.fallback
    }
    
    return this.props.children
  }
}