'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Vapi from '@vapi-ai/web'
import { toast } from 'sonner'

interface VapiSessionConfig {
  apiKey?: string
  assistantId: string
  onCallStart?: () => void
  onCallEnd?: () => void
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  onMessage?: (message: any) => void
  onError?: (error: any) => void
  onVolumeLevel?: (level: number) => void
}

interface UseVapiSessionReturn {
  vapi: Vapi | null
  isConnecting: boolean
  isConnected: boolean
  isMuted: boolean
  volumeLevel: number
  startSession: () => Promise<void>
  endSession: () => Promise<void>
  toggleMute: () => void
  sendMessage: (message: string) => void
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
}

export function useVapiSession(config: VapiSessionConfig): UseVapiSessionReturn {
  const [vapi, setVapi] = useState<Vapi | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(0)
  
  const vapiRef = useRef<Vapi | null>(null)
  const volumeIntervalRef = useRef<NodeJS.Timeout>()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const connectionAttempts = useRef(0)

  // Initialize VAPI instance
  useEffect(() => {
    if (!config.apiKey) return

    const vapiInstance = new Vapi(config.apiKey)
    vapiRef.current = vapiInstance
    setVapi(vapiInstance)

    // Set up event listeners
    vapiInstance.on('call-start', () => {
      console.log('[VAPI] Call started')
      setIsConnected(true)
      setIsConnecting(false)
      connectionAttempts.current = 0
      config.onCallStart?.()
    })

    vapiInstance.on('call-end', () => {
      console.log('[VAPI] Call ended')
      setIsConnected(false)
      setIsConnecting(false)
      config.onCallEnd?.()
      cleanupVolumeMonitoring()
    })

    vapiInstance.on('speech-start', () => {
      console.log('[VAPI] Speech started')
      config.onSpeechStart?.()
    })

    vapiInstance.on('speech-end', () => {
      console.log('[VAPI] Speech ended')
      config.onSpeechEnd?.()
    })

    vapiInstance.on('message', (message: any) => {
      console.log('[VAPI] Message received:', message.type)
      config.onMessage?.(message)
    })

    vapiInstance.on('error', (error: any) => {
      console.error('[VAPI] Error:', error)
      setIsConnecting(false)
      config.onError?.(error)
      
      // Handle specific error types
      if (error.code === 'CONNECTION_FAILED') {
        handleConnectionError()
      }
    })

    vapiInstance.on('volume-level', (level: number) => {
      setVolumeLevel(level)
      config.onVolumeLevel?.(level)
    })

    return () => {
      console.log('[VAPI] Cleaning up instance')
      cleanupVolumeMonitoring()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      vapiInstance.stop()
      vapiRef.current = null
    }
  }, [config.apiKey])

  const cleanupVolumeMonitoring = useCallback(() => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current)
      volumeIntervalRef.current = undefined
    }
    setVolumeLevel(0)
  }, [])

  const handleConnectionError = useCallback(() => {
    connectionAttempts.current++
    
    if (connectionAttempts.current <= 3) {
      const delay = Math.min(1000 * Math.pow(2, connectionAttempts.current - 1), 5000)
      
      toast.error(`Connection failed. Retrying in ${delay / 1000} seconds...`, {
        duration: delay
      })

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[VAPI] Attempting reconnection...')
        startSession()
      }, delay)
    } else {
      toast.error('Unable to connect to therapy session', {
        description: 'Please check your internet connection and try again.',
        duration: 5000
      })
    }
  }, [])

  const startSession = useCallback(async () => {
    if (!vapi || isConnecting || isConnected) {
      console.log('[VAPI] Cannot start: ', { hasVapi: !!vapi, isConnecting, isConnected })
      return
    }

    setIsConnecting(true)
    
    try {
      console.log('[VAPI] Starting session with assistant:', config.assistantId)
      
      await vapi.start(config.assistantId)
      
      // Start volume monitoring
      volumeIntervalRef.current = setInterval(() => {
        // Volume level is updated via event listener
      }, 100)
      
    } catch (error) {
      console.error('[VAPI] Failed to start session:', error)
      setIsConnecting(false)
      
      toast.error('Failed to start therapy session', {
        description: 'Please try again or contact support if the issue persists.'
      })
      
      handleConnectionError()
    }
  }, [vapi, isConnecting, isConnected, config.assistantId, handleConnectionError])

  const endSession = useCallback(async () => {
    if (!vapi || !isConnected) {
      console.log('[VAPI] Cannot end: not connected')
      return
    }

    try {
      console.log('[VAPI] Ending session')
      await vapi.stop()
      cleanupVolumeMonitoring()
      setIsConnected(false)
    } catch (error) {
      console.error('[VAPI] Failed to end session:', error)
      toast.error('Error ending session', {
        description: 'The session may have already ended.'
      })
    }
  }, [vapi, isConnected, cleanupVolumeMonitoring])

  const toggleMute = useCallback(() => {
    if (!vapi || !isConnected) return

    try {
      const newMutedState = !isMuted
      vapi.setMuted(newMutedState)
      setIsMuted(newMutedState)
      
      toast.info(newMutedState ? 'Microphone muted' : 'Microphone unmuted', {
        duration: 2000
      })
    } catch (error) {
      console.error('[VAPI] Failed to toggle mute:', error)
      toast.error('Failed to toggle mute')
    }
  }, [vapi, isConnected, isMuted])

  const sendMessage = useCallback((message: string) => {
    if (!vapi || !isConnected) {
      console.warn('[VAPI] Cannot send message: not connected')
      return
    }

    try {
      vapi.send({
        type: 'add-message',
        message: {
          role: 'user',
          content: message
        }
      })
    } catch (error) {
      console.error('[VAPI] Failed to send message:', error)
    }
  }, [vapi, isConnected])

  const pauseSession = useCallback(async () => {
    if (!vapi || !isConnected) return

    try {
      console.log('[VAPI] Pausing session')
      // VAPI doesn't have a native pause, so we'll mute and save state
      vapi.setMuted(true)
      setIsMuted(true)
      
      toast.info('Session paused', {
        description: 'Your session has been paused. You can resume anytime.',
        duration: 3000
      })
    } catch (error) {
      console.error('[VAPI] Failed to pause session:', error)
      toast.error('Failed to pause session')
    }
  }, [vapi, isConnected])

  const resumeSession = useCallback(async () => {
    if (!vapi || !isConnected) return

    try {
      console.log('[VAPI] Resuming session')
      vapi.setMuted(false)
      setIsMuted(false)
      
      toast.success('Session resumed', {
        description: 'Your therapy session has been resumed.',
        duration: 3000
      })
    } catch (error) {
      console.error('[VAPI] Failed to resume session:', error)
      toast.error('Failed to resume session')
    }
  }, [vapi, isConnected])

  return {
    vapi,
    isConnecting,
    isConnected,
    isMuted,
    volumeLevel,
    startSession,
    endSession,
    toggleMute,
    sendMessage,
    pauseSession,
    resumeSession
  }
}