'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import useButtonSound from '@/hooks/useButtonSound'

// Create context
type SoundContextType = {
  playButtonSound: () => void
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

// Create provider component
export function SoundProvider({ children }: { children: ReactNode }) {
  const playButtonSound = useButtonSound()
  
  return (
    <SoundContext.Provider value={{ playButtonSound }}>
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
