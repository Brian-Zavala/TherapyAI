'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface OnboardingState {
  currentStep: number
  formData: Record<string, any>
  selectedOptions: Record<string, string[]>
  assessmentResults: any[]
}

const INITIAL_STATE: OnboardingState = {
  currentStep: 0,
  formData: {},
  selectedOptions: {},
  assessmentResults: []
}

export function usePersistentOnboarding() {
  const { data: session } = useSession()
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE)
  const [isLoaded, setIsLoaded] = useState(false)

  // Generate storage keys based on user email
  const getStorageKeys = useCallback(() => {
    const email = session?.user?.email
    if (!email) return null
    
    return {
      step: `onboarding_step_${email}`,
      formData: `onboarding_form_data_${email}`,
      selectedOptions: `onboarding_selected_options_${email}`,
      assessmentResults: `onboarding_assessment_results_${email}`
    }
  }, [session?.user?.email])

  // Load state from localStorage on mount
  useEffect(() => {
    // Always set loaded if there's no email (unauthenticated or no email in session)
    if (!session?.user?.email) {
      setIsLoaded(true)
      return
    }

    const keys = getStorageKeys()
    if (!keys) {
      setIsLoaded(true)
      return
    }

    try {
      const savedStep = localStorage.getItem(keys.step)
      const savedFormData = localStorage.getItem(keys.formData)
      const savedSelectedOptions = localStorage.getItem(keys.selectedOptions)
      const savedAssessmentResults = localStorage.getItem(keys.assessmentResults)

      // Helper function to safely parse JSON with fallback
      const safeJsonParse = (jsonString: string | null, fallback: any) => {
        if (!jsonString || jsonString === 'undefined' || jsonString === 'null') {
          return fallback
        }
        try {
          return JSON.parse(jsonString)
        } catch {
          return fallback
        }
      }

      const loadedState: OnboardingState = {
        currentStep: savedStep && savedStep !== 'undefined' ? parseInt(savedStep, 10) : 0,
        formData: safeJsonParse(savedFormData, {}),
        selectedOptions: safeJsonParse(savedSelectedOptions, {}),
        assessmentResults: safeJsonParse(savedAssessmentResults, [])
      }

      // Validate loaded step is within bounds (0-5 for 6 steps)
      if (loadedState.currentStep < 0 || loadedState.currentStep > 5) {
        loadedState.currentStep = 0
      }

      setState(loadedState)
      setIsLoaded(true)
    } catch (error) {
      console.error('Error loading onboarding state from localStorage:', error)
      // Clear corrupted localStorage data
      try {
        localStorage.removeItem(keys.step)
        localStorage.removeItem(keys.formData)
        localStorage.removeItem(keys.selectedOptions)
        localStorage.removeItem(keys.assessmentResults)
      } catch (clearError) {
        console.error('Error clearing localStorage:', clearError)
      }
      setState(INITIAL_STATE)
      setIsLoaded(true)
    }
  }, [session?.user?.email])

  // Save state to localStorage whenever it changes (debounced)
  useEffect(() => {
    if (!isLoaded || !session?.user?.email) return

    const keys = getStorageKeys()
    if (!keys) return

    // Debounce the localStorage save to prevent rapid re-renders
    const timeoutId = setTimeout(() => {
      try {
        // Helper function to safely stringify with fallbacks
        const safeStringify = (value: any, fallback: string) => {
          try {
            const result = JSON.stringify(value)
            return result === undefined ? fallback : result
          } catch {
            return fallback
          }
        }

        localStorage.setItem(keys.step, state.currentStep.toString())
        localStorage.setItem(keys.formData, safeStringify(state.formData, '{}'))
        localStorage.setItem(keys.selectedOptions, safeStringify(state.selectedOptions, '{}'))
        localStorage.setItem(keys.assessmentResults, safeStringify(state.assessmentResults, '[]'))
      } catch (error) {
        console.error('Error saving onboarding state to localStorage:', error)
      }
    }, 100) // 100ms debounce

    return () => clearTimeout(timeoutId)
  }, [state, isLoaded, session?.user?.email])

  // Update functions
  const setCurrentStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }))
  }, [])

  const setFormData = useCallback((data: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => {
    setState(prev => ({ 
      ...prev, 
      formData: typeof data === 'function' ? data(prev.formData) : data 
    }))
  }, [])

  const setSelectedOptions = useCallback((options: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) => {
    setState(prev => ({ 
      ...prev, 
      selectedOptions: typeof options === 'function' ? options(prev.selectedOptions) : options 
    }))
  }, [])

  const setAssessmentResults = useCallback((results: any[]) => {
    setState(prev => ({ ...prev, assessmentResults: results }))
  }, [])

  // Clear all onboarding data (call when onboarding is completed)
  const clearOnboardingState = useCallback(() => {
    const email = session?.user?.email
    if (!email) return

    const keys = {
      step: `onboarding_step_${email}`,
      formData: `onboarding_form_data_${email}`,
      selectedOptions: `onboarding_selected_options_${email}`,
      assessmentResults: `onboarding_assessment_results_${email}`
    }

    try {
      localStorage.removeItem(keys.step)
      localStorage.removeItem(keys.formData)
      localStorage.removeItem(keys.selectedOptions)
      localStorage.removeItem(keys.assessmentResults)
      
      setState(INITIAL_STATE)
    } catch (error) {
      console.error('Error clearing onboarding state from localStorage:', error)
    }
  }, [session?.user?.email])

  // Check if there's existing progress
  const hasExistingProgress = useCallback(() => {
    return state.currentStep > 0 || Object.keys(state.formData).length > 0
  }, [state.currentStep, state.formData])

  return {
    // State
    currentStep: state.currentStep,
    formData: state.formData,
    selectedOptions: state.selectedOptions,
    assessmentResults: state.assessmentResults,
    isLoaded,
    
    // Setters
    setCurrentStep,
    setFormData,
    setSelectedOptions,
    setAssessmentResults,
    
    // Utilities
    clearOnboardingState,
    hasExistingProgress
  }
}