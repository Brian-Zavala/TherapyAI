"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
// Generate secure random token on client side
function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

export default function DeleteAccountConfirmation() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-400 border-t-transparent" />
      </div>
    }>
      <DeleteAccountContent />
    </Suspense>
  );
}

function DeleteAccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState("")
  const [deletionReason, setDeletionReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string>("")

  useEffect(() => {
    // Generate CSRF token on mount
    const csrfTokenValue = generateSecureToken()
    setCsrfToken(csrfTokenValue)
    
    // Set CSRF cookie
    document.cookie = `csrf-token=${csrfTokenValue}; path=/; samesite=strict; secure`
    
    // Validate token from URL
    const deletionToken = searchParams.get("token")
    if (deletionToken) {
      setTokenValid(true)
      setIsLoading(false)
    } else {
      setError("Invalid or missing deletion token")
      setIsLoading(false)
    }
  }, [searchParams])

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!confirmEmail) {
      setError("Please enter your email to confirm deletion")
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({
          token: searchParams.get("token"),
          confirmEmail,
          reason: deletionReason
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Show success message then redirect
        router.push(`/auth/deletion-complete?summary=${encodeURIComponent(JSON.stringify(data.deletionSummary))}`)
      } else {
        setError(data.error || "Failed to delete account")
        setIsDeleting(false)
      }
    } catch (err) {
      setError("Network error. Please try again.")
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black flex items-center justify-center p-4">
        <motion.div 
          className="max-w-md w-full bg-red-900/20 backdrop-blur-xl rounded-2xl p-8 border border-red-500/30"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h1 className="text-2xl font-bold text-red-400 mb-4">Invalid Request</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black flex items-center justify-center p-4">
      <motion.div 
        className="max-w-lg w-full bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="bg-red-600/20 p-6 border-b border-red-500/30">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <svg className="w-8 h-8 mr-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Confirm Account Deletion
          </h1>
        </div>

        <form onSubmit={handleDeleteAccount} className="p-6 space-y-6">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-300 text-sm">
              <strong>⚠️ Final Warning:</strong> This action will permanently delete your account, 
              all your data, and cannot be undone after the 30-day recovery period.
            </p>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Confirm your email address
            </label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-400 transition-colors"
              placeholder="your@email.com"
              required
              disabled={isDeleting}
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Reason for leaving (optional)
            </label>
            <textarea
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white/40 transition-colors h-24 resize-none"
              placeholder="Help us improve by sharing why you're leaving..."
              disabled={isDeleting}
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isDeleting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                  Deleting Account...
                </>
              ) : (
                "Permanently Delete My Account"
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              disabled={isDeleting}
              className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}