'use client'

import { useEffect, useRef } from 'react'

export const useButtonSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Create audio element
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/click.mp3')
    }
    
    return () => {
      // Cleanup
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const playSound = () => {
    if (audioRef.current) {
      // Reset the audio to the beginning if it's already playing
      audioRef.current.currentTime = 0
      
      // Play the sound
      audioRef.current.play().catch(err => {
        // Silently handle play() errors (e.g., if user hasn't interacted with page yet)
        console.debug('Button sound playback error:', err)
      })
    }
  }

  return playSound
}

export default useButtonSound