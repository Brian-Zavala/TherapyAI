'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  evaluateFeatureFlags, 
  setFeatureFlagOverrides, 
  clearFeatureFlagOverrides,
  type FeatureFlags 
} from '@/lib/feature-flags'
import { featureFlagMonitoring } from '@/lib/feature-flag-monitoring'
import { useAuth } from '@/hooks/useAuth'

interface FeatureFlagDashboardProps {
  isAdmin?: boolean
}

export function FeatureFlagDashboard({ isAdmin = false }: FeatureFlagDashboardProps) {
  const { user } = useAuth()
  const [flags, setFlags] = useState<FeatureFlags>(evaluateFeatureFlags(user?.id))
  const [performanceComparison, setPerformanceComparison] = useState<Record<string, any>>({})
  const [errorRates, setErrorRates] = useState<Record<string, any>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Update performance comparison
      const comparison = {
        therapyButton: featureFlagMonitoring.compareVersions('TherapyButton', 'render'),
        vapiSession: featureFlagMonitoring.compareVersions('VapiSession', 'start'),
        sessionManagement: featureFlagMonitoring.compareVersions('SessionManagement', 'create'),
        transcriptHandler: featureFlagMonitoring.compareVersions('TranscriptHandler', 'process')
      }
      setPerformanceComparison(comparison)
      
      // Update error rates
      const rates = {
        therapyButton: featureFlagMonitoring.getErrorRates('TherapyButton'),
        vapiSession: featureFlagMonitoring.getErrorRates('VapiSession'),
        sessionManagement: featureFlagMonitoring.getErrorRates('SessionManagement'),
        transcriptHandler: featureFlagMonitoring.getErrorRates('TranscriptHandler')
      }
      setErrorRates(rates)
    }, 5000) // Update every 5 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  // Handle flag toggle
  const handleFlagToggle = (flag: keyof FeatureFlags) => {
    const newFlags = { ...flags, [flag]: !flags[flag] }
    setFlags(newFlags)
    
    if (isAdmin) {
      setFeatureFlagOverrides({ [flag]: newFlags[flag] })
    }
  }
  
  // Get status color based on metrics
  const getStatusColor = (component: string): string => {
    const errors = errorRates[component]
    if (!errors) return 'text-gray-500'
    
    if (errors.refactored > errors.original * 2) return 'text-red-500'
    if (errors.refactored > errors.original) return 'text-yellow-500'
    return 'text-green-500'
  }
  
  // Get performance indicator
  const getPerformanceIndicator = (component: string): string => {
    const perf = performanceComparison[component]
    if (!perf) return '⏱️'
    
    if (perf.improvement > 20) return '🚀' // Much faster
    if (perf.improvement > 0) return '⚡' // Faster
    if (perf.improvement > -10) return '≈' // Similar
    return '🐌' // Slower
  }
  
  if (!isAdmin && process.env.NODE_ENV === 'production') {
    return null // Hide in production for non-admins
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="feature-flag-dashboard bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Feature Flag Control</h2>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-white/70 hover:text-white"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>
      </div>
      
      {/* Flag Controls */}
      <div className="space-y-4">
        {Object.entries(flags).map(([flag, enabled]) => {
          const flagName = flag as keyof FeatureFlags
          const component = flag.replace('useRefactored', '').toLowerCase()
          
          return (
            <div
              key={flag}
              className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">{flag}</h3>
                  <span className={getStatusColor(component)}>
                    {getPerformanceIndicator(component)}
                  </span>
                </div>
                
                {showAdvanced && performanceComparison[component] && (
                  <div className="text-sm text-white/70 mt-1">
                    <span>Original: {performanceComparison[component].original.avg.toFixed(0)}ms</span>
                    <span className="mx-2">→</span>
                    <span>Refactored: {performanceComparison[component].refactored.avg.toFixed(0)}ms</span>
                    <span className="mx-2">
                      ({performanceComparison[component].improvement.toFixed(1)}% 
                      {performanceComparison[component].improvement > 0 ? ' faster' : ' slower'})
                    </span>
                  </div>
                )}
                
                {showAdvanced && errorRates[component] && (
                  <div className="text-sm text-white/70">
                    Error rates: 
                    Original {errorRates[component].original.toFixed(2)}% | 
                    Refactored {errorRates[component].refactored.toFixed(2)}%
                  </div>
                )}
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => handleFlagToggle(flagName)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          )
        })}
      </div>
      
      {/* Action Buttons */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={() => {
            setFeatureFlagOverrides({
              useRefactoredTherapyButton: true,
              useRefactoredVapiSession: true,
              useRefactoredSessionManagement: true,
              useRefactoredTranscriptHandler: true,
              useRefactoredUIComponents: true
            })
          }}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Enable All
        </button>
        
        <button
          onClick={() => {
            setFeatureFlagOverrides({
              useRefactoredTherapyButton: false,
              useRefactoredVapiSession: false,
              useRefactoredSessionManagement: false,
              useRefactoredTranscriptHandler: false,
              useRefactoredUIComponents: false
            })
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Disable All
        </button>
        
        <button
          onClick={clearFeatureFlagOverrides}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
      
      {/* Environment Info */}
      {showAdvanced && (
        <div className="mt-6 p-4 bg-white/5 rounded-lg">
          <h4 className="text-white font-medium mb-2">Environment Info</h4>
          <div className="text-sm text-white/70 space-y-1">
            <div>Environment: {process.env.NODE_ENV}</div>
            <div>Deployment Stage: {process.env.NEXT_PUBLIC_DEPLOYMENT_STAGE || 'stable'}</div>
            <div>User ID: {user?.id || 'anonymous'}</div>
            <div>
              Query Params: 
              {typeof window !== 'undefined' && (
                <span className="ml-2">
                  {new URLSearchParams(window.location.search).toString() || 'none'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}