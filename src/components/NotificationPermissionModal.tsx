'use client'

import React, { useState } from 'react'
import { X, Mail, MessageSquare, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface NotificationPermissionModalProps {
  isOpen: boolean
  onClose: () => void
  onPermissionsUpdate: (permissions: {
    email: boolean
    sms: boolean
    smsConsent: boolean
  }) => void
  currentPermissions?: {
    email: boolean
    sms: boolean
    phone?: string
  }
}

export function NotificationPermissionModal({
  isOpen,
  onClose,
  onPermissionsUpdate,
  currentPermissions
}: NotificationPermissionModalProps) {
  const [email, setEmail] = useState(currentPermissions?.email ?? true)
  const [sms, setSms] = useState(currentPermissions?.sms ?? false)
  const [smsConsent, setSmsConsent] = useState(false)
  const [phone, setPhone] = useState(currentPermissions?.phone || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (sms && !phone) {
      alert('Please enter a phone number to receive SMS notifications')
      return
    }

    if (sms && !smsConsent) {
      alert('Please accept the SMS consent agreement to receive text messages')
      return
    }

    setIsSubmitting(true)
    try {
      // Update user profile with notification preferences
      const notificationPrefs = []
      if (email) notificationPrefs.push('email')
      if (sms) notificationPrefs.push('sms')
      if (!email && !sms) notificationPrefs.push('none')

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationPrefs,
          phone: sms ? phone : undefined,
          smsConsent: sms ? smsConsent : false,
          smsConsentDate: sms && smsConsent ? new Date().toISOString() : undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update notification preferences')
      }

      onPermissionsUpdate({ email, sms, smsConsent })
      onClose()
    } catch (error) {
      console.error('Error updating permissions:', error)
      alert('Failed to update notification preferences. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Notification Preferences
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              To ensure you never miss a session, please set your notification preferences.
              We'll send reminders 24 hours and 1 hour before your scheduled sessions.
            </p>
            
            <div className="space-y-4">
              {/* Email Notifications */}
              <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={email}
                  onChange={(e) => setEmail(e.target.checked)}
                  className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  disabled={isSubmitting}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">Email Reminders</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Receive session reminders via email
                  </p>
                </div>
              </label>

              {/* SMS Notifications */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={sms}
                    onChange={(e) => setSms(e.target.checked)}
                    className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    disabled={isSubmitting}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">SMS Text Reminders</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Receive session reminders via text message
                    </p>
                  </div>
                </label>

                {/* Phone Number Input */}
                {sms && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pl-12"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* SMS Consent */}
                    <label className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <input
                        type="checkbox"
                        checked={smsConsent}
                        onChange={(e) => setSmsConsent(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        disabled={isSubmitting}
                      />
                      <div className="flex-1">
                        <p className="text-xs text-gray-700 leading-relaxed">
                          By checking this box, I consent to receive automated text messages 
                          for session reminders at the phone number provided. Message and data 
                          rates may apply. Reply STOP to opt out at any time.
                        </p>
                      </div>
                    </label>
                  </motion.div>
                )}
              </div>

              {/* Warning if no notifications selected */}
              {!email && !sms && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-amber-50 border border-amber-200 rounded-lg"
                >
                  <p className="text-sm text-amber-800">
                    <strong>Warning:</strong> You won't receive any session reminders. 
                    You'll need to remember your scheduled sessions on your own.
                  </p>
                </motion.div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (!email && !sms)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}