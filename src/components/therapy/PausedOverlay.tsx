'use client'
import { motion, AnimatePresence } from 'framer-motion'

interface PausedOverlayProps {
  isPaused: boolean
  totalPausedMinutes: number
}

/**
 * Overlay displayed when therapy session is paused
 * Shows pause status and money saved from paused time
 */
export function PausedOverlay({ isPaused, totalPausedMinutes }: PausedOverlayProps) {
  return (
    <AnimatePresence>
      {isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-x-0 top-0 bottom-32 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 rounded-t-[28px] pointer-events-none"
        >
          <div className="bg-gray-900/90 p-8 rounded-2xl border border-orange-500/30 shadow-2xl max-w-sm mx-4 pointer-events-auto">
            <div className="flex flex-col items-center">
              {/* Pause Icon */}
              <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-10 w-10 text-orange-500" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              </div>
              
              {/* Status Text */}
              <h3 className="text-xl font-semibold text-white mb-2">
                Session Paused
              </h3>
              <p className="text-gray-300 text-center mb-4">
                Your therapy session is on hold. Press resume to continue.
              </p>
              
              {/* Savings Indicator */}
              {totalPausedMinutes > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
                  <p className="text-green-400 text-sm font-medium">
                    💰 {totalPausedMinutes} minute{totalPausedMinutes !== 1 ? 's' : ''} saved
                  </p>
                </div>
              )}
              
              {/* Billing Note */}
              <p className="text-gray-500 text-xs mt-4 text-center">
                You are not billed during paused time
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}