'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useClerkSession'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import FamilyMembersStepEnhanced from './FamilyMembersStepEnhanced'
import ConcernsOnboardingStep from './ConcernsOnboardingStep'
import { useFamilyMembersEnhanced } from '@/hooks/useFamilyMembersEnhanced'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import ButtonWithSound from '@/components/ButtonWithSound'
import GlassCard from '@/components/ui/glass-card'
import { toast } from 'sonner'

interface OnboardingStep {
  id: string
  title: string
  description: string
  component: React.ComponentType<any>
}

export default function OnboardingFlowEnhanced() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)
  
  const {
    familyMembers,
    loading,
    error,
    addFamilyMember,
    updateFamilyMember,
    removeFamilyMember,
    saveFamilyMembers,
    hasLegacyData,
    migrateFromLegacyFormat
  } = useFamilyMembersEnhanced({ autoSave: false })

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to CoupleTherapy',
      description: 'Let\'s get you set up for your journey',
      component: WelcomeStep
    },
    {
      id: 'family',
      title: 'Your Family Members',
      description: 'Tell us about your family so we can personalize your sessions',
      component: FamilyMembersStepEnhanced
    },
    {
      id: 'concerns',
      title: 'Your Therapy Goals',
      description: 'What would you like to work on?',
      component: ConcernsOnboardingStep
    },
    {
      id: 'complete',
      title: 'All Set!',
      description: 'You\'re ready to start your first session',
      component: CompleteStep
    }
  ]

  // Check if user has already completed onboarding
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      checkOnboardingStatus()
    }
  }, [status, session])

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/user/onboarding-status')
      if (response.ok) {
        const { completed } = await response.json()
        if (completed) {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
    }
  }

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      await completeOnboarding()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const completeOnboarding = async () => {
    if (!session?.user?.id) {
      toast.error('Please sign in to complete onboarding')
      return
    }

    setIsCompleting(true)
    
    try {
      // Save family members if any were added
      if (familyMembers.length > 0) {
        await saveFamilyMembers()
      }

      // Mark onboarding as complete
      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hasCompletedOnboarding: true,
          familyMemberCount: familyMembers.length
        })
      })

      if (!response.ok) throw new Error('Failed to complete onboarding')

      toast.success('Welcome aboard! Redirecting to dashboard...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast.error('Failed to complete setup. Please try again.')
    } finally {
      setIsCompleting(false)
    }
  }

  const CurrentStepComponent = steps[currentStep].component

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{
                    scale: index <= currentStep ? 1 : 0.8,
                    opacity: index <= currentStep ? 1 : 0.5
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index < currentStep
                      ? 'bg-green-500'
                      : index === currentStep
                      ? 'bg-blue-500'
                      : 'bg-gray-600'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </motion.div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <h2 className="text-2xl font-bold">{steps[currentStep].title}</h2>
            <p className="text-gray-300 mt-2">{steps[currentStep].description}</p>
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CurrentStepComponent
              user={session?.user}
              familyMembers={familyMembers}
              onAddFamilyMember={addFamilyMember}
              onUpdateFamilyMember={updateFamilyMember}
              onRemoveFamilyMember={removeFamilyMember}
              hasLegacyData={hasLegacyData}
              onMigrateLegacy={migrateFromLegacyFormat}
              error={error}
              onNext={handleNext}
              onBack={handleBack}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="mt-8 flex justify-between">
          <ButtonWithSound
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`${currentStep === 0 ? 'invisible' : ''} px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50`}
          >
            Back
          </ButtonWithSound>

          <ButtonWithSound
            onClick={handleNext}
            disabled={isCompleting || (currentStep === 1 && familyMembers.length === 0)}
            className="min-w-[120px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isCompleting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : currentStep === steps.length - 1 ? (
              'Complete Setup'
            ) : (
              'Next'
            )}
          </ButtonWithSound>
        </div>
      </div>
    </div>
  )
}

// Step components
function WelcomeStep({ user }: { user: any }) {
  return (
    <GlassCard className="max-w-2xl mx-auto">
      <div className="text-center py-12 px-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-4xl">💑</span>
          </div>
        </motion.div>
        
        <h3 className="text-3xl font-bold mb-4">
          Welcome, {user?.name || 'Friend'}!
        </h3>
        
        <p className="text-lg text-gray-300 mb-6">
          We're excited to have you here. This quick setup will help us personalize
          your therapy sessions for the best possible experience.
        </p>
        
        <div className="space-y-4 text-left max-w-md mx-auto">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="w-6 h-6 text-green-500 mt-0.5" />
            <div>
              <p className="font-semibold">Personalized Sessions</p>
              <p className="text-sm text-gray-400">Tailored to your family dynamics</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="w-6 h-6 text-green-500 mt-0.5" />
            <div>
              <p className="font-semibold">Progress Tracking</p>
              <p className="text-sm text-gray-400">Monitor your relationship growth</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="w-6 h-6 text-green-500 mt-0.5" />
            <div>
              <p className="font-semibold">AI-Powered Insights</p>
              <p className="text-sm text-gray-400">Get meaningful feedback and guidance</p>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

function CompleteStep() {
  return (
    <GlassCard className="max-w-2xl mx-auto">
      <div className="text-center py-12 px-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <CheckCircleIcon className="w-16 h-16 text-white" />
          </div>
        </motion.div>
        
        <h3 className="text-3xl font-bold mb-4">
          You're All Set!
        </h3>
        
        <p className="text-lg text-gray-300 mb-6">
          Your account is now ready. You can start your first therapy session
          whenever you're ready.
        </p>
        
        <div className="bg-blue-900/30 rounded-lg p-6 mb-6">
          <h4 className="font-semibold mb-2">What's Next?</h4>
          <ul className="text-left space-y-2 text-sm">
            <li>• Your dashboard is ready with personalized insights</li>
            <li>• Start a therapy session anytime by clicking the button</li>
            <li>• Track your progress after each session</li>
            <li>• Access session history and transcripts</li>
          </ul>
        </div>
        
        <p className="text-sm text-gray-400">
          Click "Complete Setup" below to go to your dashboard
        </p>
      </div>
    </GlassCard>
  )
}