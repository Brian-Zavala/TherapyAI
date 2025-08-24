'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * SessionConflictDialog - Handles conflicts when user tries to start a new session
 * while one is already active (not from page refresh/recovery scenarios)
 * 
 * Note: This is different from ActiveSessionFoundModal which handles session recovery
 * after page refresh. This dialog only shows when actively creating a new session.
 */
interface SessionConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSession: {
    theme: string;
    conversationTimeSeconds: number;
    startTime: string;
  } | null;
  onResume: () => void;
  onEndAndStartNew: () => void;
  formatTime: (seconds: number) => string;
}

export function SessionConflictDialog({
  open,
  onOpenChange,
  existingSession,
  onResume,
  onEndAndStartNew,
  formatTime
}: SessionConflictDialogProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!isClient || !existingSession) return null;

  const sessionStartTime = new Date(existingSession.startTime);
  const timeAgo = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000 / 60);

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full mx-auto overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {/* Header */}
            <div className="relative p-6 pb-4 border-b border-gray-200 dark:border-zinc-800">
              <button
                onClick={() => onOpenChange(false)}
                className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
                  <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                </div>
                <h2 className="text-xl font-semibold">Active Session Detected</h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                You have an active session that started {timeAgo} minutes ago:
              </p>
              
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 space-y-2">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {existingSession.theme}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Duration: {formatTime(existingSession.conversationTimeSeconds)}</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Would you like to resume this session or end it and start a new one?
              </p>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-gray-200 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onEndAndStartNew}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-600 rounded-lg font-medium transition-colors"
                >
                  End & Start New
                </button>
                <button
                  onClick={onResume}
                  className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors flex-1 sm:flex-initial"
                >
                  Resume Session
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use React Portal to render outside the component tree
  return createPortal(modalContent, document.getElementById('modal-root') || document.body);
}