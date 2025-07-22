/**
 * Error Boundary for Dashboard Components
 * Provides graceful error handling and recovery options
 */
"use client";

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: Date | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      lastErrorTime: new Date(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    const { errorCount } = this.state;
    
    // Log error details
    logger.error('Dashboard Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorCount: errorCount + 1,
      timestamp: new Date().toISOString(),
    });
    
    // Update state
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));
    
    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }
    
    // Auto-reset after 3 errors within 1 minute
    if (errorCount >= 2) {
      const timeSinceLastError = this.state.lastErrorTime
        ? Date.now() - this.state.lastErrorTime.getTime()
        : Infinity;
        
      if (timeSinceLastError < 60000) {
        this.scheduleReset(5000);
      }
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    if (hasError) {
      // Reset on prop changes if enabled
      if (resetOnPropsChange && prevProps.children !== this.props.children) {
        this.resetErrorBoundary();
        return;
      }
      
      // Reset on resetKeys change
      if (resetKeys && this.hasResetKeysChanged(resetKeys)) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  hasResetKeysChanged(resetKeys: Array<string | number>): boolean {
    if (resetKeys.length !== this.previousResetKeys.length) {
      return true;
    }
    
    return resetKeys.some((key, index) => key !== this.previousResetKeys[index]);
  }

  scheduleReset(delay: number) {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    
    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    
    this.previousResetKeys = this.props.resetKeys || [];
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null,
    });
  };

  navigateHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback, isolate, showDetails } = this.props;
    
    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }
      
      // Default error UI
      return (
        <div className={isolate ? 'relative' : 'min-h-[400px] flex items-center justify-center p-4'}>
          <Card className="w-full max-w-lg">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    Something went wrong
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {error?.message || 'An unexpected error occurred while loading this component.'}
                  </p>
                  
                  {errorCount > 1 && (
                    <p className="text-xs text-muted-foreground">
                      This error has occurred {errorCount} times.
                    </p>
                  )}
                </div>
                
                {showDetails && error && (
                  <details className="w-full">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                      Show error details
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded-md text-left">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                      {errorInfo && (
                        <>
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-xs font-semibold mb-1">Component Stack:</p>
                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                              {errorInfo.componentStack}
                            </pre>
                          </div>
                        </>
                      )}
                    </div>
                  </details>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.resetErrorBoundary}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try again
                  </Button>
                  
                  {!isolate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={this.navigateHome}
                      className="gap-2"
                    >
                      <Home className="h-4 w-4" />
                      Go to Dashboard
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return children;
  }
}

// ========================================
// FUNCTIONAL COMPONENT WRAPPER
// ========================================

interface DashboardErrorWrapperProps {
  children: ReactNode;
  componentName?: string;
  onError?: (error: Error) => void;
  fallback?: ReactNode;
  isolate?: boolean;
}

export function DashboardErrorWrapper({
  children,
  componentName,
  onError,
  fallback,
  isolate = true,
}: DashboardErrorWrapperProps) {
  return (
    <DashboardErrorBoundary
      fallback={fallback}
      onError={(error, errorInfo) => {
        if (onError) {
          onError(error);
        }
        
        // Log with component context
        logger.error(`Dashboard component error in ${componentName || 'Unknown'}:`, {
          error: error.message,
          component: componentName,
          errorInfo,
        });
      }}
      isolate={isolate}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </DashboardErrorBoundary>
  );
}

// ========================================
// HIGHER ORDER COMPONENT
// ========================================

export function withDashboardErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<Props>
) {
  const WrappedComponent = (props: P) => {
    return (
      <DashboardErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </DashboardErrorBoundary>
    );
  };
  
  WrappedComponent.displayName = `withDashboardErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// ========================================
// ASYNC ERROR BOUNDARY
// ========================================

interface AsyncBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  suspenseFallback?: ReactNode;
}

export function DashboardAsyncBoundary({
  children,
  fallback,
  errorFallback,
  suspenseFallback,
}: AsyncBoundaryProps) {
  return (
    <DashboardErrorBoundary fallback={errorFallback}>
      <React.Suspense fallback={suspenseFallback || fallback || <DashboardLoadingSkeleton />}>
        {children}
      </React.Suspense>
    </DashboardErrorBoundary>
  );
}

// ========================================
// LOADING SKELETON
// ========================================

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-8 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-48 bg-muted animate-pulse rounded" />
    </div>
  );
}