'use client'

import { useState, useEffect, useRef } from 'react'
import Vapi from '@vapi-ai/web'

type SessionData = {
  id: string
  startTime: string
  endTime?: string
  duration?: number
  notes?: string
}

export default function TherapyButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [callActive, setCallActive] = useState(false)
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null)
  const vapiInstanceRef = useRef<Vapi | null>(null)
  
  // Check if a session was in progress and got interrupted
  useEffect(() => {
    const savedSession = localStorage.getItem('currentTherapySession')
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        if (!session.endTime) {
          // Session was interrupted - calculate duration and mark as ended
          const startTime = new Date(session.startTime)
          const endTime = new Date()
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000)
          
          const completedSession = {
            ...session,
            endTime: endTime.toISOString(),
            duration
          }
          
          // Save to session history
          const history = JSON.parse(localStorage.getItem('therapySessionHistory') || '[]')
          localStorage.setItem('therapySessionHistory', JSON.stringify([
            completedSession,
            ...history
          ]))
          
          // Clear current session
          localStorage.removeItem('currentTherapySession')
        }
      } catch (e) {
        console.error('Error parsing saved session:', e)
        localStorage.removeItem('currentTherapySession')
      }
    }
  }, [])
  
  const startTherapySession = async () => {
    setIsLoading(true)
    
    try {
      // Initialize Vapi with your public key
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '')
      vapiInstanceRef.current = vapi
      
      // Create session tracking data
      const sessionId = `session_${Date.now()}`
      const session = {
        id: sessionId,
        startTime: new Date().toISOString()
      }
      
      setCurrentSession(session as SessionData)
      localStorage.setItem('currentTherapySession', JSON.stringify(session))
      
      // Set up event listeners before starting the call
      vapi.on('call-start', () => {
        console.log('Call has started')
        setCallActive(true)
      })
      
      vapi.on('call-end', () => {
        console.log('Call has ended')
        setCallActive(false)
        endTherapySession(sessionId)
      })
      
      vapi.on('error', (error) => {
        console.error('Vapi error:', error)
        setCallActive(false)
        endTherapySession(sessionId)
      })
      
      // Start a call with your assistant ID
      await vapi.start('f6844388-f547-40af-994e-4edf076f7e9c')
      
    } catch (error) {
      console.error('Error starting therapy session:', error)
      alert('Failed to start therapy session. Please try again.')
      setCallActive(false)
      
      // Clean up any pending session
      if (currentSession) {
        localStorage.removeItem('currentTherapySession')
        setCurrentSession(null)
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  const endTherapySession = (sessionId: string) => {
    // First attempt to end the Vapi call if the instance exists
    if (vapiInstanceRef.current) {
      try {
        // Use stop() instead of end() to terminate the call
        vapiInstanceRef.current.stop()
        vapiInstanceRef.current = null
      } catch (error) {
        console.error('Error ending Vapi call:', error)
      }
    }
    
    const savedSession = localStorage.getItem('currentTherapySession')
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        if (session.id === sessionId) {
          const startTime = new Date(session.startTime)
          const endTime = new Date()
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000)
          
          const completedSession = {
            ...session,
            endTime: endTime.toISOString(),
            duration
          }
          
          // Save to session history
          const history = JSON.parse(localStorage.getItem('therapySessionHistory') || '[]')
          localStorage.setItem('therapySessionHistory', JSON.stringify([
            completedSession,
            ...history
          ]))
          
          // Clear current session
          localStorage.removeItem('currentTherapySession')
          setCurrentSession(null)
        }
      } catch (e) {
        console.error('Error ending session:', e)
        localStorage.removeItem('currentTherapySession')
        setCurrentSession(null)
      }
    }
  }
  
  return (
    <div className="text-center">
      {callActive ? (
        <div className="bg-green-100 p-4 rounded-lg mb-4">
          <p className="text-green-700 font-medium">Therapy session in progress...</p>
          <p className="text-sm text-green-600 mt-2">Speak naturally with your therapist</p>
          
          <div className="mt-4 pt-4 border-t border-green-200">
            <p className="text-xs text-green-600 mb-2">
              Session started at: {currentSession && new Date(currentSession.startTime).toLocaleTimeString()}
            </p>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to end this session?')) {
                  if (currentSession) {
                    endTherapySession(currentSession.id);
                  }
                  setCallActive(false);
                }
              }}
              className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-md hover:bg-red-50 text-sm transition"
            >
              End Session
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startTherapySession}
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg text-white font-medium ${
            isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          } transition`}
        >
          {isLoading ? 'Connecting...' : 'Start Therapy Session'}
        </button>
      )}
    </div>
  )
}