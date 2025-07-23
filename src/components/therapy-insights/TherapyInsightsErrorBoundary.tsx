'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, TrendingUp, Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showPartialData?: boolean
  partialData?: any
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  isRetrying: boolean
  retryCount: number
}

export class TherapyInsightsErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null
  private readonly MAX_RETRIES = 2
  private readonly RETRY_DELAY = 3000

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props
    
    this.setState({ errorInfo })

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo)
    }

    // Log error details
    console.error('[TherapyInsightsError] Component error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })

    // Log to monitoring in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      this.logToMonitoring(error, errorInfo)
    }

    // Auto-retry for transient errors
    if (this.shouldAutoRetry(error)) {
      this.scheduleRetry()
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  shouldAutoRetry = (error: Error): boolean => {
    const { retryCount } = this.state
    
    // Don't retry if max retries reached
    if (retryCount >= this.MAX_RETRIES) return false
    
    // Check for network/API errors that might be transient
    const transientErrors = [
      'Failed to fetch',
      'Network request failed',
      'timeout',
      '500',
      '502',
      '503',
      '504',
    ]
    
    return transientErrors.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    )
  }

  scheduleRetry = () => {
    const { retryCount } = this.state
    
    this.setState({ isRetrying: true })
    
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
        retryCount: retryCount + 1,
      })
    }, this.RETRY_DELAY)
  }

  logToMonitoring = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Send to Sentry if available
      if ((window as any).Sentry) {
        (window as any).Sentry.withScope((scope: any) => {
          scope.setTag('component', 'therapy-insights')
          scope.setContext('react', {
            componentStack: errorInfo.componentStack,
          })
          scope.setLevel('error')
          ;(window as any).Sentry.captureException(error)
        })
      }
    } catch (loggingError) {
      console.error('[TherapyInsightsError] Failed to log to monitoring:', loggingError)
    }
  }

  handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
      retryCount: this.state.retryCount + 1,
    })
  }

  renderPartialData = () => {
    const { partialData } = this.props
    
    if (!partialData) return null
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 p-4 bg-yellow-900/20 backdrop-blur-sm rounded-xl border border-yellow-700/30"
      >
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          <p className="text-yellow-200 font-medium">
            Showing partial data due to loading error
          </p>
        </div>
        <div className="text-gray-300 text-sm">
          {/* Render whatever partial data is available */}
          {typeof partialData === 'string' ? (
            <p>{partialData}</p>
          ) : (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(partialData, null, 2)}
            </pre>
          )}
        </div>
      </motion.div>
    )
  }

  renderErrorContent = () => {
    const { error, isRetrying, retryCount } = this.state
    const { showPartialData } = this.props
    
    const isNetworkError = error?.message.toLowerCase().includes('network') ||
                          error?.message.toLowerCase().includes('fetch')
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 md:p-8"
      >
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-gray-900/80 rounded-full p-4">
              {isNetworkError ? (
                <TrendingUp className="w-8 h-8 text-red-400" />
              ) : (
                <Heart className="w-8 h-8 text-red-400" />
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-white mb-2">
            {isRetrying ? 'Retrying...' : 'Unable to Load Insights'}
          </h3>

          {/* Description */}
          <p className="text-gray-300 mb-6 max-w-sm">
            {isNetworkError
              ? "We're having trouble connecting to load your AI insights. Please check your connection and try again."
              : "Your AI insights couldn't be loaded at this time. This might be temporary."}
          </p>

          {/* Retry info */}
          {retryCount > 0 && !isRetrying && (
            <p className="text-sm text-gray-400 mb-4">
              Retry attempt {retryCount} of {this.MAX_RETRIES} failed
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={this.handleManualRetry}
              disabled={isRetrying}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                flex items-center gap-2
                ${isRetrying
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </button>
          </div>

          {/* Development error details */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-6 w-full max-w-lg text-left">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-300 text-sm">
                Error Details (Development Only)
              </summary>
              <div className="mt-2 p-4 bg-black/40 rounded-lg overflow-auto">
                <p className="text-red-400 text-sm font-mono mb-2">
                  {error.message}
                </p>
                <pre className="text-xs text-gray-500 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              </div>
            </details>
          )}
        </div>

        {/* Partial data section */}
        {showPartialData && this.renderPartialData()}
      </motion.div>
    )
  }

  render() {
    const { hasError, isRetrying } = this.state
    const { children } = this.props

    if (hasError && !isRetrying) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <AnimatePresence mode="wait">
            {this.renderErrorContent()}
          </AnimatePresence>
        </div>
      )
    }

    return <>{children}</>
  }
}

// HOC wrapper for functional components
export function withTherapyInsightsErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <TherapyInsightsErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </TherapyInsightsErrorBoundary>
  )
  
  WrappedComponent.displayName = `withTherapyInsightsErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Export a hook for accessing error state from child components
export const TherapyInsightsErrorContext = React.createContext<{
  hasError: boolean
  retry: () => void
} | null>(null)

export const useTherapyInsightsError = () => {
  const context = React.useContext(TherapyInsightsErrorContext)
  if (!context) {
    throw new Error('useTherapyInsightsError must be used within TherapyInsightsErrorBoundary')
  }
  return context
}