'use client'

interface CallHeaderProps {
  therapistName: string
  therapistImage?: string
  isPaused: boolean
  isVisible: boolean
}

/**
 * Call header component showing therapist name and connection status
 */
export function CallHeader({ therapistName, isPaused, isVisible }: CallHeaderProps) {
  if (!isVisible) return null

  return (
    <div className="px-4 sm:px-6 pt-4 pb-2 flex flex-col items-center justify-center relative">
      <div className="text-white text-center bg-black px-6 py-2 rounded-t-[28px] w-full">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-0.5">
          {therapistName}
        </h3>
        <p className="text-xs font-medium flex items-center justify-center">
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