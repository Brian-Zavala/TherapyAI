// src/components/TherapyButton.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Vapi from '@vapi-ai/web'

type TherapyButtonProps = {
  userId: string
}

export default function TherapyButton({ userId }: TherapyButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcriptChunks, setTranscriptChunks] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const vapiInstanceRef = useRef<any>(null)

  // Check for existing session on component mount
  useEffect(() => {
    async function checkForActiveSession() {
      try {
        const response = await fetch(`/api/sessions/active?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          if (data && data.id) {
            setSessionId(data.id)
            setIsCallActive(true)
          }
        }
      } catch (error) {
        console.error('Error checking for active session:', error)
      }
    }

    checkForActiveSession()
  }, [userId])

  async function createVapiInstance() {
    try {
      // Dispose of any existing instance first
      if (vapiInstanceRef.current) {
        try {
          await vapiInstanceRef.current.stop()
        } catch (e) {
          console.warn('Error stopping existing Vapi instance:', e)
        }
        vapiInstanceRef.current = null
      }

      // Create a new instance with the API key
      const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY
      if (!apiKey) {
        throw new Error('Vapi API key is missing')
      }

      console.log('Creating new Vapi instance with key:', apiKey.substring(0, 5) + '...')
      vapiInstanceRef.current = new Vapi(apiKey)
      
      // Debug: Check if the instance was created
      console.log('Vapi instance created:', !!vapiInstanceRef.current)
      
      // Set up event handlers
      vapiInstanceRef.current.on('call-start', () => {
        console.log('Call started successfully')
        setIsCallActive(true)
        setErrorMessage(null)
      })
      
      vapiInstanceRef.current.on('call-end', () => {
        console.log('Call ended')
        if (sessionId) {
          endTherapySession()
        }
      })
      
      vapiInstanceRef.current.on('error', (error: any) => {
        // Stringify error to see more details
        const errorString = JSON.stringify(error) || 'Empty error object'
        console.error('Vapi error:', errorString)
        setErrorMessage(`Vapi error: ${errorString}`)
        
        if (sessionId) {
          endTherapySession()
        }
      })
      
      vapiInstanceRef.current.on('message', (message: any) => {
        console.log('Message received:', message)
        // Handle different message types
        if (message.type === 'transcript') {
          setTranscriptChunks(prev => [...prev, `USER: ${message.transcript}`])
        } else if (message.type === 'model-output' && message.content) {
          setTranscriptChunks(prev => [...prev, `THERAPIST: ${message.content}`])
        }
      })
      
      return true
    } catch (error) {
      console.error('Failed to create Vapi instance:', error)
      setErrorMessage(`Failed to create Vapi instance: ${error}`)
      return false
    }
  }

  async function startTherapySession() {
    setErrorMessage(null)
    try {
      setIsLoading(true)

      // 1. Create session in database
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          startTime: new Date().toISOString(),
          status: 'active',
          theme: 'general relationship',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const session = await response.json()
      setSessionId(session.id)

      // 2. Initialize Vapi instance fresh each time
      const initialized = await createVapiInstance()
      if (!initialized) {
        throw new Error('Failed to initialize Vapi')
      }

      // 3. Check browser permissions
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        console.log('Microphone permission granted')
      } catch (mediaError) {
        console.error('Microphone permission denied:', mediaError)
        setErrorMessage('Microphone access denied. Please allow microphone access and try again.')
        throw new Error('Microphone permission denied')
      }

      // 4. Start the call with hardcoded assistant ID
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID
      console.log('Starting call with assistant ID:', assistantId)      
      
      // Add timeout for debugging
      const startPromise = vapiInstanceRef.current.start(assistantId)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Start call timeout')), 15000)
      )
      
      await Promise.race([startPromise, timeoutPromise])
      
    } catch (error) {
      console.error('Failed to start therapy session:', error)
      setErrorMessage(`Start session error: ${error}`)
      
      // Clean up if we failed to start
      if (sessionId) {
        try {
          await fetch(`/api/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'failed',
              endTime: new Date().toISOString(),
            }),
          })
        } catch (cleanupError) {
          console.error('Failed to cleanup session:', cleanupError)
        }
        
        setSessionId(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function endTherapySession() {
    if (!sessionId) {
      console.log('No active session to end')
      return
    }

    try {
      setIsLoading(true)
      
      // 1. Stop the call if it's active
      if (vapiInstanceRef.current) {
        try {
          await vapiInstanceRef.current.stop()
        } catch (stopError) {
          console.warn('Error stopping Vapi call:', stopError)
        }
        vapiInstanceRef.current = null
      }
      
      // 2. Update session in database with end time
      const transcript = transcriptChunks.join('\n')
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          status: 'completed',
          transcript: transcript,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error updating session:', errorData)
        throw new Error(errorData.error || 'Failed to update session')
      }
      
      const updatedSession = await response.json()
      console.log('Session updated successfully:', updatedSession)

    } catch (error) {
      console.error('Failed to end session:', error)
      setErrorMessage(`End session error: ${error}`)
    } finally {
      // Reset state
      setSessionId(null)
      setIsCallActive(false)
      setTranscriptChunks([])
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}
      
      {!isCallActive ? (
        <button
          onClick={startTherapySession}
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Connecting...' : 'Start Therapy Session'}
        </button>
      ) : (
        <button
          onClick={endTherapySession}
          disabled={isLoading}
          className="px-6 py-3 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Ending...' : 'End Therapy Session'}
        </button>
      )}
      
      {isCallActive && (
        <p className="mt-4 text-green-600 font-medium">
          Session active - speak with our AI therapist
        </p>
      )}
    </div>
  )
}