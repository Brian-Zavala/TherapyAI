'use client'

interface PauseResumeButtonProps {
  isPaused: boolean
  onClick: () => void
  disabled?: boolean
  totalPausedTimeSeconds?: number
}

/**
 * Pause/Resume button component for therapy sessions
 * Displays play/pause icons and shows time saved when paused
 * Used for billing optimization by pausing VAPI connections
 */
export function PauseResumeButton({ 
  isPaused, 
  onClick, 
  disabled = false, 
  totalPausedTimeSeconds = 0 
}: PauseResumeButtonProps) {
  return (
    <div className="flex flex-col items-center">
      <button 
        onClick={onClick}
        disabled={disabled}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${
          isPaused ? 'bg-green-600' : 'bg-orange-500'
        } flex items-center justify-center mb-1 sm:mb-2 transition-colors duration-300 hover:bg-opacity-90 cursor-pointer disabled:opacity-50`}
        aria-label={isPaused ? "Resume session" : "Pause session"}
      >
        {isPaused ? (
          // Resume icon (play button)
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 sm:h-6 sm:w-6 text-white" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z"/>
          </svg>
        ) : (
          // Pause icon
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 sm:h-6 sm:w-6 text-white" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        )}
      </button>
      <span className="text-white text-xs">{isPaused ? "Resume" : "Pause"}</span>
      
      {/* Show pause time saved indicator */}
      {isPaused && totalPausedTimeSeconds > 0 && (
        <span className="text-green-400 text-[10px] mt-1">
          💰 {Math.floor(totalPausedTimeSeconds / 60)}m saved
        </span>
      )}
    </div>
  )
}