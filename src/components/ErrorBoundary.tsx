'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  isolate?: boolean
  showDetails?: boolean
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
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

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Update error count
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Auto-reset after 5 errors in 1 minute (prevents infinite loops)
    if (this.state.errorCount >= 5 && this.state.lastErrorTime) {
      const timeSinceLastError = Date.now() - this.state.lastErrorTime
      if (timeSinceLastError < 60000) {
        console.warn('Too many errors in a short time. Disabling auto-recovery.')
        return
      }
    }

    // Auto-reset after 10 seconds for transient errors
    if (this.props.isolate) {
      this.resetTimeoutId = setTimeout(() => {
        this.resetErrorBoundary()
      }, 10000)
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error boundary when resetKeys change
    if (this.props.resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys![index]
      )
      if (hasResetKeyChanged) {
        this.resetErrorBoundary()
      }
    }

    // Reset on any props change if requested
    if (this.props.resetOnPropsChange && this.state.hasError) {
      this.resetErrorBoundary()
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
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
      errorCount: 0,
      lastErrorTime: null
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.resetErrorBoundary}
          showDetails={this.props.showDetails}
          isolate={this.props.isolate}
        />
      )
    }

    return this.props.children
  }
}

// Default error fallback component
interface ErrorFallbackProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  onReset: () => void
  showDetails?: boolean
  isolate?: boolean
}

function ErrorFallback({ error, errorInfo, onReset, showDetails = false, isolate = false }: ErrorFallbackProps) {
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`${isolate ? '' : 'min-h-screen'} flex items-center justify-center p-4`}
      >
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {isolate ? 'Component Error' : 'Something went wrong'}
            </h2>
            
            <p className="text-gray-600 mb-6">
              {isolate 
                ? 'This component encountered an error but the rest of the app is still working.'
                : 'We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.'}
            </p>

            {error && (
              <div className="w-full mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-mono text-red-800">{error.message}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onReset}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Try Again
              </button>
              
              {!isolate && (
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <HomeIcon className="w-4 h-4 mr-2" />
                  Go Home
                </button>
              )}
            </div>

            {showDetails && errorInfo && (
              <div className="w-full mt-6">
                <button
                  onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {isDetailsOpen ? 'Hide' : 'Show'} Error Details
                </button>
                
                {isDetailsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 overflow-hidden"
                  >
                    <pre className="bg-gray-100 rounded-lg p-4 text-xs text-gray-700 overflow-x-auto text-left">
                      {errorInfo.componentStack}
                    </pre>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Database-specific error boundary
interface DatabaseErrorBoundaryProps extends Props {
  onRetry?: () => Promise<void>
  maxRetries?: number
  retryDelay?: number
}

export class DatabaseErrorBoundary extends Component<DatabaseErrorBoundaryProps, State & { retryCount: number }> {
  constructor(props: DatabaseErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if it's a database error
    const isDatabaseError = error.message.toLowerCase().includes('database') ||
                          error.message.toLowerCase().includes('prisma') ||
                          error.message.toLowerCase().includes('connection') ||
                          error.message.toLowerCase().includes('timeout')

    if (isDatabaseError) {
      return {
        hasError: true,
        error,
        lastErrorTime: Date.now()
      }
    }

    // Re-throw non-database errors
    throw error
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Database error caught:', error, errorInfo)
    
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))

    // Auto-retry logic for database errors
    if (this.props.onRetry && this.state.retryCount < (this.props.maxRetries || 3)) {
      setTimeout(() => {
        this.handleRetry()
      }, this.props.retryDelay || 1000 * (this.state.retryCount + 1))
    }
  }

  handleRetry = async () => {
    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1
    }))

    try {
      if (this.props.onRetry) {
        await this.props.onRetry()
        // If retry succeeds, reset error state
        this.resetErrorBoundary()
      }
    } catch (error) {
      console.error('Retry failed:', error)
      // Error will be caught by error boundary
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null,
      retryCount: 0
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <DatabaseErrorFallback
          error={this.state.error}
          onReset={this.resetErrorBoundary}
          onRetry={this.handleRetry}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries || 3}
        />
      )
    }

    return this.props.children
  }
}

// Database error fallback component
interface DatabaseErrorFallbackProps {
  error: Error | null
  onReset: () => void
  onRetry: () => void
  retryCount: number
  maxRetries: number
}

function DatabaseErrorFallback({ error, onReset, onRetry, retryCount, maxRetries }: DatabaseErrorFallbackProps) {
  const canRetry = retryCount < maxRetries

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center justify-center p-4"
    >
      <div className="max-w-sm w-full bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Database Connection Issue</h3>
            <p className="text-sm text-gray-500">
              {canRetry ? `Retrying... (${retryCount}/${maxRetries})` : 'Unable to connect'}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-gray-600 mb-4">
            {error.message.includes('timeout') 
              ? 'The database is taking longer than usual to respond.'
              : 'We\'re having trouble connecting to the database.'}
          </p>
        )}

        <div className="flex gap-2">
          {canRetry ? (
            <button
              onClick={onRetry}
              className="flex-1 px-3 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors"
            >
              Retry Now
            </button>
          ) : (
            <button
              onClick={onReset}
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              Reset
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Export a hook for programmatic error handling
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  const resetError = () => setError(null)
  const captureError = (error: Error) => setError(error)

  return { resetError, captureError }
}

// Async error boundary for handling Promise rejections
export function AsyncErrorBoundary({ children, ...props }: Props) {
  return (
    <ErrorBoundary {...props}>
      <AsyncErrorHandler>{children}</AsyncErrorHandler>
    </ErrorBoundary>
  )
}

function AsyncErrorHandler({ children }: { children: ReactNode }) {
  const { captureError } = useErrorHandler()

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      captureError(new Error(event.reason))
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [captureError])

  return <>{children}</>
}