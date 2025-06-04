// lib/env-validation.ts
export interface EnvironmentValidation {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
}

export function validateEmailEnvironment(): EnvironmentValidation {
  const result: EnvironmentValidation = {
    isValid: true,
    missingVars: [],
    warnings: []
  };

  // Required environment variables for email functionality
  const requiredVars = [
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'NEXTAUTH_URL'
  ];

  const optionalVars = [
    'CRON_SECRET' // Required for session reminders
  ];

  // Check required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      result.missingVars.push(varName);
      result.isValid = false;
    }
  });

  // Check optional variables and add warnings
  optionalVars.forEach(varName => {
    if (!process.env[varName]) {
      result.warnings.push(`${varName} is not set - some features may not work`);
    }
  });

  // Validate EMAIL_FROM format
  if (process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes('@')) {
    result.warnings.push('EMAIL_FROM should be a valid email address format');
  }

  // Validate NEXTAUTH_URL format  
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('http')) {
    result.warnings.push('NEXTAUTH_URL should start with http:// or https://');
  }

  return result;
}

export function logEnvironmentValidation() {
  const validation = validateEmailEnvironment();
  
  if (!validation.isValid) {
    console.error('❌ Email configuration validation failed:');
    validation.missingVars.forEach(varName => {
      console.error(`   Missing required variable: ${varName}`);
    });
    console.error('   Email functionality will not work properly');
  } else {
    console.log('✅ Email configuration validation passed');
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Email configuration warnings:');
    validation.warnings.forEach(warning => {
      console.warn(`   ${warning}`);
    });
  }

  return validation;
}