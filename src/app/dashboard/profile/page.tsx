'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfileSettings() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  // In a real app, these would be loaded from your auth system
  const [name, setName] = useState('Jane')
  const [email, setEmail] = useState('jane@example.com')
  const [partnerName, setPartnerName] = useState('John')
  const [relationshipStatus, setRelationshipStatus] = useState('married')
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // In a real app, this would update the user's profile in your database
    console.log('Updating profile:', { name, email, partnerName, relationshipStatus })
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsLoading(false)
    alert('Profile updated successfully!')
    
    // Redirect back to dashboard
    router.push('/dashboard')
  }
  
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 mb-2">Your Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="partnerName" className="block text-gray-700 mb-2">Partner's Name</label>
          <input
            type="text"
            id="partnerName"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="relationshipStatus" className="block text-gray-700 mb-2">Relationship Status</label>
          <select
            id="relationshipStatus"
            value={relationshipStatus}
            onChange={(e) => setRelationshipStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="dating">Dating</option>
            <option value="engaged">Engaged</option>
            <option value="married">Married</option>
            <option value="longTerm">Long-term relationship</option>
            <option value="complicated">It's complicated</option>
          </select>
        </div>
        
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 rounded-md text-white ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} transition`}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}