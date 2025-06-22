"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function ProfileSettings() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [isNewUser, setIsNewUser] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    pronouns: "",
    age: "",
    partnerName: "",
    partnerAge: "",
    relationshipStatus: "Married",
    familyMember1: "",
    familyMember1Age: "",
    familyMember2: "",
    familyMember2Age: "",
    familyMember3: "",
    familyMember3Age: "",
    familyMember4: "",
    familyMember4Age: "",
    familyMember5: "",
    familyMember5Age: "",
    familyMember6: "",
    familyMember6Age: "",
    familyMember7: "",
    familyMember7Age: "",
    therapyType: "",
    currentConcerns: null,
    emergencyContact: "",
    sessionPreference: "",
    communicationStyle: "",
    additionalNotes: ""
  })
  
  // Debug logging for session and check for new user flag
  useEffect(() => {
    console.log("Session status:", status)
    console.log("Session data:", session)
    
    // Check if this is a new user from URL param
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      setIsNewUser(urlParams.get('isNewUser') === 'true')
    }
  }, [session, status])
  
  // Load user data when session is available
  useEffect(() => {
    if (status === "loading") return
    
    if (status === "unauthenticated") {
      router.replace("/auth/login")
      return
    }
    
    const fetchUserData = async () => {
      try {
        console.log("Fetching user data with session ID:", session?.user?.id)
        
        const response = await fetch("/api/user/profile")
        console.log("Profile API response status:", response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error("API error response:", errorText)
          throw new Error(`Failed to fetch user data: ${response.status}`)
        }
        
        const userData = await response.json()
        console.log("User data received:", userData)
        
        setFormData({
          name: userData.name || "",
          email: userData.email || "",
          pronouns: userData.pronouns || "",
          age: userData.age?.toString() || "",
          partnerName: userData.partnerName || "",
          partnerAge: userData.partnerAge?.toString() || "",
          relationshipStatus: userData.relationshipStatus || "Married",
          familyMember1: userData.familyMember1 || "",
          familyMember1Age: userData.familyMember1Age?.toString() || "",
          familyMember2: userData.familyMember2 || "",
          familyMember2Age: userData.familyMember2Age?.toString() || "",
          familyMember3: userData.familyMember3 || "",
          familyMember3Age: userData.familyMember3Age?.toString() || "",
          familyMember4: userData.familyMember4 || "",
          familyMember4Age: userData.familyMember4Age?.toString() || "",
          familyMember5: userData.familyMember5 || "",
          familyMember5Age: userData.familyMember5Age?.toString() || "",
          familyMember6: userData.familyMember6 || "",
          familyMember6Age: userData.familyMember6Age?.toString() || "",
          familyMember7: userData.familyMember7 || "",
          familyMember7Age: userData.familyMember7Age?.toString() || "",
          therapyType: userData.therapyType || "",
          currentConcerns: userData.currentConcerns || null,
          emergencyContact: userData.emergencyContact || "",
          sessionPreference: userData.sessionPreference || "",
          communicationStyle: userData.communicationStyle || "",
          additionalNotes: userData.additionalNotes || ""
        })
      } catch (error) {
        console.error("Profile fetch error details:", error)
        setMessage(error instanceof Error ? error.message : "Failed to load profile data")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserData()
  }, [status, router, session])
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage("")
    
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) throw new Error("Failed to update profile")
      
      if (isNewUser) {
        // If new user, redirect to dashboard after successful profile update
        setMessage("Profile created successfully! Redirecting to dashboard...")
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else {
        setMessage("Profile updated successfully!")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      setMessage("Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:py-12">
      <div className="max-w-lg mx-auto">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center border-b border-gray-100 pb-4 mb-6">
            <div className="bg-indigo-100 rounded-full p-2 mr-3">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Your Profile</h1>
          </div>
          
          {isNewUser && (
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-indigo-800">Welcome to Couple Therapy!</h3>
                  <div className="mt-2 text-sm text-indigo-700">
                    <p>Please complete your profile information to get the most out of your therapy sessions.</p>
                    <p className="mt-1">This will help personalize your experience with our AI therapist.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {message && (
            <div className={`mb-6 p-3 rounded-lg flex items-center text-sm ${
              message.includes("success") 
                ? "bg-green-50 text-green-800 border border-green-200" 
                : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={message.includes("success") 
                    ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                    : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  } 
                />
              </svg>
              {message}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pronouns" className="block text-sm font-medium text-gray-700 mb-1">Pronouns</label>
                  <input
                    type="text"
                    id="pronouns"
                    name="pronouns"
                    value={formData.pronouns}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="e.g., he/him, she/her, they/them"
                  />
                </div>
                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">Your Age</label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Your age"
                    min="1"
                    max="120"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    readOnly
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <h3 className="text-sm font-medium text-indigo-800 mb-3 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Relationship Information
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="partnerName" className="block text-sm font-medium text-gray-700 mb-1">Partner&apos;s Name</label>
                      <input
                        type="text"
                        id="partnerName"
                        name="partnerName"
                        value={formData.partnerName}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Enter your partner's name"
                      />
                    </div>
                    <div>
                      <label htmlFor="partnerAge" className="block text-sm font-medium text-gray-700 mb-1">Partner&apos;s Age</label>
                      <input
                        type="number"
                        id="partnerAge"
                        name="partnerAge"
                        value={formData.partnerAge}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Their age"
                        min="1"
                        max="120"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="relationshipStatus" className="block text-sm font-medium text-gray-700 mb-1">Relationship Status</label>
                    <select
                      id="relationshipStatus"
                      name="relationshipStatus"
                      value={formData.relationshipStatus}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    >
                      <option value="Married">Married</option>
                      <option value="Dating">Dating</option>
                      <option value="Engaged">Engaged</option>
                      <option value="Separated">Separated</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Family Members Section */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mt-6">
                <h3 className="text-sm font-medium text-purple-800 mb-3 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Family Members (For Family Therapy)
                </h3>
                
                <p className="text-sm text-purple-700 mb-4">
                  Add up to 7 family members who may participate in family therapy sessions. This information will help personalize your family therapy experience.
                </p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="familyMember1" className="block text-sm font-medium text-gray-700 mb-1">Family Member 1</label>
                      <input
                        type="text"
                        id="familyMember1"
                        name="familyMember1"
                        value={formData.familyMember1}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="familyMember1Age" className="block text-sm font-medium text-gray-700 mb-1">Age of Member 1</label>
                      <input
                        type="number"
                        id="familyMember1Age"
                        name="familyMember1Age"
                        value={formData.familyMember1Age}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Age"
                        min="1"
                        max="120"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="familyMember2" className="block text-sm font-medium text-gray-700 mb-1">Family Member 2</label>
                      <input
                        type="text"
                        id="familyMember2"
                        name="familyMember2"
                        value={formData.familyMember2}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="familyMember2Age" className="block text-sm font-medium text-gray-700 mb-1">Age of Member 2</label>
                      <input
                        type="number"
                        id="familyMember2Age"
                        name="familyMember2Age"
                        value={formData.familyMember2Age}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Age"
                        min="1"
                        max="120"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="familyMember3" className="block text-sm font-medium text-gray-700 mb-1">Family Member 3</label>
                      <input
                        type="text"
                        id="familyMember3"
                        name="familyMember3"
                        value={formData.familyMember3}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="familyMember3Age" className="block text-sm font-medium text-gray-700 mb-1">Age of Member 3</label>
                      <input
                        type="number"
                        id="familyMember3Age"
                        name="familyMember3Age"
                        value={formData.familyMember3Age}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Age"
                        min="1"
                        max="120"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="familyMember4" className="block text-sm font-medium text-gray-700 mb-1">Family Member 4</label>
                      <input
                        type="text"
                        id="familyMember4"
                        name="familyMember4"
                        value={formData.familyMember4}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="familyMember4Age" className="block text-sm font-medium text-gray-700 mb-1">Age of Member 4</label>
                      <input
                        type="number"
                        id="familyMember4Age"
                        name="familyMember4Age"
                        value={formData.familyMember4Age}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Age"
                        min="1"
                        max="120"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="familyMember5" className="block text-sm font-medium text-gray-700 mb-1">Family Member 5</label>
                      <input
                        type="text"
                        id="familyMember5"
                        name="familyMember5"
                        value={formData.familyMember5}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="familyMember5Age" className="block text-sm font-medium text-gray-700 mb-1">Age of Member 5</label>
                      <input
                        type="number"
                        id="familyMember5Age"
                        name="familyMember5Age"
                        value={formData.familyMember5Age}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Age"
                        min="1"
                        max="120"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="familyMember6" className="block text-sm font-medium text-gray-700 mb-1">Family Member 6</label>
                      <input
                        type="text"
                        id="familyMember6"
                        name="familyMember6"
                        value={formData.familyMember6}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="familyMember6Age" className="block text-sm font-medium text-gray-700 mb-1">Age of Member 6</label>
                      <input
                        type="number"
                        id="familyMember6Age"
                        name="familyMember6Age"
                        value={formData.familyMember6Age}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Age"
                        min="1"
                        max="120"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="familyMember7" className="block text-sm font-medium text-gray-700 mb-1">Family Member 7</label>
                      <input
                        type="text"
                        id="familyMember7"
                        name="familyMember7"
                        value={formData.familyMember7}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="familyMember7Age" className="block text-sm font-medium text-gray-700 mb-1">Age of Member 7</label>
                      <input
                        type="number"
                        id="familyMember7Age"
                        name="familyMember7Age"
                        value={formData.familyMember7Age}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="Age"
                        min="1"
                        max="120"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Therapy Preferences Section */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-100 mt-6">
                <h3 className="text-sm font-medium text-green-800 mb-3 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Therapy Preferences
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="therapyType" className="block text-sm font-medium text-gray-700 mb-1">Therapy Type</label>
                    <select
                      id="therapyType"
                      name="therapyType"
                      value={formData.therapyType}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    >
                      <option value="">Select therapy type</option>
                      <option value="individual">Individual Therapy</option>
                      <option value="couples">Couples Therapy</option>
                      <option value="family">Family Therapy</option>
                      <option value="group">Group Therapy</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="sessionPreference" className="block text-sm font-medium text-gray-700 mb-1">Session Preference</label>
                    <select
                      id="sessionPreference"
                      name="sessionPreference"
                      value={formData.sessionPreference}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    >
                      <option value="">Select time preference</option>
                      <option value="morning">Morning (6 AM - 12 PM)</option>
                      <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                      <option value="evening">Evening (5 PM - 9 PM)</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="communicationStyle" className="block text-sm font-medium text-gray-700 mb-1">Communication Style</label>
                    <select
                      id="communicationStyle"
                      name="communicationStyle"
                      value={formData.communicationStyle}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    >
                      <option value="">Select style</option>
                      <option value="direct">Direct and straightforward</option>
                      <option value="gentle">Gentle and supportive</option>
                      <option value="balanced">Balanced approach</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      id="emergencyContact"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="Name and phone number"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                    <textarea
                      id="additionalNotes"
                      name="additionalNotes"
                      value={formData.additionalNotes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="Any additional information you'd like us to know..."
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row-reverse sm:justify-between gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-sm hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 flex justify-center items-center"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {isNewUser ? 'Complete Profile Setup' : 'Save Changes'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 flex justify-center items-center"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
            </div>
          </form>
        </div>
        
        {/* Quick Navigation */}
        <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100">
          <h2 className="flex items-center text-lg font-medium text-indigo-800 mb-4">
            <svg className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Quick Navigation
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
            <button 
              onClick={() => router.push("/dashboard")}
              className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center h-24"
            >
              <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-medium">Dashboard</span>
            </button>
            
            <button 
              onClick={() => router.push("/dashboard/therapy")}
              className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center h-24"
            >
              <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              <span className="font-medium">Therapy Session</span>
            </button>
            
            <button 
              onClick={() => router.push("/dashboard/sessions")}
              className="p-4 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center h-24"
            >
              <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Sessions</span>
            </button>
          </div>
          
          <p className="text-sm text-center text-indigo-600 mt-4">
            Quick access to essential features
          </p>
        </div>
        
        {/* Therapy Navigation */}
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-sm border border-purple-100">
          <h2 className="flex items-center text-lg font-medium text-purple-800 mb-4">
            <svg className="h-5 w-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Therapy Options
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button 
                onClick={() => {
                  router.push("/dashboard/therapy?type=couple")
                }}
                className="px-4 py-3 bg-gradient-to-br from-indigo-100 to-indigo-200 hover:from-indigo-200 hover:to-indigo-300 text-indigo-700 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="font-medium">Couple Therapy</span>
              </button>
              
              <button 
                onClick={() => {
                  router.push("/dashboard/therapy?type=solo") 
                }}
                className="px-4 py-3 bg-gradient-to-br from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 text-purple-700 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">Individual Therapy</span>
              </button>
              
              <button 
                onClick={() => {
                  router.push("/dashboard/therapy?type=family")
                }}
                className="px-4 py-3 bg-gradient-to-br from-pink-100 to-pink-200 hover:from-pink-200 hover:to-pink-300 text-pink-700 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-medium">Family Therapy</span>
              </button>
            </div>
            
            <button 
              onClick={() => router.push("/dashboard/resources")}
              className="w-full mt-3 px-4 py-3 bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="font-medium">Therapy Resources</span>
            </button>
          </div>
        </div>

        {/* Account Settings */}
        <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h2 className="flex items-center text-lg font-medium text-gray-800 mb-4">
            <svg className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Account Settings
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <h3 className="text-sm font-medium text-gray-800">Change Password</h3>
                <p className="text-xs text-gray-500">Update your account password</p>
              </div>
              <button 
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                onClick={() => alert('Password reset link will be sent to your email')}
              >
                Reset
              </button>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg border border-red-100">
              <div>
                <h3 className="text-sm font-medium text-red-800">Delete Account</h3>
                <p className="text-xs text-red-500">Permanently delete your account and all data</p>
              </div>
              <button 
                className="text-red-600 hover:text-red-800 text-sm font-medium"
                onClick={() => alert('Account deletion requires confirmation via email')}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}