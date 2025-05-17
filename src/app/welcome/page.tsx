'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import BokehBackground from '@/components/ui/bokeh-background'
import GlassCard from '@/components/ui/glass-card'
import { useSession } from 'next-auth/react'
import ButtonWithSound from '@/components/ButtonWithSound'
import ConfettiAnimation from '@/components/ui/confetti-animation'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

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
        required: false
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
        label: 'Relationship status',
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated') {
      // Check if user has already completed onboarding
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (data.onboardingCompleted) {
            router.push('/')
          } else {
            setCheckingOnboarding(false)
          }
        })
        .catch(error => {
          console.error(error)
          setCheckingOnboarding(false)
        })
    }
  }, [status, router])

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

  const handleNext = () => {
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

  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      // Save user preferences to the database
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowConfetti(true)
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const progress = ((currentStep + 1) / formSteps.length) * 100

  // Show loading state while checking authentication or onboarding status
  if (status === 'loading' || checkingOnboarding) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Light overlay to make background less dark */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-blue-900/20" />
      <BokehBackground />
      <ConfettiAnimation trigger={showConfetti} />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-2xl">
          {/* Progress bar and step indicators */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-white/70 mb-4">
              <span>Step {currentStep + 1} of {formSteps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            
            {/* Step indicators */}
            <div className="flex items-center justify-center mb-4 px-2">
              {formSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <motion.div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-200 shrink-0 ${
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
                      <CheckCircleIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    ) : (
                      <span className="text-white font-medium text-sm sm:text-base">{index + 1}</span>
                    )}
                  </motion.div>
                  {index < formSteps.length - 1 && (
                    <div className="w-6 sm:w-8 md:w-12 h-0.5 bg-white/20 mx-1 sm:mx-2">
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
                {formSteps[currentStep].fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-white mb-2">
                      {field.label}
                      {field.required && <span className="text-blue-400 ml-1">*</span>}
                    </label>
                    
                    {field.type === 'text' && (
                      <motion.input
                        type="text"
                        name={field.name}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 transition-all"
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
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between mt-8">
                <ButtonWithSound
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    currentStep === 0
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  Back
                </ButtonWithSound>
                
                <ButtonWithSound
                  onClick={handleNext}
                  disabled={loading}
                  className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all transform hover:scale-105"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : currentStep === formSteps.length - 1 ? 'Complete' : 'Next'}
                </ButtonWithSound>
              </div>
            </motion.div>
          </AnimatePresence>
        </GlassCard>
      </div>
    </div>
  )
}