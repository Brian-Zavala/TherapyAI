'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { User, Users, LogOut } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useProfile } from "@/providers/ProfileProvider"
import FamilyMemberSelectionModal from "@/components/FamilyMemberSelectionModal"
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
  therapyType: string
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
  const { profile, isLoading, updateProfile } = useProfile()
  const [showFamilyModal, setShowFamilyModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
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
    therapyType: "",
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
        therapyType: profile.therapyType || "",
        currentConcerns: profile.currentConcerns || [],
        emergencyContact: profile.emergencyContact || "",
        sessionPreference: profile.sessionPreference || "",
        preferredDays: profile.preferredDays || [],
        sessionFrequency: profile.sessionFrequency || "",
        recurringSession: profile.recurringSession || "",
        reminderTiming: profile.reminderTiming || "",
        communicationStyle: profile.communicationStyle || "",
        additionalNotes: profile.additionalNotes || "",
        notificationPrefs: profile.notificationPrefs || "email"
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading profile...</div>
      </div>
    )
  }

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 pt-20">
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
                  onClick={() => setShowFamilyModal(true)}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all duration-300"
                >
                  Add Family Member
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

            {/* Update Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? "Updating..." : "Update Profile"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      {showFamilyModal && (
        <FamilyMemberSelectionModal
          isOpen={showFamilyModal}
          onClose={() => setShowFamilyModal(false)}
          familyMembers={[
            ...(formData.familyMember1 ? [{ name: formData.familyMember1, age: parseInt(formData.familyMember1Age) || 0, relation: 'Family Member' }] : []),
            ...(formData.familyMember2 ? [{ name: formData.familyMember2, age: parseInt(formData.familyMember2Age) || 0, relation: 'Family Member' }] : []),
            ...(formData.familyMember3 ? [{ name: formData.familyMember3, age: parseInt(formData.familyMember3Age) || 0, relation: 'Family Member' }] : []),
            ...(formData.familyMember4 ? [{ name: formData.familyMember4, age: parseInt(formData.familyMember4Age) || 0, relation: 'Family Member' }] : []),
            ...(formData.familyMember5 ? [{ name: formData.familyMember5, age: parseInt(formData.familyMember5Age) || 0, relation: 'Family Member' }] : []),
            ...(formData.familyMember6 ? [{ name: formData.familyMember6, age: parseInt(formData.familyMember6Age) || 0, relation: 'Family Member' }] : []),
            ...(formData.familyMember7 ? [{ name: formData.familyMember7, age: parseInt(formData.familyMember7Age) || 0, relation: 'Family Member' }] : []),
          ]}
          onSelectMembers={(selectedMembers) => {
            // Handle selection - this modal seems to be used for display purposes in this context
            setShowFamilyModal(false)
          }}
          onRemoveMember={handleRemoveMember}
        />
      )}

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