'use client'

interface CallHeaderProps {
  therapistName: string
  isPaused: boolean
  isVisible: boolean
}

/**
 * Call header component showing therapist name and connection status
 * Displays connection state with pulsing indicator
 */
export function CallHeader({ therapistName, isPaused, isVisible }: CallHeaderProps) {
  if (!isVisible) return null

  return (
    <div className="px-4 sm:px-6 pt-5 pb-3 flex flex-col items-center justify-center relative">
      <div className="text-white text-center bg-black px-6 py-3 rounded-t-[28px] shadow-inner w-full border-t border-x border-gray-800">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">
          {therapistName}
        </h3>
        <p className="text-xs sm:text-sm font-medium flex items-center justify-center">
          <span 
            className={`inline-block w-2 h-2 rounded-full mr-2 ${
              isPaused ? 'bg-orange-400' : 'bg-green-400 animate-pulse'
            }`}
          />
          <span className={isPaused ? 'text-orange-300' : 'text-blue-300'}>
            {isPaused ? 'Paused' : 'Connected'}
          </span>
        </p>
      </div>
    </div>
  )
}