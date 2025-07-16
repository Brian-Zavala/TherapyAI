'use client'

import React from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface EnhancedSchedulerModalProps {
  isOpen: boolean
  onClose: () => void
  sessionToEdit?: any
  onSchedule?: (data: any) => void
}

export function EnhancedSchedulerModal({ 
  isOpen, 
  onClose, 
  sessionToEdit,
  onSchedule 
}: EnhancedSchedulerModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-2xl mx-4 bg-gray-800 rounded-xl p-6 shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">
              {sessionToEdit ? 'Edit Session' : 'Schedule Session'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-400">
              Enhanced scheduling features coming soon. For now, please use the standard scheduling.
            </p>
            
            <button
              onClick={() => {
                onSchedule?.({ date: new Date().toISOString() })
                onClose()
              }}
              className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Schedule Standard Session
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}