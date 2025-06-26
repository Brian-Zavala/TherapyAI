'use client'

import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react'
import useButtonSound from '@/hooks/useButtonSound'

// Enhanced context with audio player controls
type SoundContextType = {
  playButtonSound: () => void;
  // Music player controls
  stopMusicPlayback: () => void;
  registerMusicPlayer: (playerRef: any) => void;
  isSessionActive: boolean;
  setSessionActive: (active: boolean) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

// Create provider component
export function SoundProvider({ children }: { children: ReactNode }) {
  const playButtonSound = useButtonSound()
  const [musicPlayerRef, setMusicPlayerRef] = useState<any>(null)
  const [isSessionActive, setIsSessionActive] = useState(false)
  
  // Function to register the music player
  const registerMusicPlayer = useCallback((playerRef: any) => {
    // 2025 Standard: Only log in development if explicitly debugging
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_SOUND === 'true') {
      console.log('Music player registered with sound provider')
    }
    setMusicPlayerRef(playerRef)
  }, [])
  
  // Function to stop music playback with error handling
  const stopMusicPlayback = useCallback(() => {
    try {
      if (musicPlayerRef && typeof musicPlayerRef.pause === 'function') {
        console.log('Stopping music playback from sound provider')
        musicPlayerRef.pause()
      } else if (musicPlayerRef && musicPlayerRef.current && typeof musicPlayerRef.current.pause === 'function') {
        console.log('Stopping music playback from sound provider (using current)')
        musicPlayerRef.current.pause()
      } else {
        console.warn('No music player registered or player does not have pause method')
      }
    } catch (error) {
      console.error('Error stopping music playback:', error)
      // Continue execution - don't let music errors affect the rest of the app
    }
  }, [musicPlayerRef])
  
  // Function to update session state - simplified to not stop music
  const setSessionActive = useCallback((active: boolean) => {
    setIsSessionActive(active)
    // No longer automatically stopping music when session becomes active
  }, [])
  
  return (
    <SoundContext.Provider value={{ 
      playButtonSound,
      stopMusicPlayback,
      registerMusicPlayer,
      isSessionActive,
      setSessionActive
    }}>
      {children}
    </SoundContext.Provider>
  )
}

// Create hook to use sound context
export function useSoundContext() {
  const context = useContext(SoundContext)
  
  if (context === undefined) {
    throw new Error('useSoundContext must be used within a SoundProvider')
  }
  
  return context
}
