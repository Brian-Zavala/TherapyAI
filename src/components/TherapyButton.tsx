// src/components/TherapyButton.tsx
'use client'

import { useState, useRef } from 'react'
import Vapi from '@vapi-ai/web'

type TherapyButtonProps = {
  userId: string
}

export default function TherapyButton({ userId }: TherapyButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const vapiInstanceRef = useRef<Vapi | null>(null)
  
  const startTherapySession = async () => {
    setError(null)
    setIsLoading(true)
    
    try {
      // 1. Create a session record in the database
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: new Date().toISOString(),
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create session')
      }
      
      const sessionData = await response.json()
      setSessionId(sessionData.id)
      
      // 2. Initialize Vapi with your API key
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '')
      vapiInstanceRef.current = vapi
      
      // 3. Set up event listeners
      vapi.on('call-start', () => {
        console.log('Call started')
        setIsCallActive(true)
        setIsLoading(false)
      })
      
      vapi.on('call-end', () => {
        console.log('Call ended')
        setIsCallActive(false)
        endTherapySession()
      })
      
      vapi.on('error', (error) => {
        console.error('Vapi error:', error)
        setError('Error during call: ' + error.message)
        setIsCallActive(false)
        endTherapySession()
      })
      
      // 4. Start a call with your assistant ID
      // Replace with your actual Vapi assistant ID
      await vapi.start('YOUR_VAPI_ASSISTANT_ID')
      
    } catch (error) {
      console.error('Error starting therapy session:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      setIsLoading(false)
    }
  }
  
  const endTherapySession = async () => {
    if (!sessionId) return
    
    try {
      // 1. Try to end the Vapi call if active
      if (vapiInstanceRef.current && isCallActive) {
        try {
          vapiInstanceRef.current.stop()
        } catch (e) {
          console.error('Error stopping Vapi call:', e)
        }
      }
      
      // 2. Update the session in the database
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endTime: new Date().toISOString()
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error updating session:', errorData)
      }
      
      // 3. Reset state
      setSessionId(null)
      setIsCallActive(false)
      vapiInstanceRef.current = null
      
    } catch (error) {
      console.error('Error ending therapy session:', error)
    }
  }
  
  return (
    <div className="flex flex-col">
      {error && (
        <div className="p-3 mb-4 text-sm bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {isCallActive ? (
        <div className="flex flex-col items-center">
          <div className="bg-green-100 text-green-800 rounded-full px-4 py-1 text-sm font-medium mb-4">
            Call in progress
          </div>
          
          <button
            onClick={endTherapySession}
            className="bg-red-600 text-white py-2 px-6 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            End Session
          </button>
        </div>
      ) : (
        <button
          onClick={startTherapySession}
          disabled={isLoading}
          className="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
              </svg>
              Start Therapy Session
            </>
          )}
        </button>
      )}
    </div>
  )
}