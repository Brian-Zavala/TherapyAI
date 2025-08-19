'use client'

interface MuteButtonProps {
  isMuted: boolean
  onClick: () => void
  disabled?: boolean
}

/**
 * Mute/Unmute button component for therapy sessions
 * Displays appropriate microphone icon based on mute state
 */
export function MuteButton({ isMuted, onClick, disabled = false }: MuteButtonProps) {
  return (
    <div className="flex flex-col items-center">
      <button 
        onClick={onClick}
        disabled={disabled}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-600 hover:bg-gray-500 active:bg-gray-700 flex items-center justify-center mb-1 sm:mb-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
      >
        {isMuted ? (
          // Muted microphone icon
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 sm:h-6 sm:w-6 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" 
            />
          </svg>
        ) : (
          // Active microphone icon
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 sm:h-6 sm:w-6 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
            />
          </svg>
        )}
      </button>
      <span className="text-white text-xs">{isMuted ? "Unmute" : "Mute"}</span>
    </div>
  )
}