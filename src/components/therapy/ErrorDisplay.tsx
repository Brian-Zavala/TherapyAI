'use client'
import { motion, AnimatePresence } from 'framer-motion'

interface ErrorDisplayProps {
  error: string | null
  onDismiss?: () => void
}

/**
 * Error display component for therapy sessions
 * Shows error messages with dismissable alert styling
 */
export function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="absolute top-0 left-0 right-0 p-4 z-50"
        >
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-start">
              {/* Error Icon */}
              <div className="flex-shrink-0">
                <svg 
                  className="h-5 w-5 text-red-400" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </div>
              
              {/* Error Message */}
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-300">
                  {error}
                </p>
              </div>
              
              {/* Dismiss Button */}
              {onDismiss && (
                <div className="ml-auto pl-3">
                  <button
                    onClick={onDismiss}
                    className="inline-flex rounded-md p-1.5 text-red-400 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg 
                      className="h-5 w-5" 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}