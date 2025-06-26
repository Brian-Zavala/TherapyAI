'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus } from 'lucide-react';
import { createPortal } from 'react-dom';

interface AddFamilyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (member: { name: string; age: string }) => void;
  existingMembers: string[];
}

export default function AddFamilyMemberModal({
  isOpen,
  onClose,
  onAdd,
  existingMembers
}: AddFamilyMemberModalProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setAge('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (existingMembers.includes(name.trim())) {
      setError('This family member already exists');
      return;
    }

    onAdd({ name: name.trim(), age: age.trim() });
    onClose();
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
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          >
            <div 
              className="relative w-full max-w-md bg-gradient-to-br from-gray-900/95 via-slate-800/95 to-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50"
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
                  <UserPlus className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Add Family Member</h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter family member's name"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter age (optional)"
                    min="0"
                    max="120"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-700/30 hover:border-gray-500/60 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-medium"
                  >
                    Add Member
                  </button>
                </div>
              </form>
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