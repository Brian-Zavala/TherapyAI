'use client';

/**
 * Error Boundary for Notification System
 * Catches and handles all notification-related errors gracefully
 * Provides recovery mechanisms and user feedback
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotificationConfig } from '@/lib/notifications/notification-config';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: string[];
  resetOnPropsChange?: boolean;
  isolate?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
  isRecovering: boolean;
}

export class NotificationErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private readonly maxErrorsPerMinute = 5;
  private readonly autoRecoveryDelay = 5000;
  private readonly errorWindow = 60000; // 1 minute
  private errorTimestamps: number[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const config = getNotificationConfig();
    const now = Date.now();

    // Track error timestamps for rate limiting
    this.errorTimestamps.push(now);
    this.errorTimestamps = this.errorTimestamps.filter(
      timestamp => now - timestamp < this.errorWindow
    );

    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('NotificationErrorBoundary caught an error:', error, errorInfo);
    }

    // Report to monitoring service
    if (config.monitoring.errorReportingEnabled) {
      this.reportError(error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Check if we should auto-recover
    if (this.shouldAutoRecover()) {
      this.scheduleAutoRecovery();
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, index) => key !== prevProps.resetKeys?.[index])) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private shouldAutoRecover(): boolean {
    // Don't auto-recover if too many errors
    if (this.errorTimestamps.length > this.maxErrorsPerMinute) {
      return false;
    }

    // Don't auto-recover for certain error types
    const error = this.state.error;
    if (error?.name === 'ChunkLoadError' || error?.name === 'NetworkError') {
      return true;
    }

    // Auto-recover for transient errors
    return error?.message?.includes('Failed to fetch') || false;
  }

  private scheduleAutoRecovery() {
    this.setState({ isRecovering: true });

    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary();
    }, this.autoRecoveryDelay);
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      errorCount: this.state.errorCount,
      errorRate: this.errorTimestamps.length,
    };

    // Send to monitoring service
    if (typeof window !== 'undefined' && 'fetch' in window) {
      fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'notification_error', ...errorReport }),
      }).catch(err => {
        console.error('Failed to report error:', err);
      });
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
    });
  };

  render() {
    const { hasError, error, isRecovering, errorCount } = this.state;
    const { children, fallback, isolate } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // For isolated errors, show inline error UI
      if (isolate) {
        return (
          <div className="relative p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Notification system error</span>
              <button
                onClick={this.resetErrorBoundary}
                className="ml-auto p-1 hover:bg-red-500/20 rounded"
                aria-label="Retry"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      }

      // Full error UI for non-isolated errors
      return (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-0 z-50 p-4"
          >
            <div className="max-w-lg mx-auto bg-gray-900 border border-red-500/20 rounded-lg shadow-xl">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">
                      Notification System Error
                    </h3>
                    
                    <p className="mt-1 text-sm text-gray-400">
                      {error?.message || 'An unexpected error occurred'}
                    </p>

                    {errorCount > 1 && (
                      <p className="mt-1 text-xs text-gray-500">
                        This error has occurred {errorCount} times
                      </p>
                    )}

                    {isRecovering && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        <span>Auto-recovering in a few seconds...</span>
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={this.resetErrorBoundary}
                        className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm rounded-md transition-colors"
                        disabled={isRecovering}
                      >
                        Try Again
                      </button>
                      
                      <button
                        onClick={() => window.location.reload()}
                        className="px-3 py-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 text-sm rounded-md transition-colors"
                      >
                        Reload Page
                      </button>
                    </div>

                    {process.env.NODE_ENV === 'development' && (
                      <details className="mt-3">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          Error Details
                        </summary>
                        <pre className="mt-2 p-2 bg-black/50 rounded text-xs text-gray-400 overflow-auto max-h-40">
                          {error?.stack}
                        </pre>
                      </details>
                    )}
                  </div>

                  <button
                    onClick={this.resetErrorBoundary}
                    className="flex-shrink-0 p-1 hover:bg-gray-800 rounded transition-colors"
                    aria-label="Dismiss error"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      );
    }

    return <>{children}</>;
  }
}

// Convenience hook to reset error boundary from child components
export const useNotificationErrorReset = () => {
  const context = React.useContext(NotificationErrorResetContext);
  if (!context) {
    throw new Error(
      'useNotificationErrorReset must be used within NotificationErrorBoundary'
    );
  }
  return context;
};

// Context for error reset
const NotificationErrorResetContext = React.createContext<
  (() => void) | undefined
>(undefined);

// Enhanced error boundary with context provider
export const NotificationErrorProvider: React.FC<{
  children: ReactNode;
  isolate?: boolean;
}> = ({ children, isolate = false }) => {
  const [resetKey, setResetKey] = React.useState(0);

  const reset = React.useCallback(() => {
    setResetKey(prev => prev + 1);
  }, []);

  return (
    <NotificationErrorBoundary
      key={resetKey}
      isolate={isolate}
      onError={(error, errorInfo) => {
        // Additional error handling can be added here
        console.error('Notification error:', error, errorInfo);
      }}
    >
      <NotificationErrorResetContext.Provider value={reset}>
        {children}
      </NotificationErrorResetContext.Provider>
    </NotificationErrorBoundary>
  );
};