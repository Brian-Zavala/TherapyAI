'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, User, Trash2 } from 'lucide-react';

interface FamilyMember {
  name: string;
  age: number;
  relation: string;
}

interface RemoveMemberConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  member: FamilyMember;
  isLoading?: boolean;
}

export default function RemoveMemberConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  member,
  isLoading = false
}: RemoveMemberConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={`remove-confirmation-${member.name}-${member.age}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10003] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-md bg-gradient-to-br from-gray-900/95 via-slate-800/95 to-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-6 py-5 bg-red-600/10 border-b border-red-600/20">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/60 hover:bg-gray-700/80 transition-colors duration-200 border border-gray-600/50"
                disabled={isLoading}
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <h2 className="text-xl font-bold text-white">
                    Remove Family Member
                  </h2>
                </div>
                <p className="text-gray-300 text-sm px-2">
                  This action will permanently remove this member from your profile
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Member Info */}
              <div className="bg-blue-600/20 rounded-xl p-4 mb-6 border border-blue-600/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">
                      {member.name}
                    </h4>
                    <p className="text-sm text-gray-300">
                      {member.relation}, {member.age} years old
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="text-red-300 font-medium">
                      Are you sure you want to remove {member.name}?
                    </p>
                    <div className="text-red-200/80 space-y-1">
                      <p>• This will permanently delete them from your family profile</p>
                      <p>• They won't be available for future therapy sessions</p>
                      <p>• You can add them back later if needed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-600/50 text-gray-300 rounded-xl hover:bg-gray-700/30 hover:border-gray-500/60 transition-all duration-200 font-medium"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}