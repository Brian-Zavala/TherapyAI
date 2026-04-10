// @ts-nocheck
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Vapi from '@vapi-ai/web'
import { toast } from 'sonner'
import { vapiInstanceManager } from '@/lib/services/vapi-instance-manager'

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
  audioLevel: number  // Expose as audioLevel for VoiceWaveform component
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
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Initialize VAPI instance using singleton manager
  useEffect(() => {
    if (!config.apiKey) {
      console.log('[VAPI] No API key provided, skipping initialization');
      setVapi(null);
      vapiRef.current = null;
      return;
    }

    console.log('[VAPI] Requesting instance from manager with key:', config.apiKey.substring(0, 10) + '...');
    
    let mounted = true;
    
    // Subscribe to instance changes first
    unsubscribeRef.current = vapiInstanceManager.subscribe((instance) => {
      if (!mounted) return;
      console.log('[VAPI] Singleton instance update:', instance ? 'available' : 'null');
      vapiRef.current = instance;
      setVapi(instance);
    });
    
    // Get or create instance from manager
    vapiInstanceManager.getOrCreateInstance(config.apiKey)
      .then(vapiInstance => {
        if (!mounted) return;
        
        vapiRef.current = vapiInstance
        setVapi(vapiInstance)
        console.log('[VAPI] Instance obtained from manager successfully');

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
      // Daily.co fires an "ejection" error when VAPI ends the call server-side via endCall tool.
      // This is a normal session end, not a real error — suppress it entirely.
      const msg: string = error?.message || error?.errorMsg || error?.error?.msg || ''
      const isEjection = /ejection|Meeting has ended|no-room/i.test(msg) ||
        error?.error?.type === 'no-room'
      if (isEjection) {
        console.log('[VAPI] Call ended by server (ejection) — treating as normal call-end')
        setIsConnected(false)
        setIsConnecting(false)
        config.onCallEnd?.()
        cleanupVolumeMonitoring()
        return
      }

      console.error('[VAPI] Error:', error)
      setIsConnecting(false)
      config.onError?.(error)

      // Handle specific error types
      if (error.code === 'CONNECTION_FAILED') {
        handleConnectionError()
      }
    })

        vapiInstance.on('volume-level', (level: number) => {
          // VAPI SDK emits 0-1 float, scale to 0-100 for VoiceWaveform thresholds
          const scaled = Math.round(level * 100)
          setVolumeLevel(scaled)
          config.onVolumeLevel?.(scaled)
        })
      })
      .catch(error => {
        if (!mounted) return;
        console.error('[VAPI] Failed to get instance from manager:', error);
        setVapi(null);
        vapiRef.current = null;
      });

    // Cleanup function
    return () => {
      mounted = false;
      console.log('[VAPI] Component cleanup - NOT destroying singleton instance');
      cleanupVolumeMonitoring();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Note: We don't stop the instance here as it's managed by the singleton
      vapiRef.current = null;
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
    // Use ref instead of state to avoid stale closure issues
    const currentVapi = vapiRef.current || vapiInstanceManager.getCurrentInstance();
    
    if (!currentVapi || isConnecting || isConnected) {
      console.log('[VAPI] Cannot start: ', { 
        hasVapi: !!currentVapi, 
        hasRef: !!vapiRef.current,
        hasManager: !!vapiInstanceManager.getCurrentInstance(),
        isConnecting, 
        isConnected 
      })
      return
    }

    setIsConnecting(true)
    
    try {
      console.log('[VAPI] Starting session with assistant:', config.assistantId)
      
      await currentVapi.start(config.assistantId)
      
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
  }, [isConnecting, isConnected, config.assistantId, handleConnectionError])

  const endSession = useCallback(async () => {
    const currentVapi = vapiRef.current || vapiInstanceManager.getCurrentInstance();
    
    if (!currentVapi || !isConnected) {
      console.log('[VAPI] Cannot end: not connected')
      return
    }

    try {
      console.log('[VAPI] Ending session')
      await currentVapi.stop()
      cleanupVolumeMonitoring()
      setIsConnected(false)
    } catch (error) {
      console.error('[VAPI] Failed to end session:', error)
      toast.error('Error ending session', {
        description: 'The session may have already ended.'
      })
    }
  }, [isConnected, cleanupVolumeMonitoring])

  const toggleMute = useCallback(() => {
    const currentVapi = vapiRef.current || vapiInstanceManager.getCurrentInstance();
    
    if (!currentVapi || !isConnected) return

    try {
      const newMutedState = !isMuted
      currentVapi.setMuted(newMutedState)
      setIsMuted(newMutedState)
      
      toast.info(newMutedState ? 'Microphone muted' : 'Microphone unmuted', {
        duration: 2000
      })
    } catch (error) {
      console.error('[VAPI] Failed to toggle mute:', error)
      toast.error('Failed to toggle mute')
    }
  }, [isConnected, isMuted])

  const sendMessage = useCallback((message: string) => {
    const currentVapi = vapiRef.current || vapiInstanceManager.getCurrentInstance();
    
    if (!currentVapi || !isConnected) {
      console.warn('[VAPI] Cannot send message: not connected')
      return
    }

    try {
      currentVapi.send({
        type: 'add-message',
        message: {
          role: 'user',
          content: message
        }
      })
    } catch (error) {
      console.error('[VAPI] Failed to send message:', error)
    }
  }, [isConnected])

  const pauseSession = useCallback(async () => {
    const currentVapi = vapiRef.current || vapiInstanceManager.getCurrentInstance();
    
    if (!currentVapi || !isConnected) return

    try {
      console.log('[VAPI] Pausing session')
      // VAPI doesn't have a native pause, so we'll mute and save state
      currentVapi.setMuted(true)
      setIsMuted(true)
      
      toast.info('Session paused', {
        description: 'Your session has been paused. You can resume anytime.',
        duration: 3000
      })
    } catch (error) {
      console.error('[VAPI] Failed to pause session:', error)
      toast.error('Failed to pause session')
    }
  }, [isConnected])

  const resumeSession = useCallback(async () => {
    const currentVapi = vapiRef.current || vapiInstanceManager.getCurrentInstance();
    
    if (!currentVapi || !isConnected) return

    try {
      console.log('[VAPI] Resuming session')
      currentVapi.setMuted(false)
      setIsMuted(false)
      
      toast.success('Session resumed', {
        description: 'Your therapy session has been resumed.',
        duration: 3000
      })
    } catch (error) {
      console.error('[VAPI] Failed to resume session:', error)
      toast.error('Failed to resume session')
    }
  }, [isConnected])

  return {
    vapi,
    isConnecting,
    isConnected,
    isMuted,
    volumeLevel,
    audioLevel: volumeLevel,  // Expose volumeLevel as audioLevel for VoiceWaveform compatibility
    startSession,
    endSession,
    toggleMute,
    sendMessage,
    pauseSession,
    resumeSession
  }
}