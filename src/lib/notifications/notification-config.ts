/**
 * Centralized Notification Configuration
 * All notification-related settings in one place
 * No hardcoded values - everything configurable via environment
 */

import { z } from 'zod';

// Configuration schema for type safety
const NotificationConfigSchema = z.object({
  // API Configuration
  api: z.object({
    baseUrl: z.string().url().or(z.literal('http://localhost:3000')),
    timeout: z.number().positive(),
    retryAttempts: z.number().min(0).max(5),
    retryDelay: z.number().positive(),
    maxRetryDelay: z.number().positive(),
    batchSize: z.number().positive().max(100),
  }),

  // Supabase Realtime Configuration
  realtime: z.object({
    enabled: z.boolean(),
    url: z.string().url().or(z.string().startsWith('https://placeholder')),
    anonKey: z.string().min(1).or(z.literal('placeholder-anon-key')),
    channel: z.object({
      prefix: z.string(),
      reconnectDelay: z.number().positive(),
      maxReconnectAttempts: z.number().positive(),
      heartbeatInterval: z.number().positive(),
    }),
  }),

  // Performance Configuration
  performance: z.object({
    maxNotifications: z.number().positive(),
    virtualScrollThreshold: z.number().positive(),
    debounceDelay: z.number().min(0),
    throttleDelay: z.number().positive(),
    cacheStaleTime: z.number().min(0),
    cacheGcTime: z.number().positive(),
  }),

  // UI Configuration
  ui: z.object({
    defaultPageSize: z.number().positive().max(100),
    maxPageSize: z.number().positive().max(100),
    autoMarkAsReadDelay: z.number().min(0),
    soundEnabled: z.boolean(),
    soundVolume: z.number().min(0).max(1),
    showBrowserNotifications: z.boolean(),
    groupingThreshold: z.number().positive(),
  }),

  // Feature Flags
  features: z.object({
    enableRealtime: z.boolean(),
    enableOfflineSupport: z.boolean(),
    enableSoundEffects: z.boolean(),
    enableBrowserNotifications: z.boolean(),
    enableBatchOperations: z.boolean(),
    enableVirtualScrolling: z.boolean(),
    enableTelemetry: z.boolean(),
  }),

  // Security Configuration
  security: z.object({
    maxRequestsPerMinute: z.number().positive(),
    maxConnectionsPerUser: z.number().positive(),
    enableCsrfProtection: z.boolean(),
    allowedOrigins: z.array(z.string()),
  }),

  // Monitoring Configuration
  monitoring: z.object({
    enabled: z.boolean(),
    sampleRate: z.number().min(0).max(1),
    errorReportingEnabled: z.boolean(),
    performanceTrackingEnabled: z.boolean(),
    userTrackingEnabled: z.boolean(),
  }),
});

export type NotificationConfig = z.infer<typeof NotificationConfigSchema>;

// Environment variable helpers
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_ prefixed vars
    return process.env[`NEXT_PUBLIC_${key}`] || defaultValue;
  }
  // Server-side: use regular env vars
  return process.env[key] || defaultValue;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = getEnvVar(key, String(defaultValue));
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = getEnvVar(key, String(defaultValue));
  return value === 'true' || value === '1';
};

const getEnvArray = (key: string, defaultValue: string[]): string[] => {
  const value = getEnvVar(key, '');
  return value ? value.split(',').map(s => s.trim()) : defaultValue;
};

// Build configuration from environment
export const buildNotificationConfig = (): NotificationConfig => {
  // Check for required Supabase environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // In development, warn about missing Supabase configuration
  if (process.env.NODE_ENV === 'development' && (!supabaseUrl || !supabaseAnonKey)) {
    console.warn(
      '⚠️ Missing Supabase configuration for notifications!\n' +
      'Please add the following to your .env file:\n' +
      'NEXT_PUBLIC_SUPABASE_URL=your-supabase-url\n' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key\n' +
      '\nNotifications will run in offline mode.'
    );
  }
  
  const config = {
    api: {
      baseUrl: getEnvVar('APP_URL', 'http://localhost:3000'),
      timeout: getEnvNumber('NOTIFICATION_API_TIMEOUT', 30000),
      retryAttempts: getEnvNumber('NOTIFICATION_RETRY_ATTEMPTS', 3),
      retryDelay: getEnvNumber('NOTIFICATION_RETRY_DELAY', 1000),
      maxRetryDelay: getEnvNumber('NOTIFICATION_MAX_RETRY_DELAY', 30000),
      batchSize: getEnvNumber('NOTIFICATION_BATCH_SIZE', 50),
    },
    realtime: {
      enabled: getEnvBoolean('NOTIFICATION_REALTIME_ENABLED', true) && !!supabaseUrl && !!supabaseAnonKey,
      url: supabaseUrl || 'https://placeholder.supabase.co',
      anonKey: supabaseAnonKey || 'placeholder-anon-key',
      channel: {
        prefix: getEnvVar('NOTIFICATION_CHANNEL_PREFIX', 'notifications'),
        reconnectDelay: getEnvNumber('NOTIFICATION_RECONNECT_DELAY', 1000),
        maxReconnectAttempts: getEnvNumber('NOTIFICATION_MAX_RECONNECT', 10),
        heartbeatInterval: getEnvNumber('NOTIFICATION_HEARTBEAT_INTERVAL', 30000),
      },
    },
    performance: {
      maxNotifications: getEnvNumber('NOTIFICATION_MAX_COUNT', 1000),
      virtualScrollThreshold: getEnvNumber('NOTIFICATION_VIRTUAL_SCROLL_THRESHOLD', 100),
      debounceDelay: getEnvNumber('NOTIFICATION_DEBOUNCE_DELAY', 300),
      throttleDelay: getEnvNumber('NOTIFICATION_THROTTLE_DELAY', 1000),
      cacheStaleTime: getEnvNumber('NOTIFICATION_CACHE_STALE_TIME', 300000), // 5 minutes
      cacheGcTime: getEnvNumber('NOTIFICATION_CACHE_GC_TIME', 600000), // 10 minutes
    },
    ui: {
      defaultPageSize: getEnvNumber('NOTIFICATION_DEFAULT_PAGE_SIZE', 20),
      maxPageSize: getEnvNumber('NOTIFICATION_MAX_PAGE_SIZE', 100),
      autoMarkAsReadDelay: getEnvNumber('NOTIFICATION_AUTO_READ_DELAY', 3000),
      soundEnabled: getEnvBoolean('NOTIFICATION_SOUND_ENABLED', true),
      soundVolume: getEnvNumber('NOTIFICATION_SOUND_VOLUME', 0.5),
      showBrowserNotifications: getEnvBoolean('NOTIFICATION_BROWSER_ENABLED', true),
      groupingThreshold: getEnvNumber('NOTIFICATION_GROUPING_THRESHOLD', 5),
    },
    features: {
      enableRealtime: getEnvBoolean('FEATURE_NOTIFICATION_REALTIME', true),
      enableOfflineSupport: getEnvBoolean('FEATURE_NOTIFICATION_OFFLINE', true),
      enableSoundEffects: getEnvBoolean('FEATURE_NOTIFICATION_SOUND', true),
      enableBrowserNotifications: getEnvBoolean('FEATURE_NOTIFICATION_BROWSER', true),
      enableBatchOperations: getEnvBoolean('FEATURE_NOTIFICATION_BATCH', true),
      enableVirtualScrolling: getEnvBoolean('FEATURE_NOTIFICATION_VIRTUAL_SCROLL', true),
      enableTelemetry: getEnvBoolean('FEATURE_NOTIFICATION_TELEMETRY', true),
    },
    security: {
      maxRequestsPerMinute: getEnvNumber('NOTIFICATION_RATE_LIMIT', 60),
      maxConnectionsPerUser: getEnvNumber('NOTIFICATION_MAX_CONNECTIONS', 5),
      enableCsrfProtection: getEnvBoolean('NOTIFICATION_CSRF_PROTECTION', true),
      allowedOrigins: getEnvArray('NOTIFICATION_ALLOWED_ORIGINS', ['http://localhost:3000']),
    },
    monitoring: {
      enabled: getEnvBoolean('NOTIFICATION_MONITORING_ENABLED', true),
      sampleRate: getEnvNumber('NOTIFICATION_SAMPLE_RATE', 0.1),
      errorReportingEnabled: getEnvBoolean('NOTIFICATION_ERROR_REPORTING', true),
      performanceTrackingEnabled: getEnvBoolean('NOTIFICATION_PERF_TRACKING', true),
      userTrackingEnabled: getEnvBoolean('NOTIFICATION_USER_TRACKING', false),
    },
  };

  // Validate configuration
  try {
    return NotificationConfigSchema.parse(config);
  } catch (error) {
    console.error('Invalid notification configuration:', error);
    
    // If it's just missing Supabase config, return a config with realtime disabled
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        ...config,
        realtime: {
          ...config.realtime,
          enabled: false,
        },
      } as NotificationConfig;
    }
    
    // In development, throw to catch configuration errors early
    if (process.env.NODE_ENV === 'development') {
      throw new Error('Invalid notification configuration');
    }
    // In production, return a safe default configuration
    return getDefaultConfig();
  }
};

// Safe default configuration for production fallback
const getDefaultConfig = (): NotificationConfig => ({
  api: {
    baseUrl: 'https://app.example.com',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    maxRetryDelay: 30000,
    batchSize: 50,
  },
  realtime: {
    enabled: false, // Disabled by default for safety
    url: '',
    anonKey: '',
    channel: {
      prefix: 'notifications',
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
    },
  },
  performance: {
    maxNotifications: 500,
    virtualScrollThreshold: 50,
    debounceDelay: 300,
    throttleDelay: 1000,
    cacheStaleTime: 300000,
    cacheGcTime: 600000,
  },
  ui: {
    defaultPageSize: 20,
    maxPageSize: 50,
    autoMarkAsReadDelay: 3000,
    soundEnabled: false,
    soundVolume: 0.5,
    showBrowserNotifications: false,
    groupingThreshold: 5,
  },
  features: {
    enableRealtime: false,
    enableOfflineSupport: true,
    enableSoundEffects: false,
    enableBrowserNotifications: false,
    enableBatchOperations: true,
    enableVirtualScrolling: true,
    enableTelemetry: false,
  },
  security: {
    maxRequestsPerMinute: 30,
    maxConnectionsPerUser: 3,
    enableCsrfProtection: true,
    allowedOrigins: [],
  },
  monitoring: {
    enabled: false,
    sampleRate: 0.01,
    errorReportingEnabled: true,
    performanceTrackingEnabled: false,
    userTrackingEnabled: false,
  },
});

// Singleton instance
let configInstance: NotificationConfig | null = null;

// Get configuration (cached)
export const getNotificationConfig = (): NotificationConfig => {
  if (!configInstance) {
    configInstance = buildNotificationConfig();
  }
  return configInstance;
};

// Reset configuration (useful for testing)
export const resetNotificationConfig = (): void => {
  configInstance = null;
};

// Helper to check if a feature is enabled
export const isFeatureEnabled = (feature: keyof NotificationConfig['features']): boolean => {
  const config = getNotificationConfig();
  return config.features[feature];
};

// Helper to get API endpoint
export const getNotificationEndpoint = (path: string): string => {
  const config = getNotificationConfig();
  return `${config.api.baseUrl}/api/notifications${path}`;
};

// Export for use in other modules
export default getNotificationConfig;