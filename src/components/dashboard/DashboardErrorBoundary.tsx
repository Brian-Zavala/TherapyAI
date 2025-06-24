// src/components/dashboard/DashboardErrorBoundary.tsx
"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { captureError, addBreadcrumb } from "@/lib/monitoring/sentry";

// ========================================
// TYPES & INTERFACES
// ========================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: Date | null;
  errorLocation: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
  componentName?: string;
  showErrorDetails?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface ErrorLogEntry {
  timestamp: Date;
  error: Error;
  errorInfo: ErrorInfo;
  location: string;
  level: string;
}

// ========================================
// ERROR LOGGING SERVICE
// ========================================

class ErrorLogger {
  private static instance: ErrorLogger;
  private errors: ErrorLogEntry[] = [];
  private maxLogs = 50;

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(entry: ErrorLogEntry): void {
    this.errors.unshift(entry);
    if (this.errors.length > this.maxLogs) {
      this.errors = this.errors.slice(0, this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${entry.level}] Error in ${entry.location}:`, entry.error);
      console.error('Component Stack:', entry.errorInfo.componentStack);
    }

    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorTracking(entry);
    }
  }

  private sendToErrorTracking(entry: ErrorLogEntry): void {
    // Send to Sentry with full context
    const eventId = captureError(entry.error, {
      component: entry.componentName,
      action: 'error_boundary_catch',
      errorLocation: entry.componentName,
      errorCount: entry.errorCount,
      userAgent: entry.userAgent,
      url: entry.url,
      timestamp: entry.timestamp.toISOString(),
      stackTrace: entry.stackTrace,
      additionalInfo: entry.additionalInfo
    });
    
    console.error(`Production error captured (Sentry ID: ${eventId}):`, entry);
  }

  getRecentErrors(count: number = 10): ErrorLogEntry[] {
    return this.errors.slice(0, count);
  }

  clearErrors(): void {
    this.errors = [];
  }
}

const errorLogger = ErrorLogger.getInstance();

// ========================================
// ERROR BOUNDARY COMPONENT
// ========================================

export class DashboardErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null,
      errorLocation: props.componentName || 'Unknown Component'
    };
  }

  static defaultProps = {
    level: 'component' as const,
    showErrorDetails: process.env.NODE_ENV === 'development',
    maxRetries: 3,
    retryDelay: 1000
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: new Date()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, level = 'component', componentName = 'Unknown' } = this.props;
    const { errorCount } = this.state;

    // Update error count
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
      errorLocation: componentName
    }));

    // Log error
    errorLogger.log({
      timestamp: new Date(),
      error,
      errorInfo,
      location: componentName,
      level
    });

    // Call custom error handler
    onError?.(error, errorInfo);

    // Auto-retry logic for transient errors
    if (this.shouldAutoRetry(error, errorCount)) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private shouldAutoRetry(error: Error, errorCount: number): boolean {
    const { maxRetries = 3 } = this.props;
    
    // Don't retry if we've exceeded max retries
    if (errorCount >= maxRetries) return false;

    // Check if error is potentially transient
    const transientErrors = [
      'ChunkLoadError',
      'Network request failed',
      'Failed to fetch',
      'Load failed'
    ];

    return transientErrors.some(msg => error.message.includes(msg));
  }

  private scheduleRetry(): void {
    const { retryDelay = 1000 } = this.props;
    const { errorCount } = this.state;
    
    // Exponential backoff
    const delay = retryDelay * Math.pow(2, errorCount - 1);

    this.retryTimeoutId = setTimeout(() => {
      this.reset();
    }, delay);
  }

  reset = (): void => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, errorCount, errorLocation } = this.state;
    const { children, fallback, level = 'component', showErrorDetails, maxRetries = 3 } = this.props;

    if (hasError && error && errorInfo) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, errorInfo, this.reset);
      }

      // Default error UI
      return (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`
              ${level === 'page' ? 'min-h-screen' : level === 'section' ? 'min-h-[400px]' : 'min-h-[200px]'}
              flex items-center justify-center p-4
            `}
          >
            <div className="max-w-md w-full">
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 shadow-lg"
              >
                {/* Error Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {level === 'page' ? 'Page Error' : 
                       level === 'section' ? 'Section Error' : 
                       'Component Error'}
                    </h3>
                    <p className="text-sm text-white/70">
                      Something went wrong in {errorLocation}
                    </p>
                  </div>
                </div>

                {/* Error Message */}
                <div className="mb-4">
                  <p className="text-sm text-white/90 mb-2">
                    {this.getErrorMessage(error)}
                  </p>
                  
                  {errorCount > 1 && (
                    <p className="text-xs text-white/60">
                      Failed {errorCount} times
                      {errorCount < maxRetries && ` (will retry ${maxRetries - errorCount} more times)`}
                    </p>
                  )}
                </div>

                {/* Error Details (Development Only) */}
                {showErrorDetails && (
                  <details className="mb-4">
                    <summary className="text-xs text-white/60 cursor-pointer hover:text-white/80">
                      Technical Details
                    </summary>
                    <div className="mt-2 p-3 bg-black/20 rounded-lg overflow-auto max-h-40">
                      <pre className="text-xs text-white/70 whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    </div>
                  </details>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={this.reset}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                  
                  {level === 'page' && (
                    <button
                      onClick={() => window.location.href = '/'}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      <Home className="w-4 h-4" />
                      Go Home
                    </button>
                  )}
                </div>

                {/* Report Bug Link */}
                {process.env.NODE_ENV === 'production' && (
                  <div className="mt-4 text-center">
                    <a
                      href={`mailto:support@example.com?subject=Error Report: ${encodeURIComponent(error.message)}`}
                      className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white/80"
                    >
                      <Bug className="w-3 h-3" />
                      Report this issue
                    </a>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      );
    }

    return children;
  }

  private getErrorMessage(error: Error): string {
    // User-friendly error messages
    const errorMessages: Record<string, string> = {
      'ChunkLoadError': 'Failed to load application resources. Please refresh the page.',
      'Network request failed': 'Network connection issue. Please check your internet connection.',
      'Failed to fetch': 'Unable to fetch data. Please try again.',
      'TypeError': 'An unexpected error occurred. Please refresh and try again.',
      'ReferenceError': 'Application error. Please refresh the page.'
    };

    // Check for known error types
    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.message.includes(key) || error.name === key) {
        return message;
      }
    }

    // Fallback to generic message in production
    if (process.env.NODE_ENV === 'production') {
      return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
    }

    // Show actual error in development
    return error.message;
  }
}

// ========================================
// UTILITY COMPONENTS
// ========================================

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <DashboardErrorBoundary 
      {...errorBoundaryProps} 
      componentName={Component.displayName || Component.name || 'Component'}
    >
      <Component {...props} />
    </DashboardErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
}

// ========================================
// SPECIALIZED ERROR BOUNDARIES
// ========================================

export function MetricErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <DashboardErrorBoundary
      level="component"
      componentName="Metric Display"
      fallback={(error, _, reset) => (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Unable to load metrics</span>
          </div>
          <p className="text-xs text-yellow-300/70 mt-1">
            {error.message.includes('fetch') ? 'Connection issue' : 'Data error'}
          </p>
          <button
            onClick={reset}
            className="mt-2 text-xs text-yellow-300 hover:text-yellow-200 underline"
          >
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </DashboardErrorBoundary>
  );
}

export function ChartErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <DashboardErrorBoundary
      level="component"
      componentName="Chart"
      fallback={(_, __, reset) => (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-800/50 rounded-lg border border-gray-700">
          <AlertTriangle className="w-8 h-8 text-gray-500 mb-2" />
          <p className="text-gray-400 text-sm mb-3">Chart failed to load</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
          >
            Reload Chart
          </button>
        </div>
      )}
    >
      {children}
    </DashboardErrorBoundary>
  );
}