// src/app/dashboard/page.tsx
'use client'

import { useState, useEffect } from "react"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import SessionTimeChart from "@/components/dashboard/SessionTimeChart"
import RelationshipProgressCard from "@/components/dashboard/RelationshipProgressCard"
import CommunicationMetrics from "@/components/dashboard/CommunicationMetrics"
import UpcomingSessions from "@/components/dashboard/UpcomingSessions"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  
  // Form state for onboarding
  const [formData, setFormData] = useState({
    name: "",
    partnerName: "",
    relationshipStatus: "Married",
    familyMember1: "",
    familyMember2: "",
    familyMember3: "",
    familyMember4: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
    
    if (status === 'authenticated' && session?.user?.email) {
      // Fetch user profile to check if it's complete
      const fetchUserProfile = async () => {
        try {
          setIsProfileLoading(true)
          const response = await fetch("/api/user/profile")
          
          if (response.ok) {
            const userData = await response.json()
            setUserProfile(userData)
            
            // If user doesn't have a partner name, show onboarding
            if (!userData.partnerName) {
              setShowProfileSetup(true)
              // Pre-fill the form with existing data
              setFormData({
                name: userData.name || session?.user?.name || "",
                partnerName: "",
                relationshipStatus: userData.relationshipStatus || "Married",
                familyMember1: userData.familyMember1 || "",
                familyMember2: userData.familyMember2 || "",
                familyMember3: userData.familyMember3 || "",
                familyMember4: userData.familyMember4 || ""
              })
            } else {
              setShowProfileSetup(false)
            }
          } else {
            // If user not found, show onboarding
            if (response.status === 404) {
              setShowProfileSetup(true)
              // Pre-fill with session data if available
              setFormData({
                name: session?.user?.name || "",
                partnerName: "",
                relationshipStatus: "Married",
                familyMember1: "",
                familyMember2: "",
                familyMember3: "",
                familyMember4: ""
              })
            }
          }
        } catch (error) {
          console.error("Error fetching profile:", error)
        } finally {
          setIsProfileLoading(false)
        }
      }
      
      fetchUserProfile()
    }
  }, [status, router, session])
  
  // Handle profile form submission
  const handleProfileSubmit = async () => {
    if (!formData.name || !formData.partnerName) {
      return // Don't submit if required fields are missing
    }
    
    try {
      setIsSaving(true)
      
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.user)
        setShowProfileSetup(false)
      } else {
        console.error("Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const nextStep = () => {
    if (onboardingStep < 3) {
      setOnboardingStep(onboardingStep + 1)
    } else {
      handleProfileSubmit()
    }
  }
  
  const prevStep = () => {
    if (onboardingStep > 0) {
      setOnboardingStep(onboardingStep - 1)
    }
  }
  
  if (status === 'loading' || isProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }
  
  // Profile onboarding overlay - shown if profile is incomplete
  if (showProfileSetup) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 sm:p-8"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome to TherapyAI!</h2>
            <p className="text-gray-600 mt-2">Let's personalize your experience to get the most out of your therapy sessions.</p>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              {[0, 1, 2, 3].map((step) => (
                <div 
                  key={step} 
                  className={`relative flex-1 ${step < onboardingStep ? 'bg-indigo-500' : step === onboardingStep ? 'bg-indigo-500' : 'bg-gray-200'} h-2 rounded-full ${step === 0 ? 'rounded-l-full' : step === 3 ? 'rounded-r-full' : ''}`}
                >
                  <div 
                    className={`absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center ${step < onboardingStep ? 'bg-indigo-500 text-white' : step === onboardingStep ? 'bg-white border-2 border-indigo-500 text-indigo-500' : 'bg-white border-2 border-gray-300 text-gray-500'}`}
                  >
                    {step + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={onboardingStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {onboardingStep === 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">About You</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter your name"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">This is how our AI assistant will address you</p>
                    </div>
                  </div>
                </div>
              )}
              
              {onboardingStep === 1 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Relationship</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="partnerName" className="block text-sm font-medium text-gray-700 mb-1">
                        Partner's Name
                      </label>
                      <input
                        type="text"
                        id="partnerName"
                        name="partnerName"
                        value={formData.partnerName}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter your partner's name"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Our AI assistant will include your partner in conversations</p>
                    </div>
                  </div>
                </div>
              )}
              
              {onboardingStep === 2 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Relationship Status</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="relationshipStatus" className="block text-sm font-medium text-gray-700 mb-1">
                        Current Status
                      </label>
                      <select
                        id="relationshipStatus"
                        name="relationshipStatus"
                        value={formData.relationshipStatus}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="Married">Married</option>
                        <option value="Dating">Dating</option>
                        <option value="Engaged">Engaged</option>
                        <option value="Separated">Separated</option>
                        <option value="Other">Other</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Helps our AI provide more relevant guidance</p>
                    </div>
                  </div>
                </div>
              )}
              
              {onboardingStep === 3 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Family Members</h3>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-3">
                      Add family members who might participate in therapy sessions. This is optional and can be updated later.
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="familyMember1" className="block text-sm font-medium text-gray-700 mb-1">
                          Family Member 1
                        </label>
                        <input
                          type="text"
                          id="familyMember1"
                          name="familyMember1"
                          value={formData.familyMember1}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Enter name"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="familyMember2" className="block text-sm font-medium text-gray-700 mb-1">
                          Family Member 2
                        </label>
                        <input
                          type="text"
                          id="familyMember2"
                          name="familyMember2"
                          value={formData.familyMember2}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Enter name"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="familyMember3" className="block text-sm font-medium text-gray-700 mb-1">
                          Family Member 3
                        </label>
                        <input
                          type="text"
                          id="familyMember3"
                          name="familyMember3"
                          value={formData.familyMember3}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Enter name"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="familyMember4" className="block text-sm font-medium text-gray-700 mb-1">
                          Family Member 4
                        </label>
                        <input
                          type="text"
                          id="familyMember4"
                          name="familyMember4"
                          value={formData.familyMember4}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Enter name"
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                        <svg className="w-5 h-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Profile Information
                      </h4>
                      <p className="text-sm text-gray-600">
                        Your information helps personalize your therapy experience. Our AI will address you, {formData.partnerName}, and family members by name during sessions, making conversations more natural and effective.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          
          <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={onboardingStep === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                onboardingStep === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Back
            </button>
            
            <button
              type="button"
              onClick={nextStep}
              disabled={(onboardingStep === 0 && !formData.name) || (onboardingStep === 1 && !formData.partnerName) || isSaving}
              className={`px-6 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : onboardingStep < 3 ? (
                <>
                  Continue
                  <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              ) : (
                <>
                  Complete Setup
                  <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header with Welcome Message */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-600 to-indigo-900 rounded-xl shadow-lg mb-8 p-6 sm:p-10 text-white"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}</h1>
              <p className="mt-2 text-indigo-100!">Track your progress and manage your relationship journey</p>
            </div>
            <Link href="/dashboard/therapy" className="mt-4 sm:mt-0 px-5 py-2 bg-white text-indigo-600 rounded-lg font-medium shadow-sm hover:bg-indigo-50 transition-colors duration-150 w-full sm:w-auto text-center">
              Start New Session
            </Link>
          </div>
        </motion.div>
        
        {/* Dashboard Tab Navigation for Mobile */}
        <div className="sm:hidden mb-4 overflow-x-auto scrollbar-hide flex space-x-2 pb-2 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 rounded-lg font-medium flex-shrink-0 text-sm min-w-[90px] ${
              activeTab === 'overview' 
                ? 'bg-indigo-100 text-indigo-800' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('progress')}
            className={`px-3 py-2 rounded-lg font-medium flex-shrink-0 text-sm min-w-[90px] ${
              activeTab === 'progress' 
                ? 'bg-indigo-100 text-indigo-800' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Progress
          </button>
          <button 
            onClick={() => setActiveTab('communication')}
            className={`px-3 py-2 rounded-lg font-medium flex-shrink-0 text-sm min-w-[90px] ${
              activeTab === 'communication' 
                ? 'bg-indigo-100 text-indigo-800' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Comm.
          </button>
          <button 
            onClick={() => setActiveTab('sessions')}
            className={`px-3 py-2 rounded-lg font-medium flex-shrink-0 text-sm min-w-[90px] ${
              activeTab === 'sessions' 
                ? 'bg-indigo-100 text-indigo-800' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Sessions
          </button>
        </div>
        
        {/* Desktop View - All Cards */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="hidden sm:grid sm:grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 xl:gap-10"
        >
          {/* Session Time Visualization */}
          <motion.div variants={item} className="bg-white rounded-xl shadow-md p-6 pb-8 sm:pb-6 hover:shadow-lg transition-shadow duration-300 border border-gray-200 overflow-hidden">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Session Time Overview</h2>
            </div>
            <SessionTimeChart />
          </motion.div>
          
          {/* Relationship Progress Card */}
          <motion.div variants={item} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300 border border-gray-200 overflow-hidden">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Relationship Progress</h2>
            </div>
            <RelationshipProgressCard />
          </motion.div>
          
          {/* Communication Metrics */}
          <motion.div variants={item} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300 border border-gray-200 overflow-hidden">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Communication Quality</h2>
            </div>
            <CommunicationMetrics />
          </motion.div>
          
          {/* Upcoming Sessions */}
          <motion.div variants={item} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300 border border-gray-200 overflow-hidden">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Upcoming Sessions</h2>
            </div>
            <UpcomingSessions />
          </motion.div>
        </motion.div>
        
        {/* Mobile View - Tabbed Interface */}
        <div className="sm:hidden">
          {/* Chart Component based on active tab */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-xl shadow-md p-4 pb-12 mb-6 overflow-hidden"
            >
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Session Time Overview</h2>
              </div>
              <SessionTimeChart />
            </motion.div>
          )}
          
          {activeTab === 'progress' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-xl shadow-md p-4 pb-12 mb-6 overflow-hidden"
            >
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Relationship Progress</h2>
              </div>
              <RelationshipProgressCard />
            </motion.div>
          )}
          
          {activeTab === 'communication' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-xl shadow-md p-4 pb-12 mb-6 overflow-hidden"
            >
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Communication Quality</h2>
              </div>
              <CommunicationMetrics />
            </motion.div>
          )}
          
          {activeTab === 'sessions' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-xl shadow-md p-4 pb-12 mb-6 overflow-hidden"
            >
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Upcoming Sessions</h2>
              </div>
              <UpcomingSessions />
            </motion.div>
          )}

          {/* Quick Actions for Mobile - Displayed after charts */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-md p-4 border border-gray-200 mb-4"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/therapy" className="flex flex-col items-center p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-900">Start Therapy</p>
                </div>
              </Link>
              
              <Link href="/dashboard/sessions" className="flex flex-col items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-900">Past Sessions</p>
                </div>
              </Link>
              
              <Link href="/dashboard/resources" className="flex flex-col items-center p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-900">Resources</p>
                </div>
              </Link>
              
              <Link href="/dashboard/profile" className="flex flex-col items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-900">Profile</p>
                </div>
              </Link>
            </div>
          </motion.div>
        </div>
        
        {/* Quick Actions - Desktop only */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="hidden sm:block mt-8 bg-white rounded-xl shadow-md p-6 border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/therapy" className="flex items-center p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Start Therapy</h3>
                <p className="text-sm text-gray-500">Begin a new session</p>
              </div>
            </Link>
            
            <Link href="/dashboard/sessions" className="flex items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Past Sessions</h3>
                <p className="text-sm text-gray-500">View your history</p>
              </div>
            </Link>
            
            <Link href="/dashboard/resources" className="flex items-center p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Resources</h3>
                <p className="text-sm text-gray-500">Find helpful guides</p>
              </div>
            </Link>
            
            <Link href="/dashboard/profile" className="flex items-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Profile</h3>
                <p className="text-sm text-gray-500">View your details</p>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}