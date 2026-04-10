// @ts-nocheck
// src/lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';
// Auth session type handled by Clerk

// ========================================
// CONFIGURATION
// ========================================

export interface SentryConfig {
  dsn: string;
  environment: 'development' | 'staging' | 'production';
  release?: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  debug?: boolean;
  enabled?: boolean;
}

const DEFAULT_CONFIG: SentryConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  environment: (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || 'development') as any,
  release: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,
  debug: process.env.NODE_ENV === 'development',
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true'
};

// ========================================
// INITIALIZATION
// ========================================

export function initSentry(config: Partial<SentryConfig> = {}): void {
  const sentryConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (!sentryConfig.enabled || !sentryConfig.dsn) {
    console.log('🔇 Sentry disabled (no DSN or not production)');
    return;
  }

  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    release: sentryConfig.release,
    
    // Performance Monitoring
    tracesSampleRate: sentryConfig.tracesSampleRate,
    
    // Session Replay
    replaysSessionSampleRate: sentryConfig.replaysSessionSampleRate,
    replaysOnErrorSampleRate: sentryConfig.replaysOnErrorSampleRate,
    
    // Debugging
    debug: sentryConfig.debug,
    
    // Integrations
    integrations: [
      Sentry.browserTracingIntegration({
        // Set tracingOrigins to control what URLs are traced
        tracingOrigins: ['localhost', /^\//],
      }),
      Sentry.replayIntegration({
        // Mask all text content, but keep media playback
        maskAllText: true,
        blockAllMedia: false,
        // Sampling options
        sessionSampleRate: sentryConfig.replaysSessionSampleRate,
        errorSampleRate: sentryConfig.replaysOnErrorSampleRate,
      }),
    ],
    
    // Filtering
    beforeSend(event, hint) {
      // Filter out non-error events in development
      if (sentryConfig.environment === 'development' && event.level !== 'error') {
        return null;
      }
      
      // Filter out specific errors
      if (event.exception) {
        const error = hint.originalException;
        
        // Filter out network errors that are expected
        if (error && error instanceof Error) {
          if (error.message?.includes('NetworkError') || 
              error.message?.includes('Failed to fetch')) {
            return null;
          }
        }
        
        // Filter out browser extension errors
        if (event.exception.values?.[0]?.stacktrace?.frames?.some(
          frame => frame.filename?.includes('extension://')
        )) {
          return null;
        }
      }
      
      // Add additional context
      event.contexts = {
        ...event.contexts,
        app: {
          app_name: 'couple-therapy',
          app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        },
      };
      
      return event;
    },
    
    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      
      // Filter out sensitive data from breadcrumbs
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        if (breadcrumb.data?.url?.includes('/api/auth')) {
          breadcrumb.data = { ...breadcrumb.data, url: '[REDACTED AUTH URL]' };
        }
      }
      
      return breadcrumb;
    },
  });

  console.log('✅ Sentry initialized');
}

// ========================================
// USER CONTEXT
// ========================================

export function setSentryUser(session: Session | null): void {
  if (!session?.user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: session.user.id,
    email: session.user.email || undefined,
    username: session.user.name || undefined,
  });

  // Add user context
  Sentry.setContext('user_session', {
    expires: session.expires,
    hasActiveSubscription: (session.user as any).subscriptionStatus === 'active',
    onboardingCompleted: (session.user as any).onboardingCompleted,
  });
}

// ========================================
// ERROR CAPTURE
// ========================================

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  therapyType?: string;
  apiRoute?: string;
  httpStatus?: number;
  requestId?: string;
  [key: string]: any;
}

export function captureError(
  error: Error | unknown,
  context?: ErrorContext,
  level: Sentry.SeverityLevel = 'error'
): string {
  const eventId = Sentry.captureException(error, {
    level,
    contexts: {
      component: context?.component ? { name: context.component } : undefined,
      action: context?.action ? { type: context.action } : undefined,
      therapy_session: context?.sessionId ? {
        session_id: context.sessionId,
        therapy_type: context.therapyType,
      } : undefined,
      api: context?.apiRoute ? {
        route: context.apiRoute,
        status_code: context.httpStatus,
        request_id: context.requestId,
      } : undefined,
    },
    tags: {
      component: context?.component,
      action: context?.action,
      has_session: !!context?.sessionId,
      api_route: context?.apiRoute,
    },
    extra: context,
  });

  return eventId;
}

// ========================================
// PERFORMANCE MONITORING
// ========================================

export function startTransaction(
  name: string,
  op: string = 'navigation'
): any {
  // In Sentry v8, startTransaction is deprecated. Use startSpan instead
  return Sentry.startInactiveSpan({
    name,
    op,
    attributes: {
      source: 'custom',
    },
  });
}

export function measureApiCall(
  route: string,
  method: string = 'GET'
): () => void {
  // In Sentry v8, we use getCurrentScope() instead of getCurrentHub()
  const scope = Sentry.getCurrentScope();
  const transaction = scope.getTransaction?.() || Sentry.getActiveTransaction?.();
  
  if (!transaction) {
    return () => {};
  }

  const span = transaction.startChild({
    op: 'http.client',
    description: `${method} ${route}`,
  });

  return () => {
    span.finish();
  };
}

// ========================================
// CUSTOM METRICS
// ========================================

export function trackMetric(
  name: string,
  value: number,
  unit: string = 'none',
  tags?: Record<string, string>
): void {
  // Check if metrics API is available in v8
  if (Sentry.metrics?.gauge) {
    Sentry.metrics.gauge(name, value, {
      unit,
      tags: {
        ...tags,
        environment: DEFAULT_CONFIG.environment,
      },
    });
  }
}

export function trackSessionMetrics(metrics: {
  duration: number;
  clarityScore?: number;
  empathyScore?: number;
  respectScore?: number;
  overallScore?: number;
}): void {
  trackMetric('session.duration', metrics.duration, 'second');
  
  if (metrics.clarityScore !== undefined) {
    trackMetric('session.clarity_score', metrics.clarityScore, 'ratio');
  }
  if (metrics.empathyScore !== undefined) {
    trackMetric('session.empathy_score', metrics.empathyScore, 'ratio');
  }
  if (metrics.respectScore !== undefined) {
    trackMetric('session.respect_score', metrics.respectScore, 'ratio');
  }
  if (metrics.overallScore !== undefined) {
    trackMetric('session.overall_score', metrics.overallScore, 'ratio');
  }
}

// ========================================
// BREADCRUMBS
// ========================================

export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: Sentry.SeverityLevel = 'info',
  data?: any
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
    data,
  });
}

export function addNavigationBreadcrumb(
  from: string,
  to: string,
  params?: any
): void {
  addBreadcrumb(`Navigate from ${from} to ${to}`, 'navigation', 'info', params);
}

export function addApiCallBreadcrumb(
  method: string,
  url: string,
  status?: number,
  duration?: number
): void {
  addBreadcrumb(
    `${method} ${url}`,
    'http',
    status && status >= 400 ? 'error' : 'info',
    { status, duration }
  );
}

// ========================================
// SESSION REPLAY PRIVACY
// ========================================

export function maskSensitiveElement(element: HTMLElement): void {
  element.setAttribute('data-sentry-mask', 'true');
}

export function blockElement(element: HTMLElement): void {
  element.setAttribute('data-sentry-block', 'true');
}

export function ignoreelement(element: HTMLElement): void {
  element.setAttribute('data-sentry-ignore', 'true');
}

// ========================================
// ERROR BOUNDARY INTEGRATION
// ========================================

export function withSentryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<any>,
  options?: Sentry.ErrorBoundaryOptions
): React.ComponentType<P> {
  return Sentry.withErrorBoundary(Component, {
    fallback,
    showDialog: false,
    ...options,
  });
}

// ========================================
// PROFILING
// ========================================

export function profileComponent<P extends object>(
  Component: React.ComponentType<P>,
  name?: string
): React.ComponentType<P> {
  // Sentry.withProfiler has been removed in v8
  // Profiling is now handled automatically
  return Component;
}