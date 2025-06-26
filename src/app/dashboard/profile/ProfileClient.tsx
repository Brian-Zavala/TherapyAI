'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { User, Users, LogOut, Settings, RefreshCw, AlertTriangle } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { useProfile } from "@/providers/ProfileProvider"
import AddFamilyMemberModal from "@/components/AddFamilyMemberModal"
import ProfileResetModal from "@/components/ProfileResetModal"
import Navigation from "@/components/Navigation"

interface FormData {
  name: string
  email: string
  pronouns: string
  age: string
  phone: string
  partnerName: string
  partnerAge: string
  relationshipStatus: string
  familyMember1: string
  familyMember1Age: string
  familyMember2: string
  familyMember2Age: string
  familyMember3: string
  familyMember3Age: string
  familyMember4: string
  familyMember4Age: string
  familyMember5: string
  familyMember5Age: string
  familyMember6: string
  familyMember6Age: string
  familyMember7: string
  familyMember7Age: string
  currentConcerns: string[]
  emergencyContact: string
  sessionPreference: string
  preferredDays: string[]
  sessionFrequency: string
  recurringSession: string
  reminderTiming: string
  communicationStyle: string
  additionalNotes: string
  notificationPrefs: string
}

export default function ProfileClient() {
  const router = useRouter()
  const { data: session } = useSession()
  const { profile, isLoading, updateProfile, invalidateProfile } = useProfile()
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<number | null>(null)
  const [updating, setUpdating] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    pronouns: "",
    age: "",
    phone: "",
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
    currentConcerns: [],
    emergencyContact: "",
    sessionPreference: "",
    preferredDays: [],
    sessionFrequency: "",
    recurringSession: "",
    reminderTiming: "",
    communicationStyle: "",
    additionalNotes: "",
    notificationPrefs: "email"
  })

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        pronouns: profile.pronouns || "",
        age: profile.age?.toString() || "",
        phone: profile.phone || "",
        partnerName: profile.partnerName || "",
        partnerAge: profile.partnerAge?.toString() || "",
        relationshipStatus: profile.relationshipStatus || "Married",
        familyMember1: profile.familyMember1 || "",
        familyMember1Age: profile.familyMember1Age?.toString() || "",
        familyMember2: profile.familyMember2 || "",
        familyMember2Age: profile.familyMember2Age?.toString() || "",
        familyMember3: profile.familyMember3 || "",
        familyMember3Age: profile.familyMember3Age?.toString() || "",
        familyMember4: profile.familyMember4 || "",
        familyMember4Age: profile.familyMember4Age?.toString() || "",
        familyMember5: profile.familyMember5 || "",
        familyMember5Age: profile.familyMember5Age?.toString() || "",
        familyMember6: profile.familyMember6 || "",
        familyMember6Age: profile.familyMember6Age?.toString() || "",
        familyMember7: profile.familyMember7 || "",
        familyMember7Age: profile.familyMember7Age?.toString() || "",
        currentConcerns: profile.currentConcerns || [],
        emergencyContact: profile.emergencyContact || "",
        sessionPreference: profile.sessionPreference || "",
        preferredDays: profile.preferredDays || [],
        sessionFrequency: profile.sessionFrequency || "",
        recurringSession: profile.recurringSession || "",
        reminderTiming: profile.reminderTiming || "",
        communicationStyle: profile.communicationStyle || "",
        additionalNotes: profile.additionalNotes || "",
        notificationPrefs: Array.isArray(profile.notificationPrefs) 
          ? profile.notificationPrefs.join(',') 
          : profile.notificationPrefs || "email"
      })
    }
  }, [profile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleUpdate = async () => {
    setUpdating(true)
    setError(null)

    try {
      const updateData = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        partnerAge: formData.partnerAge ? parseInt(formData.partnerAge) : null,
        familyMember1Age: formData.familyMember1Age ? parseInt(formData.familyMember1Age) : null,
        familyMember2Age: formData.familyMember2Age ? parseInt(formData.familyMember2Age) : null,
        familyMember3Age: formData.familyMember3Age ? parseInt(formData.familyMember3Age) : null,
        familyMember4Age: formData.familyMember4Age ? parseInt(formData.familyMember4Age) : null,
        familyMember5Age: formData.familyMember5Age ? parseInt(formData.familyMember5Age) : null,
        familyMember6Age: formData.familyMember6Age ? parseInt(formData.familyMember6Age) : null,
        familyMember7Age: formData.familyMember7Age ? parseInt(formData.familyMember7Age) : null,
      }

      await updateProfile(updateData)
      setIsSuccess(true)
      setTimeout(() => setIsSuccess(false), 3000)
    } catch (error) {
      console.error("Error updating profile:", error)
      setError("Failed to update profile. Please try again.")
    } finally {
      setUpdating(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" })
  }

  const handleRemoveMember = (memberIndex: number) => {
    setMemberToRemove(memberIndex)
    setShowRemoveModal(true)
  }

  const confirmRemoveMember = () => {
    if (memberToRemove !== null) {
      setFormData(prev => ({
        ...prev,
        [`familyMember${memberToRemove}`]: "",
        [`familyMember${memberToRemove}Age`]: ""
      }))
    }
    setShowRemoveModal(false)
    setMemberToRemove(null)
  }

  const handleAddFamilyMember = (member: { name: string; age: string }) => {
    // Find the first empty slot
    for (let i = 1; i <= 7; i++) {
      if (!formData[`familyMember${i}` as keyof FormData]) {
        setFormData(prev => ({
          ...prev,
          [`familyMember${i}`]: member.name,
          [`familyMember${i}Age`]: member.age
        }))
        break;
      }
    }
  }

  const getExistingFamilyMembers = () => {
    const members: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const memberName = formData[`familyMember${i}` as keyof FormData]
      if (memberName && typeof memberName === 'string') {
        members.push(memberName);
      }
    }
    return members;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading profile...</div>
      </div>
    )
  }

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-900 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-600/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {isSuccess && (
              <div className="mb-6 p-4 bg-green-600/20 border border-green-500 rounded-lg text-green-400">
                Profile updated successfully!
              </div>
            )}

            {/* Personal Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="30"
                    min="18"
                    max="120"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pronouns
                  </label>
                  <input
                    type="text"
                    name="pronouns"
                    value={formData.pronouns}
                    onChange={handleInputChange}
                    placeholder="he/him, she/her, they/them"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    placeholder="Name - Phone"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Partner Information */}
            <div className="mt-8 space-y-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-400" />
                Partner Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Partner's Name
                  </label>
                  <input
                    type="text"
                    name="partnerName"
                    value={formData.partnerName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Partner's Age
                  </label>
                  <input
                    type="number"
                    name="partnerAge"
                    value={formData.partnerAge}
                    onChange={handleInputChange}
                    placeholder="30"
                    min="18"
                    max="120"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Relationship Status
                  </label>
                  <select
                    name="relationshipStatus"
                    value={formData.relationshipStatus}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                  >
                    <option value="Married">Married</option>
                    <option value="Engaged">Engaged</option>
                    <option value="Dating">Dating</option>
                    <option value="Separated">Separated</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Family Members */}
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-400" />
                  Family Members
                </h2>
                <button
                  onClick={() => setShowAddFamilyModal(true)}
                  className="px-4 py-2 bg-blue-500/80 hover:bg-blue-600/80 text-white rounded-lg transition-all duration-300"
                  disabled={getExistingFamilyMembers().length >= 7}
                >
                  {getExistingFamilyMembers().length >= 7 ? 'Maximum Reached' : 'Add Family Member'}
                </button>
              </div>
              
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                  const memberName = formData[`familyMember${num}` as keyof FormData]
                  if (!memberName) return null
                  
                  return (
                    <div key={num} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white">{memberName}</span>
                      <button
                        onClick={() => handleRemoveMember(num)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Therapy Preferences */}
            <div className="mt-8 space-y-6">
              <h2 className="text-xl font-semibold text-white">Therapy Preferences</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Session Preference
                  </label>
                  <select
                    name="sessionPreference"
                    value={formData.sessionPreference}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                  >
                    <option value="">Select preference</option>
                    <option value="30">30 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Session Frequency
                  </label>
                  <select
                    name="sessionFrequency"
                    value={formData.sessionFrequency}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                  >
                    <option value="">Select frequency</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="as-needed">As Needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Communication Style
                  </label>
                  <select
                    name="communicationStyle"
                    value={formData.communicationStyle}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                  >
                    <option value="">Select style</option>
                    <option value="direct">Direct</option>
                    <option value="gentle">Gentle</option>
                    <option value="structured">Structured</option>
                    <option value="exploratory">Exploratory</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notification Preferences
                  </label>
                  <select
                    name="notificationPrefs"
                    value={formData.notificationPrefs}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
                  >
                    <option value="email">Email Only</option>
                    <option value="sms">SMS Only</option>
                    <option value="both">Email & SMS</option>
                    <option value="none">No Notifications</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-8 space-y-6">
              <h2 className="text-xl font-semibold text-white">Additional Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional Notes
                </label>
                <textarea
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Any additional information you'd like to share..."
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            {/* Account Settings */}
            <div className="mt-8 space-y-6 border-t border-white/10 pt-8">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" />
                Account Settings
              </h2>
              
              <div className="space-y-4">
                {/* Profile Reset */}
                <div className="p-6 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-blue-400" />
                        Fresh Start
                      </h3>
                      <p className="text-white/60 text-sm mt-1">
                        Clear your profile data and preferences while keeping your account
                      </p>
                    </div>
                    <button
                      onClick={() => setShowResetModal(true)}
                      className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all duration-300"
                    >
                      Reset Profile
                    </button>
                  </div>
                </div>

                {/* Account Deletion */}
                <div className="p-6 bg-red-900/10 rounded-lg border border-red-900/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        Delete Account
                      </h3>
                      <p className="text-white/60 text-sm mt-1">
                        Temporarily disable your account with 30-day recovery option
                      </p>
                    </div>
                    <Link
                      href="/auth/delete-account"
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all duration-300"
                    >
                      Delete Account
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Update Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="px-6 py-3 bg-blue-500/80 hover:bg-blue-600/80 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? "Updating..." : "Update Profile"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <AddFamilyMemberModal
        isOpen={showAddFamilyModal}
        onClose={() => setShowAddFamilyModal(false)}
        onAdd={handleAddFamilyMember}
        existingMembers={getExistingFamilyMembers()}
      />

      <ProfileResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={async (options) => {
          try {
            const response = await fetch('/api/user/profile-reset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ options })
            });
            
            if (response.ok) {
              // Small delay to ensure server transaction completes
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // 2025 Standard: Properly invalidate cache and refetch instead of page reload
              await invalidateProfile();
              
              // Reset form data to empty state for cleared fields
              setFormData(prev => {
                const newData = { ...prev };
                
                if (options.clearPersonalInfo) {
                  newData.pronouns = "";
                  newData.age = "";
                  newData.phone = "";
                  newData.emergencyContact = "";
                }
                
                if (options.clearPartnerInfo) {
                  newData.partnerName = "";
                  newData.partnerAge = "";
                  newData.relationshipStatus = "Married";
                }
                
                if (options.clearFamilyMembers) {
                  for (let i = 1; i <= 7; i++) {
                    newData[`familyMember${i}` as keyof FormData] = "";
                    newData[`familyMember${i}Age` as keyof FormData] = "";
                  }
                }
                
                if (options.clearTherapyPreferences) {
                  newData.currentConcerns = [];
                  newData.sessionPreference = "";
                  newData.preferredDays = [];
                  newData.sessionFrequency = "";
                  newData.recurringSession = "";
                  newData.reminderTiming = "";
                  newData.communicationStyle = "";
                  newData.additionalNotes = "";
                }
                
                return newData;
              });
              
              setIsSuccess(true);
              setShowResetModal(false);
              
              // Clear success message after 3 seconds
              setTimeout(() => setIsSuccess(false), 3000);
            } else {
              const errorData = await response.json().catch(() => ({ error: 'Failed to reset profile' }));
              setError(errorData.error || 'Failed to reset profile. Please try again.');
            }
          } catch (error) {
            console.error('Error resetting profile:', error);
            setError('Failed to reset profile. Please try again.');
          }
        }}
      />

      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-white font-semibold mb-4">Remove Family Member?</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to remove this family member?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRemoveModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveMember}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}