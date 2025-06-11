/**
 * Feature flags for gradual rollout of refactored therapy components
 * This allows safe deployment with ability to rollback if issues are detected
 */

interface FeatureFlags {
  useRefactoredTherapyButton: boolean
  useRefactoredVapiSession: boolean
  useRefactoredSessionManagement: boolean
  useRefactoredTranscriptHandler: boolean
  useRefactoredUIComponents: boolean
}

// Environment-based feature flag configuration
const getEnvironmentFlags = (): Partial<FeatureFlags> => {
  const env = process.env.NODE_ENV
  const deploymentStage = process.env.NEXT_PUBLIC_DEPLOYMENT_STAGE || 'stable'
  
  // Enable refactored code in development for testing
  if (env === 'development') {
    return {
      useRefactoredTherapyButton: true,
      useRefactoredVapiSession: true,
      useRefactoredSessionManagement: true,
      useRefactoredTranscriptHandler: true,
      useRefactoredUIComponents: true
    }
  }
  
  // Default flags based on deployment stage
  switch (deploymentStage) {
    case 'canary':
      // Enable all refactored components in canary
      return {
        useRefactoredTherapyButton: true,
        useRefactoredVapiSession: true,
        useRefactoredSessionManagement: true,
        useRefactoredTranscriptHandler: true,
        useRefactoredUIComponents: true
      }
    case 'beta':
      // Gradual rollout in beta
      return {
        useRefactoredTherapyButton: false, // Keep main component stable
        useRefactoredVapiSession: true,
        useRefactoredSessionManagement: true,
        useRefactoredTranscriptHandler: true,
        useRefactoredUIComponents: true
      }
    case 'stable':
    default:
      // All features disabled in stable by default
      return {
        useRefactoredTherapyButton: false,
        useRefactoredVapiSession: false,
        useRefactoredSessionManagement: false,
        useRefactoredTranscriptHandler: false,
        useRefactoredUIComponents: false
      }
  }
}

// User-based rollout percentages
const ROLLOUT_PERCENTAGES: Record<keyof FeatureFlags, number> = {
  useRefactoredTherapyButton: 0, // Start with 0% rollout
  useRefactoredVapiSession: 10, // 10% of users get new VAPI hook
  useRefactoredSessionManagement: 10, // 10% of users get new session management
  useRefactoredTranscriptHandler: 20, // 20% of users get new transcript handler
  useRefactoredUIComponents: 50 // 50% of users get new UI components
}

// Generate deterministic hash for user ID
const hashUserId = (userId: string): number => {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Check if user is in rollout percentage
const isUserInRollout = (userId: string, percentage: number): boolean => {
  if (percentage >= 100) return true
  if (percentage <= 0) return false
  
  const userHash = hashUserId(userId)
  const bucket = userHash % 100
  return bucket < percentage
}

// Override flags from localStorage (for testing)
const getLocalOverrides = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') return {}
  
  try {
    const overrides = localStorage.getItem('therapyFeatureFlags')
    return overrides ? JSON.parse(overrides) : {}
  } catch (error) {
    console.warn('Failed to parse feature flag overrides:', error)
    return {}
  }
}

// Admin override from query params (for testing)
const getQueryParamOverrides = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') return {}
  
  const params = new URLSearchParams(window.location.search)
  const overrides: Partial<FeatureFlags> = {}
  
  // Check for specific flag overrides
  for (const [key, value] of params.entries()) {
    if (key.startsWith('ff_')) {
      const flagName = key.substring(3) as keyof FeatureFlags
      if (flagName in ROLLOUT_PERCENTAGES) {
        overrides[flagName] = value === 'true'
      }
    }
  }
  
  return overrides
}

// Main feature flag evaluation function
export const evaluateFeatureFlags = (userId?: string): FeatureFlags => {
  // Start with environment defaults
  const environmentFlags = getEnvironmentFlags()
  
  // Apply user-based rollout if userId provided and not in development
  const userFlags: Partial<FeatureFlags> = {}
  if (userId && process.env.NODE_ENV !== 'development') {
    for (const [flag, percentage] of Object.entries(ROLLOUT_PERCENTAGES)) {
      userFlags[flag as keyof FeatureFlags] = isUserInRollout(userId, percentage)
    }
  }
  
  // Get overrides
  const localOverrides = getLocalOverrides()
  const queryOverrides = getQueryParamOverrides()
  
  // Default flags (all false for production safety)
  const defaultFlags: FeatureFlags = {
    useRefactoredTherapyButton: false,
    useRefactoredVapiSession: false,
    useRefactoredSessionManagement: false,
    useRefactoredTranscriptHandler: false,
    useRefactoredUIComponents: false
  }
  
  // Merge in order of precedence: query > local > environment > user > default
  // Environment flags take precedence over user rollout in development
  return {
    ...defaultFlags,
    ...userFlags,
    ...environmentFlags,
    ...localOverrides,
    ...queryOverrides
  }
}

// Hook for React components
export const useFeatureFlags = (userId?: string): FeatureFlags => {
  const flags = evaluateFeatureFlags(userId)
  
  // Log feature flag state in development only when flags change
  if (process.env.NODE_ENV === 'development') {
    const flagsKey = JSON.stringify(flags)
    const lastFlagsKey = useFeatureFlags.lastFlagsKey
    
    if (flagsKey !== lastFlagsKey) {
      console.log('[Feature Flags]', flags)
      useFeatureFlags.lastFlagsKey = flagsKey
    }
  }
  
  return flags
}

// Store last flags state to prevent duplicate logging
useFeatureFlags.lastFlagsKey = ''

// Utility to set local overrides (for testing)
export const setFeatureFlagOverrides = (overrides: Partial<FeatureFlags>) => {
  if (typeof window === 'undefined') return
  
  try {
    const current = getLocalOverrides()
    const updated = { ...current, ...overrides }
    localStorage.setItem('therapyFeatureFlags', JSON.stringify(updated))
    
    // Trigger page refresh to apply changes
    window.location.reload()
  } catch (error) {
    console.error('Failed to set feature flag overrides:', error)
  }
}

// Clear all local overrides
export const clearFeatureFlagOverrides = () => {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem('therapyFeatureFlags')
  window.location.reload()
}

// Analytics tracking for feature flag usage (placeholder for future implementation)
export const trackFeatureFlagUsage = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  flag: keyof FeatureFlags, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  value: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId?: string
): void => {
  // This would integrate with your analytics service
  // Example implementation:
  // if (process.env.NODE_ENV === 'production') {
  //   analytics.track('feature_flag_evaluated', {
  //     flag_name: flag,
  //     flag_value: value,
  //     user_id: userId,
  //     timestamp: new Date().toISOString()
  //   })
  // }
}

// Export type for use in components
export type { FeatureFlags }