'use client';

/**
 * Sound Effects Hook
 * Manages notification sounds with volume control and preloading
 */

import { useCallback, useEffect, useRef } from 'react';
import { getNotificationConfig } from '@/lib/notifications/notification-config';

type SoundType = 'notification' | 'success' | 'error' | 'warning';

const SOUND_URLS: Record<SoundType, string> = {
  notification: '/sounds/notification.mp3',
  success: '/sounds/notification.mp3', // Use notification sound until specific sounds are added
  error: '/sounds/notification.mp3',   // Use notification sound until specific sounds are added
  warning: '/sounds/notification.mp3', // Use notification sound until specific sounds are added
};

export function useSoundEffects() {
  const config = getNotificationConfig();
  const audioCache = useRef<Map<SoundType, HTMLAudioElement>>(new Map());
  const isEnabledRef = useRef(config.ui.soundEnabled);
  const volumeRef = useRef(config.ui.soundVolume);

  // Update refs when config changes
  useEffect(() => {
    isEnabledRef.current = config.ui.soundEnabled;
    volumeRef.current = config.ui.soundVolume;
  }, [config.ui.soundEnabled, config.ui.soundVolume]);

  // Preload sounds
  useEffect(() => {
    if (!isEnabledRef.current || typeof window === 'undefined') {
      return;
    }

    const preloadSounds = async () => {
      for (const [type, url] of Object.entries(SOUND_URLS)) {
        try {
          const audio = new Audio(url);
          audio.volume = volumeRef.current;
          audio.preload = 'auto';
          
          // Wait for sound to be loaded
          await new Promise((resolve, reject) => {
            audio.addEventListener('canplaythrough', resolve, { once: true });
            audio.addEventListener('error', reject, { once: true });
          });
          
          audioCache.current.set(type as SoundType, audio);
        } catch (error) {
          console.warn(`Failed to preload sound ${type}:`, error);
        }
      }
    };

    preloadSounds();

    return () => {
      // Clean up audio elements
      audioCache.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioCache.current.clear();
    };
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!isEnabledRef.current) {
      return;
    }

    const audio = audioCache.current.get(type);
    if (!audio) {
      console.warn(`Sound ${type} not loaded`);
      return;
    }

    try {
      // Clone the audio to allow multiple simultaneous plays
      const audioClone = audio.cloneNode() as HTMLAudioElement;
      audioClone.volume = volumeRef.current;
      
      audioClone.play().catch(err => {
        // Handle autoplay restrictions
        if (err.name === 'NotAllowedError') {
          console.info('Sound playback requires user interaction');
        } else {
          console.error('Failed to play sound:', err);
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
    
    // Update all cached audio elements
    audioCache.current.forEach(audio => {
      audio.volume = volumeRef.current;
    });
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    isEnabledRef.current = enabled;
  }, []);

  return {
    playSound,
    setVolume,
    setEnabled,
    isEnabled: isEnabledRef.current,
    volume: volumeRef.current,
  };
}