'use client'
import { MuteButton } from './MuteButton'
import { EndCallButton } from './EndCallButton'
import { PauseResumeButton } from './PauseResumeButton'

interface CallControlsProps {
  isMuted: boolean
  isSessionPaused: boolean
  totalPausedTimeSeconds: number
  conversationTimeSeconds?: number
  isLoading: boolean
  onMuteToggle: () => void
  onEndCall: () => void
  onPauseResume: () => void
}

/**
 * Call controls component grouping mute, end call, and pause/resume buttons
 * Provides the main control interface during active therapy sessions
 */
export function CallControls({
  isMuted,
  isSessionPaused,
  totalPausedTimeSeconds,
  conversationTimeSeconds = 0,
  isLoading,
  onMuteToggle,
  onEndCall,
  onPauseResume
}: CallControlsProps) {
  // Always show pause/resume button during active sessions
  // Users should be able to pause immediately, even before conversation starts
  const showPauseResume = true
  
  return (
    <div className="px-4 sm:px-6 pb-6 sm:pb-8 flex items-center justify-center relative w-full">
      <div className="flex items-center justify-center space-x-3 sm:space-x-4 max-w-full">
        {/* Mute Button */}
        <MuteButton 
          isMuted={isMuted}
          onClick={onMuteToggle}
        />
        
        {/* End Call Button */}
        <EndCallButton 
          onClick={onEndCall}
          disabled={isLoading}
          isLoading={isLoading}
        />
        
        {/* Pause/Resume Button - only show if conversation has started */}
        {showPauseResume && (
          <PauseResumeButton 
            isPaused={isSessionPaused}
            onClick={onPauseResume}
            totalPausedTimeSeconds={totalPausedTimeSeconds}
          />
        )}
      </div>
    </div>
  )
}