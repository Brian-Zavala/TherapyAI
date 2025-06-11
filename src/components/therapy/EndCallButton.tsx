'use client'

interface EndCallButtonProps {
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
}

/**
 * End Call button component for therapy sessions
 * Displays a red phone icon rotated to indicate hanging up
 */
export function EndCallButton({ onClick, disabled = false, isLoading = false }: EndCallButtonProps) {
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onClick}
        disabled={disabled || isLoading}
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 flex items-center justify-center mb-1 sm:mb-2 shadow-lg hover:bg-red-700 transition-all duration-300 disabled:opacity-50 cursor-pointer"
        aria-label="End call"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-8 w-8 sm:h-10 sm:w-10 text-white rotate-135" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" 
          />
        </svg>
      </button>
      <span className="text-white text-xs">End Call</span>
    </div>
  )
}