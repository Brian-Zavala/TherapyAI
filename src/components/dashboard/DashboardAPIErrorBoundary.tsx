/**
 * Specialized Error Boundary for Dashboard API Errors
 * Handles API failures, network issues, and data fetching errors
 */
"use client";

import React, { useState, useCallback } from 'react';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface APIErrorInfo {
  status?: number;
  statusText?: string;
  message: string;
  endpoint?: string;
  retryable?: boolean;
}

interface DashboardAPIErrorProps {
  error: Error | APIErrorInfo;
  onRetry?: () => void;
  componentName?: string;
  className?: string;
  showDetails?: boolean;
}

export function DashboardAPIError({
  error,
  onRetry,
  componentName,
  className,
  showDetails = false,
}: DashboardAPIErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  
  const errorInfo = error as APIErrorInfo;
  const isNetworkError = errorInfo.message?.toLowerCase().includes('network') || 
                        errorInfo.message?.toLowerCase().includes('fetch');
  const isServerError = errorInfo.status && errorInfo.status >= 500;
  const isAuthError = errorInfo.status === 401 || errorInfo.status === 403;
  const isNotFound = errorInfo.status === 404;
  const isTimeout = errorInfo.message?.toLowerCase().includes('timeout');
  
  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);
  
  // Determine icon and styling based on error type
  const getErrorIcon = () => {
    if (isNetworkError) return <WifiOff className="h-5 w-5" />;
    if (isServerError) return <ServerCrash className="h-5 w-5" />;
    if (isTimeout) return <Clock className="h-5 w-5" />;
    return <AlertCircle className="h-5 w-5" />;
  };
  
  const getErrorColor = () => {
    if (isAuthError) return 'text-amber-600 dark:text-amber-400';
    if (isNetworkError || isTimeout) return 'text-blue-600 dark:text-blue-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  const getErrorTitle = () => {
    if (isNetworkError) return 'Connection Error';
    if (isServerError) return 'Server Error';
    if (isAuthError) return 'Authentication Error';
    if (isNotFound) return 'Not Found';
    if (isTimeout) return 'Request Timeout';
    return 'Error Loading Data';
  };
  
  const getErrorMessage = () => {
    if (isNetworkError) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (isServerError) {
      return 'Our servers are experiencing issues. Please try again later.';
    }
    if (isAuthError) {
      return 'Your session has expired. Please log in again.';
    }
    if (isNotFound) {
      return 'The requested data could not be found.';
    }
    if (isTimeout) {
      return 'The request took too long to complete. Please try again.';
    }
    return errorInfo.message || 'Failed to load data. Please try again.';
  };
  
  const canRetry = errorInfo.retryable !== false && !isAuthError && onRetry;
  
  return (
    <div className={cn("w-full", className)}>
      <Alert variant={isAuthError ? "warning" : "destructive"}>
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5", getErrorColor())}>
            {getErrorIcon()}
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h4 className="font-semibold text-sm">
                {getErrorTitle()}
              </h4>
              <AlertDescription className="mt-1">
                {getErrorMessage()}
              </AlertDescription>
            </div>
            
            {showDetails && errorInfo.endpoint && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Endpoint:</span> {errorInfo.endpoint}
                {errorInfo.status && (
                  <span className="ml-2">
                    <span className="font-medium">Status:</span> {errorInfo.status}
                  </span>
                )}
              </div>
            )}
            
            {componentName && (
              <div className="text-xs text-muted-foreground">
                Component: {componentName}
              </div>
            )}
            
            {canRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="mt-2 gap-2"
              >
                <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </Button>
            )}
          </div>
        </div>
      </Alert>
    </div>
  );
}

// ========================================
// DATA ERROR CARD
// ========================================

interface DataErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export function DataErrorCard({
  title = "Unable to Load Data",
  message = "There was a problem loading this information.",
  onRetry,
  className,
  icon,
}: DataErrorCardProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        {icon || <AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />}
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-sm">
          {message}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// PARTIAL ERROR STATE
// ========================================

interface PartialErrorProps {
  failedComponents: string[];
  onRetryAll?: () => void;
  onRetryComponent?: (component: string) => void;
}

export function PartialErrorAlert({
  failedComponents,
  onRetryAll,
  onRetryComponent,
}: PartialErrorProps) {
  if (failedComponents.length === 0) return null;
  
  return (
    <Alert variant="warning" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <div className="ml-2">
        <AlertDescription>
          Some data couldn't be loaded: {failedComponents.join(', ')}
        </AlertDescription>
        <div className="flex gap-2 mt-2">
          {onRetryAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetryAll}
              className="h-7 text-xs"
            >
              Retry All
            </Button>
          )}
          {onRetryComponent && failedComponents.map(component => (
            <Button
              key={component}
              variant="ghost"
              size="sm"
              onClick={() => onRetryComponent(component)}
              className="h-7 text-xs"
            >
              Retry {component}
            </Button>
          ))}
        </div>
      </div>
    </Alert>
  );
}

// ========================================
// ERROR RECOVERY HOOK
// ========================================

export function useErrorRecovery() {
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const recordError = useCallback((error: Error) => {
    setLastError(error);
    setErrorCount(prev => prev + 1);
  }, []);
  
  const clearErrors = useCallback(() => {
    setErrorCount(0);
    setLastError(null);
  }, []);
  
  const canRetry = errorCount < 3;
  const shouldShowError = errorCount > 0;
  
  return {
    errorCount,
    lastError,
    recordError,
    clearErrors,
    canRetry,
    shouldShowError,
  };
}