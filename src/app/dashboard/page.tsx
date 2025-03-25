// src/app/dashboard/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import TherapyButton from '@/components/TherapyButton'
import SessionHistory from '@/components/SessionHistory'
import SessionNotes from '@/components/SessionNotes'
import RelationshipAssessment from '@/components/RelationshipAssessment'

export default function Dashboard() {
  const [userName] = useState('User')
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome, {userName}</h1>
        <p className="text-gray-600 mb-4">
          Your safe space for relationship growth and healing.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Start a Therapy Session</h2>
        <p className="text-gray-600 mb-6">
          Connect with our AI therapist for guidance on communication, 
          conflict resolution, and strengthening your relationship.
        </p>
        
        <TherapyButton />
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <SessionHistory />
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3">Resources</h3>
          <ul className="space-y-2 text-gray-700">
            <li>• Communication Skills Guide</li>
            <li>• Conflict Resolution Techniques</li>
            <li>• Building Trust Workbook</li>
            <li>• Emotional Intimacy Exercises</li>
          </ul>
          <div className="mt-4">
            <Link href="/dashboard/resources" className="text-blue-600 hover:underline text-sm font-medium">
              View All Resources →
            </Link>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <SessionNotes />
        <RelationshipAssessment />
      </div>
    </div>
  )
}