'use client'

import React from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { AlertTriangle, Wifi, WifiOff, Mic, MicOff, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface VapiErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  onReset?: () => void
}

interface VapiErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

function VapiErrorFallback({ error, resetErrorBoundary }: VapiErrorFallbackProps) {
  const isConnectionError = error.message?.toLowerCase().includes('connection') || 
                          error.message?.toLowerCase().includes('network')
  const isPermissionError = error.message?.toLowerCase().includes('permission') ||
                           error.message?.toLowerCase().includes('microphone')
  const isSessionError = error.message?.toLowerCase().includes('session') ||
                        error.message?.toLowerCase().includes('vapi')

  const getErrorIcon = () => {
    if (isConnectionError) return <WifiOff className="w-8 h-8 text-red-400" />
    if (isPermissionError) return <MicOff className="w-8 h-8 text-orange-400" />
    return <AlertTriangle className="w-8 h-8 text-yellow-400" />
  }

  const getErrorTitle = () => {
    if (isConnectionError) return 'Connection Problem'
    if (isPermissionError) return 'Microphone Access Required'
    if (isSessionError) return 'Session Error'
    return 'Voice Session Error'
  }

  const getErrorMessage = () => {
    if (isConnectionError) {
      return 'Unable to connect to the voice service. Please check your internet connection and try again.'
    }
    if (isPermissionError) {
      return 'Please allow microphone access in your browser to use voice therapy. Check your browser settings and reload the page.'
    }
    if (isSessionError) {
      return 'There was a problem with your therapy session. You can try to reconnect or start a new session.'
    }
    return 'An unexpected error occurred with the voice service. Please try again or contact support if the issue persists.'
  }

  const getActionButtons = () => {
    const buttons = []

    // Always show retry button
    buttons.push(
      <button
        key="retry"
        onClick={resetErrorBoundary}
        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Try Again</span>
      </button>
    )

    // Show permission button for mic errors
    if (isPermissionError) {
      buttons.push(
        <button
          key="permissions"
          onClick={() => {
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then(() => {
                toast.success('Microphone access granted!')
                resetErrorBoundary()
              })
              .catch((err) => {
                toast.error('Unable to access microphone. Please check browser settings.')
                console.error('Microphone permission error:', err)
              })
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Mic className="w-4 h-4" />
          <span>Grant Access</span>
        </button>
      )
    }

    // Show reconnect for connection errors
    if (isConnectionError) {
      buttons.push(
        <button
          key="check-connection"
          onClick={() => {
            // Check connection status
            if (navigator.onLine) {
              toast.info('Internet connection is active. Retrying...')
              resetErrorBoundary()
            } else {
              toast.error('No internet connection detected. Please check your network.')
            }
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Wifi className="w-4 h-4" />
          <span>Check Connection</span>
        </button>
      )
    }

    return buttons
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full">
        <div className="flex flex-col items-center text-center space-y-4">
          {getErrorIcon()}
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {getErrorTitle()}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getErrorMessage()}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            {getActionButtons()}
          </div>

          {/* Technical details for debugging */}
          {process.env.NODE_ENV === 'development' && (
            <details className="w-full mt-4">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                  {error.message}
                </p>
                {error.stack && (
                  <pre className="mt-2 text-xs text-gray-500 dark:text-gray-500 overflow-x-auto">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

export function VapiErrorBoundary({ children, onError, onReset }: VapiErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={<VapiErrorFallback error={new Error()} resetErrorBoundary={() => {}} />}
      onError={(error, errorInfo) => {
        // Log VAPI-specific errors
        console.error('[VAPI Error Boundary] Caught error:', {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString()
        })

        // Send to monitoring service
        if (typeof window !== 'undefined' && (window as any).Sentry) {
          (window as any).Sentry.captureException(error, {
            tags: {
              component: 'vapi',
              errorBoundary: 'VapiErrorBoundary'
            },
            contexts: {
              vapi: {
                isOnline: navigator.onLine,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
              }
            }
          })
        }

        // Call custom error handler
        onError?.(error, errorInfo)
      }}
      resetKeys={['vapiSession']}
      isolate={true}
      level="component"
    >
      {children}
    </ErrorBoundary>
  )
}

// Hook to programmatically trigger VAPI errors
export function useVapiErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  const handleVapiError = React.useCallback((error: Error | string) => {
    const vapiError = error instanceof Error 
      ? error 
      : new Error(`VAPI Error: ${error}`)
    
    setError(vapiError)
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  return { handleVapiError, clearError }
}