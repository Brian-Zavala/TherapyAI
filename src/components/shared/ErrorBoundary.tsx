'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  isolate?: boolean
  level?: 'page' | 'section' | 'component'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
  lastErrorTime: number | null
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null
  private readonly MAX_ERROR_COUNT = 3
  private readonly ERROR_RESET_TIME = 60000 // 1 minute

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props
    const { errorCount, lastErrorTime } = this.state

    // Check if errors are happening too frequently
    const now = Date.now()
    const timeSinceLastError = lastErrorTime ? now - lastErrorTime : Infinity
    
    // Reset error count if enough time has passed
    const newErrorCount = timeSinceLastError > this.ERROR_RESET_TIME ? 1 : errorCount + 1

    this.setState({
      errorInfo,
      errorCount: newErrorCount,
    })

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error)
      console.error('Error component stack:', errorInfo.componentStack)
    }

    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }

    // Auto-retry after delay if not too many errors
    if (newErrorCount < this.MAX_ERROR_COUNT) {
      this.scheduleReset(5000) // Try again after 5 seconds
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state
    
    // Reset on prop changes if requested
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary()
      return
    }

    // Reset if resetKeys changed
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) => key !== prevProps.resetKeys![index])
      if (hasResetKeyChanged) {
        this.resetErrorBoundary()
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  scheduleReset = (delay: number) => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
    
    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary()
    }, delay)
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In production, send to error tracking service
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        level: this.props.level || 'component',
      }

      // Send to monitoring service (Sentry, LogRocket, etc.)
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
          extra: errorData,
        })
      }

      // Also log to console for debugging
      console.error('[ErrorBoundary] Error logged:', errorData)
    } catch (loggingError) {
      console.error('[ErrorBoundary] Failed to log error:', loggingError)
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      // Don't reset errorCount immediately to prevent infinite loops
    })
  }

  handleReset = () => {
    this.resetErrorBoundary()
  }

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  render() {
    const { hasError, error, errorCount } = this.state
    const { children, fallback, isolate, level = 'component' } = this.props

    if (hasError && error) {
      // If too many errors, show permanent error state
      if (errorCount >= this.MAX_ERROR_COUNT) {
        return (
          <div className="min-h-[400px] flex items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-900/20 backdrop-blur-lg rounded-xl p-8 max-w-lg w-full text-center"
            >
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Critical Error
              </h2>
              <p className="text-gray-300 mb-6">
                This component is experiencing repeated errors. Please refresh the page or contact support.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                    Error Details
                  </summary>
                  <pre className="mt-2 text-xs text-gray-500 overflow-auto bg-black/30 p-4 rounded">
                    {error.stack}
                  </pre>
                </details>
              )}
            </motion.div>
          </div>
        )
      }

      // Custom fallback
      if (fallback) {
        return <>{fallback}</>
      }

      // Default error UI based on level
      const errorUI = (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            ${level === 'page' ? 'min-h-screen' : level === 'section' ? 'min-h-[400px]' : 'min-h-[200px]'}
            flex items-center justify-center p-4
          `}
        >
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 max-w-md w-full">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white mb-1">
                  {level === 'page' ? 'Page Error' : 'Something went wrong'}
                </h3>
                <p className="text-gray-300 text-sm mb-4">
                  {level === 'page' 
                    ? 'This page encountered an error. You can try refreshing or go back home.'
                    : 'This component encountered an error. It will try to recover automatically.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={this.handleReset}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                  {level === 'page' && (
                    <button
                      onClick={this.handleGoHome}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                    >
                      Go Home
                    </button>
                  )}
                </div>
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 text-xs text-gray-500">
                    {error.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )

      // If isolate is true, render error UI without affecting siblings
      if (isolate) {
        return (
          <div className="contents">
            {errorUI}
          </div>
        )
      }

      return errorUI
    }

    return <>{children}</>
  }
}

// Convenience wrapper for function components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}