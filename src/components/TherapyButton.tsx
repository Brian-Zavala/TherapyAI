'use client'

import { useState } from 'react'
import Vapi from '@vapi-ai/web'

export default function TherapyButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [callActive, setCallActive] = useState(false)
  
  const startTherapySession = async () => {
    setIsLoading(true)
    
    try {
      // Initialize Vapi with your public key
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '')
      
      // Set up event listeners before starting the call
      vapi.on('call-start', () => {
        console.log('Call has started');
        setCallActive(true);
      });
      
      vapi.on('call-end', () => {
        console.log('Call has ended');
        setCallActive(false);
      });
      
      vapi.on('error', (error) => {
        console.error('Vapi error:', error);
        setCallActive(false);
      });
      
      // Start a call with your assistant ID
      await vapi.start('f6844388-f547-40af-994e-4edf076f7e9c');
      
    } catch (error) {
      console.error('Error starting therapy session:', error);
      alert('Failed to start therapy session. Please try again.');
      setCallActive(false);
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div className="text-center">
      {callActive ? (
        <div className="bg-green-100 p-4 rounded-lg mb-4">
          <p className="text-green-700 font-medium">Therapy session in progress...</p>
          <p className="text-sm text-green-600 mt-2">Speak naturally with your therapist</p>
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