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
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    partnerName: "",
    relationshipStatus: "Married"
  })
  
  // Debug logging for session
  useEffect(() => {
    console.log("Session status:", status)
    console.log("Session data:", session)
  }, [session, status])
  
  // Load user data when session is available
  useEffect(() => {
    if (status === "loading") return
    
    if (status === "unauthenticated") {
      router.push("/login")
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
          partnerName: userData.partnerName || "",
          relationshipStatus: userData.relationshipStatus || "Married"
        })
      } catch (error) {
        console.error("Profile fetch error details:", error)
        setMessage(error.message || "Failed to load profile data")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserData()
  }, [status, router, session])
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleSubmit = async (e) => {
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
      
      setMessage("Profile updated successfully!")
    } catch (error) {
      console.error("Error updating profile:", error)
      setMessage("Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }
  
  if (isLoading) {
    return <div className="p-8 text-center">Loading profile...</div>
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center mb-8">Profile Settings</h1>
        
        {message && (
          <div className={`mb-4 p-3 rounded ${message.includes("success") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block mb-2">Your Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="email" className="block mb-2">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              readOnly
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="partnerName" className="block mb-2">Partner's Name</label>
            <input
              type="text"
              id="partnerName"
              name="partnerName"
              value={formData.partnerName}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="relationshipStatus" className="block mb-2">Relationship Status</label>
            <select
              id="relationshipStatus"
              name="relationshipStatus"
              value={formData.relationshipStatus}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="Married">Married</option>
              <option value="Dating">Dating</option>
              <option value="Engaged">Engaged</option>
              <option value="Separated">Separated</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}