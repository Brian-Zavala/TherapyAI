'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Spotlight } from '@/components/ui/spotlight-new'
import GlassCard from '@/components/ui/glass-card'
import { useSession } from 'next-auth/react'
import ButtonWithSound from '@/components/ButtonWithSound'
import ConfettiAnimation from '@/components/ui/confetti-animation'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import RelationshipAssessment from '@/components/RelationshipAssessment'
import OnboardingSuccessSplash from '@/components/OnboardingSuccessSplash'

interface FormStep {
  id: number
  title: string
  subtitle: string
  fields: FormField[]
}

interface FormField {
  name: string
  label: string
  type: string
  placeholder?: string
  options?: { value: string; label: string }[]
  required?: boolean
}

const formSteps: FormStep[] = [
  {
    id: 1,
    title: "Welcome! Let's get to know you",
    subtitle: "Tell us a bit about yourself",
    fields: [
      {
        name: 'nickname',
        label: 'What should we call you?',
        type: 'text',
        placeholder: 'Your preferred name',
        required: true
      },
      {
        name: 'age',
        label: 'Your age',
        type: 'number',
        placeholder: 'Your age',
        required: true
      },
      {
        name: 'pronouns',
        label: 'Your pronouns',
        type: 'select',
        options: [
          { value: 'he/him', label: 'He/Him' },
          { value: 'she/her', label: 'She/Her' },
          { value: 'they/them', label: 'They/Them' },
          { value: 'other', label: 'Other' }
        ]
      }
    ]
  },
  {
    id: 2,
    title: "Your relationships",
    subtitle: "Tell us about your loved ones",
    fields: [
      {
        name: 'relationshipStatus',
        label: 'Relationship status (if applicable)',
        type: 'select',
        options: [
          { value: 'Single', label: 'Single' },
          { value: 'Dating', label: 'Dating' },
          { value: 'Engaged', label: 'Engaged' },
          { value: 'Married', label: 'Married' },
          { value: 'Divorced', label: 'Divorced' },
          { value: 'Widowed', label: 'Widowed' },
          { value: 'Separated', label: 'Separated' },
          { value: 'Other', label: 'Other' }
        ]
      },
      {
        name: 'partnerName',
        label: "Partner's name (if applicable)",
        type: 'text',
        placeholder: 'Their name',
        required: false
      },
      {
        name: 'partnerAge',
        label: "Partner's age (if applicable)",
        type: 'number',
        placeholder: 'Their age',
        required: false
      },
      {
        name: 'familyMember1',
        label: 'Family member 1',
        type: 'text',
        placeholder: 'Name (e.g., John - Son)',
        required: false
      },
      {
        name: 'familyMember1Age',
        label: 'Age of family member 1',
        type: 'number',
        placeholder: 'Age',
        required: false
      },
      {
        name: 'familyMember2',
        label: 'Family member 2',
        type: 'text',
        placeholder: 'Name (e.g., Sarah - Daughter)',
        required: false
      },
      {
        name: 'familyMember2Age',
        label: 'Age of family member 2',
        type: 'number',
        placeholder: 'Age',
        required: false
      },
      {
        name: 'familyMember3',
        label: 'Family member 3',
        type: 'text',
        placeholder: 'Name (e.g., Michael - Father)',
        required: false
      },
      {
        name: 'familyMember3Age',
        label: 'Age of family member 3',
        type: 'number',
        placeholder: 'Age',
        required: false
      },
      {
        name: 'familyMember4',
        label: 'Family member 4',
        type: 'text',
        placeholder: 'Name (e.g., Linda - Mother)',
        required: false
      },
      {
        name: 'familyMember4Age',
        label: 'Age of family member 4',
        type: 'number',
        placeholder: 'Age',
        required: false
      }
    ]
  },
  {
    id: 3,
    title: "Your therapy goals",
    subtitle: "What brings you here today?",
    fields: [
      {
        name: 'therapyType',
        label: 'What type of therapy are you interested in?',
        type: 'select',
        options: [
          { value: 'individual', label: 'Individual Therapy' },
          { value: 'couples', label: 'Couples Therapy' },
          { value: 'family', label: 'Family Therapy' }
        ],
        required: true
      },
      {
        name: 'goals',
        label: 'What would you like to work on? (Select all that apply)',
        type: 'multiselect',
        options: [
          { value: 'anxiety', label: 'Anxiety' },
          { value: 'depression', label: 'Depression' },
          { value: 'relationships', label: 'Relationships' },
          { value: 'stress', label: 'Stress Management' },
          { value: 'self-esteem', label: 'Self-esteem' },
          { value: 'communication', label: 'Communication' },
          { value: 'other', label: 'Other' }
        ]
      }
    ]
  },
  {
    id: 4,
    title: "Your preferences",
    subtitle: "Help us personalize your experience",
    fields: [
      {
        name: 'sessionTime',
        label: 'When do you prefer to have sessions?',
        type: 'select',
        options: [
          { value: 'morning', label: 'Morning (6 AM - 12 PM)' },
          { value: 'afternoon', label: 'Afternoon (12 PM - 5 PM)' },
          { value: 'evening', label: 'Evening (5 PM - 9 PM)' },
          { value: 'flexible', label: 'Flexible' }
        ]
      },
      {
        name: 'communicationStyle',
        label: 'How do you prefer to communicate?',
        type: 'select',
        options: [
          { value: 'direct', label: 'Direct and straightforward' },
          { value: 'gentle', label: 'Gentle and supportive' },
          { value: 'balanced', label: 'Balanced approach' }
        ]
      },
      {
        name: 'notificationPrefs',
        label: 'Would you like to receive email session reminders?',
        type: 'select',
        options: [
          { value: 'email', label: 'Yes, send me email reminders' },
          { value: 'none', label: 'No, I don\'t want reminders' }
        ],
        required: true
      }
    ]
  },
  {
    id: 5,
    title: "Almost there!",
    subtitle: "How can we best support you?",
    fields: [
      {
        name: 'emergencyContact',
        label: 'Emergency contact (optional)',
        type: 'text',
        placeholder: 'Name and phone number'
      },
      {
        name: 'additionalNotes',
        label: 'Anything else you\'d like us to know?',
        type: 'textarea',
        placeholder: 'Feel free to share any additional information...'
      }
    ]
  },
  {
    id: 6,
    title: "Relationship Assessment",
    subtitle: "Help us understand your communication dynamics better",
    fields: [] // We'll use a custom component for this step
  }
]

export default function WelcomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})
  const [showConfetti, setShowConfetti] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [assessmentResults, setAssessmentResults] = useState<any[]>([])
  const [showTooltip, setShowTooltip] = useState(false)
  const [showSplashScreen, setShowSplashScreen] = useState(false)

  useEffect(() => {
    // Redirect immediately if unauthenticated
    if (status === 'unauthenticated') {
      router.replace('/auth/login')
      return
    } 
    
    // If authenticated, check onboarding status
    if (status === 'authenticated' && session?.user?.email) {
      // Check localStorage first as a quick check
      const localOnboardingKey = `onboarding_completed_${session.user.email}`;
      const localOnboardingCompleted = localStorage.getItem(localOnboardingKey);
      
      if (localOnboardingCompleted === 'true') {
        // Double-check with backend, but don't block on errors
        fetch('/api/user/profile')
          .then(res => res.json())
          .then(data => {
            // Check if user hasn't seen intro yet
            if (!data.hasSeenIntro) {
              router.replace('/intro')
              return
            }
            if (data.onboardingCompleted || data.onboardingData) {
              router.replace('/')
            } else {
              // Local storage says completed but backend doesn't, clear local storage
              localStorage.removeItem(localOnboardingKey)
              setCheckingOnboarding(false)
            }
          })
          .catch(error => {
            console.error('Error checking onboarding status:', error)
            // If backend is down but local storage says completed, redirect anyway
            router.replace('/')
          })
      } else {
        // No local storage record, check backend
        fetch('/api/user/profile')
          .then(res => {
            if (!res.ok && res.status !== 500) {
              throw new Error(`Error fetching profile: ${res.status}`)
            }
            return res.json()
          })
          .then(data => {
            // Check if user hasn't seen intro yet
            if (!data.hasSeenIntro) {
              router.replace('/intro')
              return
            }
            if (data.onboardingCompleted) {
              // Update local storage
              localStorage.setItem(localOnboardingKey, 'true')
              router.replace('/')
            } else {
              setCheckingOnboarding(false)
            }
          })
          .catch(error => {
            console.error('Error fetching profile:', error)
            // Continue with onboarding even if backend has issues
            setCheckingOnboarding(false)
          })
      }
    }
  }, [status, router, session])

  const handleInputChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
  }

  const handleMultiSelectChange = (name: string, value: string) => {
    const current = selectedOptions[name] || []
    let updated: string[]
    
    if (current.includes(value)) {
      updated = current.filter(v => v !== value)
    } else {
      updated = [...current, value]
    }
    
    setSelectedOptions({ ...selectedOptions, [name]: updated })
    setFormData({ ...formData, [name]: updated })
  }

  // Check if the current step has all required fields filled
  const isCurrentStepValid = () => {
    if (currentStep === 0) { // Step 1 (index 0)
      // Check if nickname and age are filled
      const isValid = !!formData.nickname && !!formData.age;
      console.log("Step 1 validation:", { 
        isValid, 
        nickname: formData.nickname, 
        age: formData.age 
      });
      return isValid;
    }
    return true; // Other steps don't have validation yet
  }

  const handleNext = () => {
    if (!isCurrentStepValid()) {
      // Show tooltip if step 1 is not valid
      setShowTooltip(true);
      console.log("Showing tooltip, validation failed"); // Debug log
      // Hide tooltip after 3 seconds
      setTimeout(() => {
        setShowTooltip(false);
        console.log("Hiding tooltip after timeout");
      }, 3000);
      return;
    }

    if (currentStep < formSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handler for assessment results
  const handleAssessmentResults = (results: any[]) => {
    setAssessmentResults(results)
    
    // Convert assessment results to the format expected by the API
    const assessmentData = results.reduce((acc, item) => {
      acc[`${item.category}Score`] = Math.round(item.average * 20) // Scale to 0-100
      return acc
    }, {} as Record<string, number>)
    
    // Add assessment data to form data
    setFormData({
      ...formData,
      assessmentResults: assessmentData
    })
  }
  
  // Handler for users not in a relationship who want to skip assessment
  const handleSkipAssessment = () => {
    // Set empty assessment results with zero scores
    const emptyResults = {
      communicationScore: 0,
      trustScore: 0,
      intimacyScore: 0,
      conflictScore: 0
    }
    
    // Add empty assessment data to form data
    setFormData({
      ...formData,
      assessmentResults: emptyResults,
      relationshipStatus: formData.relationshipStatus || 'Single',
      skipAssessmentReason: 'Not in a relationship'
    })
    
    // Set assessment results to a non-empty array so the button becomes enabled
    setAssessmentResults([{ category: 'skipped', average: 0 }])
  }

  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      // Save user preferences to the database
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      // Always consider onboarding successful if we get a response (even 500)
      // This prevents users from getting stuck in onboarding due to database issues
      if (response.ok || response.status === 500) {
        // Mark onboarding as completed in localStorage
        if (session?.user?.email) {
          const localOnboardingKey = `onboarding_completed_${session.user.email}`;
          localStorage.setItem(localOnboardingKey, 'true');
          
          // Also store the form data locally as backup
          localStorage.setItem(`onboarding_data_${session.user.email}`, JSON.stringify(formData));
        }
        
        // If assessment results exist, also save them separately
        if (assessmentResults.length > 0) {
          try {
            const assessmentResponse = await fetch('/api/dashboard/save-assessment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                date: new Date().toISOString(),
                results: formData.assessmentResults
              })
            })
            
            if (!assessmentResponse.ok) {
              console.error('Error saving assessment results, but continuing anyway')
            }
          } catch (assessmentError) {
            console.error('Error saving assessment:', assessmentError)
            // Continue anyway
          }
        }
        
        // Show confetti animation
        setShowConfetti(true)
        
        // Show splash screen instead of immediately redirecting
        setTimeout(() => {
          setShowSplashScreen(true)
        }, 1000)
      } else {
        // Only show error for non-500 errors
        console.error('Unexpected error during onboarding:', response.status)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      // Even on network errors, complete onboarding to prevent user from being stuck
      if (session?.user?.email) {
        const localOnboardingKey = `onboarding_completed_${session.user.email}`;
        localStorage.setItem(localOnboardingKey, 'true');
        localStorage.setItem(`onboarding_data_${session.user.email}`, JSON.stringify(formData));
      }
      
      // Show success anyway
      setShowConfetti(true)
      setTimeout(() => {
        setShowSplashScreen(true)
      }, 1000)
    }
  }
  
  // Handle completion of splash screen
  const handleSplashComplete = () => {
    router.push('/')
  }

  const progress = ((currentStep + 1) / formSteps.length) * 100

  // Show loading state while checking authentication or onboarding status
  if (status === 'loading' || checkingOnboarding) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  }
  
  // Show splash screen after form submission
  if (showSplashScreen) {
    return <OnboardingSuccessSplash 
      userData={formData} 
      onComplete={handleSplashComplete} 
    />
  }

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Light overlay to make background less dark */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-blue-900/20" />
      <Spotlight />
      <ConfettiAnimation trigger={showConfetti} />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {/* Global tooltip that appears when user tries to proceed without filling required fields */}
        {showTooltip && currentStep === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed z-50 top-10 left-1/2 transform -translate-x-1/2 px-5 py-4 bg-red-500 text-white text-center text-sm sm:text-base font-medium rounded-lg shadow-xl max-w-[95vw] sm:max-w-max mx-auto"
          >
            ⚠️ Please fill out your name and age to continue
          </motion.div>
        )}
        
        <GlassCard className="w-full max-w-2xl">
          {/* Progress bar and step indicators */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-white/70 mb-4">
              <span>Step {currentStep + 1} of {formSteps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            
            {/* Step indicators */}
            <div className="flex items-center justify-center mb-4 px-2 max-w-full overflow-hidden">
              {formSteps.map((step, index) => (
                <div key={step.id} className="flex items-center min-w-0">
                  <motion.div
                    className={`w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-200 flex-shrink-0 ${
                      index < currentStep
                        ? 'bg-green-500 border-green-400'
                        : index === currentStep
                        ? 'bg-blue-500 border-blue-400'
                        : 'bg-white/10 border-white/20'
                    }`}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: index <= currentStep ? 1 : 0.8 }}
                    transition={{ duration: 0.2, type: "tween" }}
                  >
                    {index < currentStep ? (
                      <CheckCircleIcon className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-white" />
                    ) : (
                      <span className="text-white font-medium text-xs xs:text-sm sm:text-base leading-none">{index + 1}</span>
                    )}
                  </motion.div>
                  {index < formSteps.length - 1 && (
                    <div className="w-3 xs:w-4 sm:w-6 md:w-8 h-0.5 bg-white/20 mx-0.5 xs:mx-1 sm:mx-1.5 flex-shrink-0">
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: index < currentStep ? '100%' : '0%' }}
                        transition={{ duration: 0.3, type: "tween" }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Progress bar */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, type: "tween" }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, type: "tween" }}
            >
              <h1 className="text-3xl font-bold text-white mb-2">
                {formSteps[currentStep].title}
              </h1>
              <p className="text-white/70 mb-8">
                {formSteps[currentStep].subtitle}
              </p>

              <div className="space-y-6">
                {currentStep === formSteps.length - 1 ? (
                  // Render the RelationshipAssessment component for the last step
                  <RelationshipAssessment 
                    onResultsSubmit={handleAssessmentResults}
                    onClose={() => {}} // Empty function since we don't want to close
                  />
                ) : (
                  // Render regular form fields for all other steps
                  formSteps[currentStep].fields.map((field) => (
                    <div key={field.name}>
                      <label className="block text-white mb-2">
                        {field.label}
                        {field.required && (
                          <span className={`ml-1 ${showTooltip && 
                            ((field.name === 'nickname' && !formData.nickname) || 
                             (field.name === 'age' && !formData.age)) 
                            ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>*</span>
                        )}
                      </label>
                      
                      {field.type === 'text' && (
                        <motion.input
                          type="text"
                          name={field.name}
                          placeholder={field.placeholder}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl text-white placeholder-white/50 focus:outline-none transition-all ${
                            field.name === 'nickname' && showTooltip && !formData.nickname
                              ? 'border-red-500 focus:border-red-400'
                              : 'border-white/20 focus:border-blue-400'
                          }`}
                        />
                      )}
                      
                      {field.type === 'tel' && (
                        <motion.input
                          type="tel"
                          name={field.name}
                          placeholder={field.placeholder}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 transition-all"
                        />
                      )}
                      
                      {field.type === 'number' && (
                        <motion.input
                          type="number"
                          name={field.name}
                          placeholder={field.placeholder}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border rounded-xl text-white placeholder-white/50 focus:outline-none transition-all ${
                            field.name === 'age' && showTooltip && !formData.age
                              ? 'border-red-500 focus:border-red-400'
                              : 'border-white/20 focus:border-blue-400'
                          }`}
                          min="1"
                          max="120"
                        />
                      )}
                      
                      {field.type === 'select' && (
                        <motion.select
                          name={field.name}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-gray-900 text-gray-400">Select an option</option>
                          {field.options?.map((option) => (
                            <option key={option.value} value={option.value} className="bg-gray-900 text-white">
                              {option.label}
                            </option>
                          ))}
                        </motion.select>
                      )}
                      
                      {field.type === 'multiselect' && (
                        <div className="grid grid-cols-2 gap-3">
                          {field.options?.map((option) => {
                            const isSelected = selectedOptions[field.name]?.includes(option.value)
                            return (
                              <motion.button
                                key={option.value}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleMultiSelectChange(field.name, option.value)}
                                className={`relative px-4 py-2 rounded-xl border transition-all ${
                                  isSelected
                                    ? 'bg-blue-500/30 border-blue-400 text-white'
                                    : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                                }`}
                              >
                                <span className="relative z-10 flex items-center justify-center">
                                  {option.label}
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ duration: 0.1 }}
                                      className="ml-2"
                                    >
                                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                                    </motion.div>
                                  )}
                                </span>
                              </motion.button>
                            )
                          })}
                        </div>
                      )}
                      
                      {field.type === 'textarea' && (
                        <motion.textarea
                          name={field.name}
                          placeholder={field.placeholder}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 transition-all resize-none"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Navigation buttons */}
              <div className={`flex ${currentStep === formSteps.length - 1 && assessmentResults.length === 0 ? 'flex-col sm:flex-row sm:justify-between' : 'justify-between'} mt-8 w-full`}>
                <ButtonWithSound
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-xl font-medium transition-all ${
                    currentStep === 0
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  } ${currentStep === formSteps.length - 1 && assessmentResults.length === 0 ? 'w-full sm:w-auto' : ''}`}
                >
                  Back
                </ButtonWithSound>
                
                {/* Show "Not in a relationship" button only on assessment step and when assessment is not completed */}
                {currentStep === formSteps.length - 1 && assessmentResults.length === 0 && (
                  <ButtonWithSound
                    onClick={handleSkipAssessment}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white rounded-xl font-medium transition-all transform hover:scale-105 w-full sm:w-auto bg-red-500 hover:bg-red-600 order-last"
                  >
                    Not in a relationship
                  </ButtonWithSound>
                )}
                
                {/* Next/Complete button container */}
                <div className={`relative ${currentStep === formSteps.length - 1 && assessmentResults.length === 0 ? 'w-full sm:w-auto order-2 mt-3 sm:mt-0' : ''}`}>
                  {/* Tooltip moved outside the button for better visibility */}
                  
                  {/* Only show Next/Complete button if not on assessment step or if assessment is completed */}
                  {(currentStep !== formSteps.length - 1 || assessmentResults.length > 0) && (
                    <ButtonWithSound
                      onClick={handleNext}
                      disabled={loading || (currentStep === 0 && !isCurrentStepValid())}
                      className={`px-4 sm:px-8 py-2 sm:py-3 text-sm sm:text-base ${
                        currentStep === 0 && !isCurrentStepValid()
                          ? 'bg-blue-500/70 hover:bg-blue-600/70 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600'
                      } text-white rounded-xl font-medium transition-all transform hover:scale-105 ${
                        currentStep === formSteps.length - 1 && assessmentResults.length === 0 ? 'w-full sm:w-auto' : ''
                      }`}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : currentStep === formSteps.length - 1 ? 'Complete Onboarding' : 'Next'}
                    </ButtonWithSound>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </GlassCard>
      </div>
    </div>
  )
}