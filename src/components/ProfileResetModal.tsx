'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ProfileResetOptions {
  keepTherapyHistory: boolean;
  keepAssistantConfig: boolean;
  clearPartnerInfo: boolean;
  clearFamilyMembers: boolean;
  clearTherapyPreferences: boolean;
  clearPersonalInfo: boolean;
}

interface ProfileResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: ProfileResetOptions) => void;
}

export default function ProfileResetModal({
  isOpen,
  onClose,
  onConfirm
}: ProfileResetModalProps) {
  const [isClient, setIsClient] = useState(false);
  const [options, setOptions] = useState<ProfileResetOptions>({
    keepTherapyHistory: true,
    keepAssistantConfig: true,
    clearPartnerInfo: true,
    clearFamilyMembers: true,
    clearTherapyPreferences: true,
    clearPersonalInfo: true
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Reset options when modal opens
      setOptions({
        keepTherapyHistory: true,
        keepAssistantConfig: true,
        clearPartnerInfo: true,
        clearFamilyMembers: true,
        clearTherapyPreferences: true,
        clearPersonalInfo: true
      });
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(options);
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 overflow-x-hidden"
          >
            <div
              className="relative w-full max-w-lg bg-gradient-to-br from-gray-900/95 via-slate-800/95 to-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative px-6 py-6 border-b border-gray-600/30">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/60 hover:bg-gray-700/80 transition-colors duration-200 border border-gray-600/50"
                >
                  <X className="w-4 h-4 text-gray-300" />
                </button>
                
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Reset Your Profile</h2>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    This will clear selected profile data while keeping your account active. 
                    You can rebuild your profile anytime.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* What will be reset */}
                  <div>
                    <h3 className="text-white font-medium mb-3">What will be reset:</h3>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.clearPersonalInfo}
                          onChange={(e) => setOptions({...options, clearPersonalInfo: e.target.checked})}
                          className="mt-1 w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="text-white/90 block">Personal Information</span>
                          <span className="text-white/50 text-sm">Age, phone, pronouns, emergency contact</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.clearPartnerInfo}
                          onChange={(e) => setOptions({...options, clearPartnerInfo: e.target.checked})}
                          className="mt-1 w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="text-white/90 block">Partner Information</span>
                          <span className="text-white/50 text-sm">Partner name, age, and relationship status</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.clearFamilyMembers}
                          onChange={(e) => setOptions({...options, clearFamilyMembers: e.target.checked})}
                          className="mt-1 w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="text-white/90 block">Family Members</span>
                          <span className="text-white/50 text-sm">All added family members (children, parents, etc.)</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.clearTherapyPreferences}
                          onChange={(e) => setOptions({...options, clearTherapyPreferences: e.target.checked})}
                          className="mt-1 w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="text-white/90 block">Therapy Preferences</span>
                          <span className="text-white/50 text-sm">Session preferences, concerns, and notes</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* What will be kept */}
                  <div>
                    <h3 className="text-white font-medium mb-3">What will be kept:</h3>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.keepTherapyHistory}
                          onChange={(e) => setOptions({...options, keepTherapyHistory: e.target.checked})}
                          className="mt-1 w-4 h-4 text-green-600 bg-white/10 border-white/30 rounded focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <span className="text-white/90 block">Therapy History</span>
                          <span className="text-white/50 text-sm">Past sessions and progress tracking</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.keepAssistantConfig}
                          onChange={(e) => setOptions({...options, keepAssistantConfig: e.target.checked})}
                          className="mt-1 w-4 h-4 text-green-600 bg-white/10 border-white/30 rounded focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <span className="text-white/90 block">AI Assistant</span>
                          <span className="text-white/50 text-sm">Your personalized therapy AI configuration</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                  <p className="text-orange-300 text-sm flex items-center gap-2">
                    <span className="text-orange-400">⚠️</span>
                    This action cannot be undone. Make sure you want to proceed.
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-700/30 hover:border-gray-500/60 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reset Profile
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!isClient) {
    return null;
  }

  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) {
    console.error("Modal root element not found");
    return null;
  }

  return createPortal(modalContent, modalRoot);
}