// lib/env-validation.ts
import { z } from 'zod';

// 2025 Standard: Comprehensive type definitions
export interface EnvironmentValidation {
  isValid: boolean;
  missingVars: string[];
  invalidVars: Array<{ name: string; error: string }>;
  warnings: string[];
  category: string;
}

export interface FullEnvironmentValidation {
  isValid: boolean;
  categories: Record<string, EnvironmentValidation>;
  summary: {
    totalErrors: number;
    totalWarnings: number;
    criticalErrors: string[];
  };
}

// 2025 Standard: Zod schemas for environment variables
const envSchemas = {
  // Database
  DATABASE_URL: z.string().url().refine(
    (url) => url.includes('postgresql://') || url.includes('postgres://'),
    'Must be a valid PostgreSQL connection string'
  ),
  DIRECT_URL: z.string().url().optional(),
  
  // Authentication
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32, 'Must be at least 32 characters'),
  
  // Email
  RESEND_API_KEY: z.string().regex(/^re_[a-zA-Z0-9]+$/, 'Invalid Resend API key format'),
  EMAIL_FROM: z.string().email('Must be a valid email address'),
  
  // VAPI
  VAPI_API_KEY: z.string().min(1),
  VAPI_ORG_ID: z.string().min(1),
  VAPI_PRIVATE_KEY: z.string().min(1),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  
  // SMS / Twilio
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[a-f0-9]{32}$/, 'Invalid Twilio Account SID format').optional(),
  TWILIO_AUTH_TOKEN: z.string().min(32, 'Must be at least 32 characters').optional(),
  TWILIO_PHONE_NUMBER: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format').optional(),

  // App URL
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Optional services
  SENTRY_DSN: z.string().url().optional(),
  CRON_SECRET: z.string().min(16).optional(),
  CSP_REPORT_URI: z.string().url().optional(),
  
  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
};

// 2025 Standard: Environment variable categories
const envCategories = {
  database: ['DATABASE_URL', 'DIRECT_URL'],
  auth: ['NEXTAUTH_URL', 'NEXTAUTH_SECRET'],
  email: ['RESEND_API_KEY', 'EMAIL_FROM'],
  vapi: ['VAPI_API_KEY', 'VAPI_ORG_ID', 'VAPI_PRIVATE_KEY'],
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  sms: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
  monitoring: ['SENTRY_DSN', 'CSP_REPORT_URI'],
  oauth: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'],
  cron: ['CRON_SECRET']
};

// 2025 Standard: Critical variables that must be present
const criticalVars = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'VAPI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

// 2025 Standard: Validate specific category
export function validateEnvironmentCategory(category: keyof typeof envCategories): EnvironmentValidation {
  const result: EnvironmentValidation = {
    isValid: true,
    missingVars: [],
    invalidVars: [],
    warnings: [],
    category
  };

  const varsToCheck = envCategories[category];
  
  varsToCheck.forEach(varName => {
    const value = process.env[varName];
    const schema = envSchemas[varName as keyof typeof envSchemas];
    
    if (!schema) return;
    
    // Check if required and missing
    if (!value && criticalVars.includes(varName)) {
      result.missingVars.push(varName);
      result.isValid = false;
      return;
    }
    
    // Skip validation if optional and not provided
    if (!value && schema.isOptional()) return;
    
    // Validate value
    try {
      schema.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.invalidVars.push({
          name: varName,
          error: error.errors[0].message
        });
        result.isValid = false;
      }
    }
  });
  
  // Category-specific warnings
  if (category === 'oauth') {
    const hasGoogle = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
    const hasFacebook = process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET;
    
    if (!hasGoogle && !hasFacebook) {
      result.warnings.push('No OAuth providers configured - only email/password login available');
    }
  }
  
  if (category === 'sms') {
    const hasSid = !!process.env.TWILIO_ACCOUNT_SID;
    const hasToken = !!process.env.TWILIO_AUTH_TOKEN;
    const hasPhone = !!process.env.TWILIO_PHONE_NUMBER;
    if ((hasSid || hasToken || hasPhone) && !(hasSid && hasToken && hasPhone)) {
      result.warnings.push('Twilio partially configured - need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER together');
    }
    if (!hasSid) {
      result.warnings.push('Twilio not configured - SMS will use mock implementation');
    }
  }

  if (category === 'monitoring' && !process.env.SENTRY_DSN) {
    result.warnings.push('Sentry not configured - error tracking disabled');
  }
  
  return result;
}

// 2025 Standard: Validate all environment variables
export function validateEnvironment(): FullEnvironmentValidation {
  const categoryResults: Record<string, EnvironmentValidation> = {};
  let totalErrors = 0;
  let totalWarnings = 0;
  const criticalErrors: string[] = [];
  
  // Validate each category
  Object.keys(envCategories).forEach(category => {
    const validation = validateEnvironmentCategory(category as keyof typeof envCategories);
    categoryResults[category] = validation;
    
    if (!validation.isValid) {
      totalErrors += validation.missingVars.length + validation.invalidVars.length;
      
      // Check for critical errors
      validation.missingVars.forEach(varName => {
        if (criticalVars.includes(varName)) {
          criticalErrors.push(`Missing critical variable: ${varName}`);
        }
      });
    }
    
    totalWarnings += validation.warnings.length;
  });
  
  return {
    isValid: criticalErrors.length === 0,
    categories: categoryResults,
    summary: {
      totalErrors,
      totalWarnings,
      criticalErrors
    }
  };
}

// 2025 Standard: Backward compatibility
export function validateEmailEnvironment(): EnvironmentValidation {
  return validateEnvironmentCategory('email');
}

// 2025 Standard: Enhanced logging with colors (when available)
export function logEnvironmentValidation(options?: { 
  detailed?: boolean; 
  exitOnError?: boolean 
}) {
  const validation = validateEnvironment();
  const { detailed = true, exitOnError = false } = options || {};
  
  console.log('\n🔍 Environment Validation Report\n');
  
  // Summary
  if (validation.isValid) {
    console.log('✅ Environment validation PASSED');
  } else {
    console.error('❌ Environment validation FAILED');
    console.error(`   ${validation.summary.totalErrors} errors found`);
    if (validation.summary.criticalErrors.length > 0) {
      console.error('\n🚨 Critical Errors:');
      validation.summary.criticalErrors.forEach(error => {
        console.error(`   - ${error}`);
      });
    }
  }
  
  if (validation.summary.totalWarnings > 0) {
    console.warn(`\n⚠️  ${validation.summary.totalWarnings} warnings found`);
  }
  
  // Detailed report
  if (detailed) {
    console.log('\n📋 Detailed Report by Category:\n');
    
    Object.entries(validation.categories).forEach(([category, result]) => {
      const icon = result.isValid ? '✅' : '❌';
      console.log(`${icon} ${category.toUpperCase()}`);
      
      if (result.missingVars.length > 0) {
        console.error('   Missing variables:');
        result.missingVars.forEach(varName => {
          console.error(`     - ${varName}`);
        });
      }
      
      if (result.invalidVars.length > 0) {
        console.error('   Invalid variables:');
        result.invalidVars.forEach(({ name, error }) => {
          console.error(`     - ${name}: ${error}`);
        });
      }
      
      if (result.warnings.length > 0) {
        console.warn('   Warnings:');
        result.warnings.forEach(warning => {
          console.warn(`     - ${warning}`);
        });
      }
      
      console.log('');
    });
  }
  
  // Exit if requested and validation failed
  if (exitOnError && !validation.isValid) {
    console.error('\n🛑 Exiting due to environment validation errors');
    process.exit(1);
  }
  
  return validation;
}

// 2025 Standard: Runtime validation helper
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value;
}

// 2025 Standard: Type-safe environment access
export const env = new Proxy({} as Record<string, string>, {
  get(target, prop: string) {
    return requireEnv(prop);
  }
});