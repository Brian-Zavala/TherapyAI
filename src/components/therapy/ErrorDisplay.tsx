'use client'
import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Mic, Wifi, RefreshCw, LogIn, ExternalLink, X } from 'lucide-react'

interface ErrorDisplayProps {
  error: string | null
  onDismiss?: () => void
  onRetry?: () => void
}

type ErrorCategory = 'mic' | 'auth' | 'recovery' | 'network' | 'validation' | 'default'

function classifyError(message: string): ErrorCategory {
  const m = message.toLowerCase()
  if (m.includes('microphone') || m.includes('mic ') || m.includes('audio')) return 'mic'
  if (m.includes('sign in') || m.includes('unauthorized') || m.includes('verify') || m.includes('credentials')) return 'auth'
  if (m.includes('refresh') || m.includes('reconnect') || m.includes('resume') || m.includes('recover')) return 'recovery'
  if (m.includes('internet') || m.includes('connect') || m.includes('network') || m.includes('server')) return 'network'
  if (m.includes('select') || m.includes('add family') || m.includes('end your current')) return 'validation'
  return 'default'
}

const CATEGORY_META: Record<
  ErrorCategory,
  { title: string; icon: typeof AlertTriangle; helper?: string }
> = {
  mic: {
    title: 'Microphone access needed',
    icon: Mic,
    helper: 'Open your browser settings, allow microphone access for this site, then try again.',
  },
  auth: {
    title: 'Please sign in again',
    icon: LogIn,
  },
  recovery: {
    title: "Couldn't resume your session",
    icon: RefreshCw,
    helper: 'Refresh the page and your session should reconnect automatically.',
  },
  network: {
    title: 'Connection issue',
    icon: Wifi,
    helper: 'Check your internet connection and try again.',
  },
  validation: {
    title: 'One quick thing',
    icon: AlertTriangle,
  },
  default: {
    title: "Couldn't start your session",
    icon: AlertTriangle,
  },
}

/**
 * Modal error display for therapy sessions.
 * Portals into #modal-root at z-[10001] so it sits above the phone overlay (z-[10000]).
 * Picks a contextual primary action based on the error message content.
 */
export function ErrorDisplay({ error, onDismiss, onRetry }: ErrorDisplayProps) {
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!error || !onDismiss) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [error, onDismiss])

  const category = error ? classifyError(error) : 'default'
  const meta = CATEGORY_META[category]
  const Icon = meta.icon

  const handlePrimary = useCallback(() => {
    switch (category) {
      case 'auth':
        onDismiss?.()
        router.push('/sign-in')
        break
      case 'recovery':
        window.location.reload()
        break
      default:
        onDismiss?.()
        onRetry?.()
    }
  }, [category, onDismiss, onRetry, router])

  const handleSecondary = useCallback(() => {
    if (category === 'recovery') {
      onDismiss?.()
      router.push('/dashboard')
    } else {
      onDismiss?.()
    }
  }, [category, onDismiss, router])

  const primaryLabel: string | null = (() => {
    switch (category) {
      case 'auth':
        return 'Sign In Again'
      case 'recovery':
        return 'Refresh Page'
      case 'validation':
        return null
      default:
        return onRetry ? 'Try Again' : null
    }
  })()

  const secondaryLabel = category === 'recovery' ? 'Go to Dashboard' : 'Dismiss'

  if (!isClient) return null
  const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null
  if (!modalRoot) return null

  const content = (
    <AnimatePresence>
      {error && (
        <motion.div
          key="error-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onDismiss}
          role="presentation"
        >
          <motion.div
            key="error-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="error-title"
            aria-describedby="error-message"
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[90vw] sm:max-w-md rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl p-5 sm:p-7 text-white"
          >
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="absolute right-3 top-3 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="flex items-center gap-3 mb-3 sm:mb-4 pr-8">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500/20 border border-red-400/30 flex items-center justify-center">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-red-300" />
              </div>
              <h2 id="error-title" className="text-base sm:text-lg font-semibold leading-tight">
                {meta.title}
              </h2>
            </div>

            <p
              id="error-message"
              className="text-sm sm:text-base text-white/85 leading-relaxed mb-2"
            >
              {error}
            </p>

            {meta.helper && (
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed mb-4">
                {meta.helper}
              </p>
            )}

            {category === 'mic' && (
              <a
                href="https://support.google.com/chrome/answer/2693767"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-blue-300 hover:text-blue-200 mb-4 underline-offset-4 hover:underline"
              >
                How to enable microphone
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-4">
              <button
                type="button"
                onClick={handleSecondary}
                className="flex-1 px-4 py-2.5 sm:py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm sm:text-base border border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
              >
                {secondaryLabel}
              </button>
              {primaryLabel && (
                <button
                  type="button"
                  onClick={handlePrimary}
                  autoFocus
                  className="flex-1 px-4 py-2.5 sm:py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-medium text-sm sm:text-base shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer"
                >
                  {primaryLabel}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(content, modalRoot)
}
