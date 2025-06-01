'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, User, UserCheck, UserX, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import FamilyMemberCard from './FamilyMemberCard';
import RemoveMemberConfirmationModal from './RemoveMemberConfirmationModal';

interface FamilyMember {
  name: string;
  age: number;
  relation: string;
}

interface FamilyMemberSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMembers: (selectedMembers: FamilyMember[]) => void;
  familyMembers: FamilyMember[];
  onRemoveMember?: (index: number) => void;
  isLoading?: boolean;
}

export default function FamilyMemberSelectionModal({
  isOpen,
  onClose,
  onSelectMembers,
  familyMembers,
  onRemoveMember,
  isLoading = false
}: FamilyMemberSelectionModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());
  const [removedMembers, setRemovedMembers] = useState<Set<number>>(new Set());
  const [memberToRemove, setMemberToRemove] = useState<{ member: FamilyMember; index: number } | null>(null);

  // Reset all states when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMembers(new Set());
      setRemovedMembers(new Set());
    }
  }, [isOpen]);

  // Memoized available members with indices (excluding removed ones)
  const availableMembers = useMemo(() => 
    familyMembers.map((member, index) => ({ member, originalIndex: index }))
                 .filter(({ originalIndex }) => !removedMembers.has(originalIndex)),
    [familyMembers, removedMembers]
  );

  // Available members are now the same as eligible members (no exclusion state)
  const eligibleMembers = availableMembers;

  // Performance-optimized handlers with useCallback
  const handleMemberToggle = useCallback((index: number) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const handleRemoveMember = useCallback((index: number) => {
    setRemovedMembers(prev => new Set(prev).add(index));
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
    
    // Call parent callback if provided
    if (onRemoveMember) {
      onRemoveMember(index);
    }
    
    // Close confirmation modal
    setMemberToRemove(null);
  }, [onRemoveMember]);

  const handleRemoveRequest = useCallback((index: number) => {
    const member = familyMembers[index];
    setMemberToRemove({ member, index });
  }, [familyMembers]);

  const handleCancelRemove = useCallback(() => {
    setMemberToRemove(null);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (memberToRemove) {
      handleRemoveMember(memberToRemove.index);
    }
  }, [memberToRemove, handleRemoveMember]);

  const handleSelectAll = useCallback(() => {
    const eligibleIndices = eligibleMembers.map(({ originalIndex }) => originalIndex);
    setSelectedMembers(new Set(eligibleIndices));
  }, [eligibleMembers]);

  const handleClearAll = useCallback(() => {
    setSelectedMembers(new Set());
  }, []);

  const handleContinue = useCallback(() => {
    const selected = Array.from(selectedMembers)
      .filter(index => !removedMembers.has(index))
      .map(index => familyMembers[index]);
    onSelectMembers(selected);
  }, [selectedMembers, removedMembers, familyMembers, onSelectMembers]);

  // Memoized derived state for optimal performance
  const derivedState = useMemo(() => {
    // Count only selected members that are still available (not removed)
    const availableSelectedCount = Array.from(selectedMembers)
      .filter(index => !removedMembers.has(index)).length;
    
    const availableCount = availableMembers.length;
    const eligibleCount = eligibleMembers.length;
    const hasSelection = availableSelectedCount > 0;
    const allEligibleSelected = availableSelectedCount === eligibleCount && eligibleCount > 0;
    const showBulkActions = eligibleCount > 1;
    const hasRemovedMembers = removedMembers.size > 0;

    return {
      selectedCount: availableSelectedCount,
      availableCount,
      eligibleCount,
      hasSelection,
      allEligibleSelected,
      showBulkActions,
      hasRemovedMembers
    };
  }, [selectedMembers, removedMembers, availableMembers.length, eligibleMembers.length]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="family-member-selection-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10002] flex items-start justify-center pt-16 min-h-screen p-3 sm:p-4"
            onClick={onClose}
          >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-xs sm:max-w-lg lg:max-w-2xl bg-gradient-to-br from-gray-900/95 via-slate-800/95 to-gray-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto border border-gray-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-4 sm:px-6 lg:px-8 py-5 sm:py-7 bg-blue-600 border-b border-gray-600/30">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/60 hover:bg-gray-700/80 transition-colors duration-200 border border-gray-600/50"
                disabled={isLoading}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
              </button>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Users className="w-6 h-6 text-white" />
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                    Select Family Members
                  </h2>
                </div>
                <p className="text-gray-300 text-sm sm:text-base px-2">
                  Choose which family members will be attending today's session
                </p>
              </div>
            </div>

            {/* Family Members List */}
            <div className="p-4 sm:p-6 lg:p-8">
              {familyMembers.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">No family members found</p>
                  <p className="text-gray-500 text-sm">
                    Please update your profile to add family members before starting a family therapy session.
                  </p>
                </div>
              ) : (
                <>
                  {/* Performance Notice */}
                  {derivedState.hasRemovedMembers && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-red-300 text-sm">
                          {removedMembers.size} member(s) removed from profile. Changes will be saved after session selection.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-white">
                          Available Family Members ({derivedState.availableCount})
                        </h3>
                      </div>
                      
                      {/* Bulk Action Buttons */}
                      {derivedState.showBulkActions && (
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSelectAll}
                            disabled={derivedState.allEligibleSelected || isLoading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                              derivedState.allEligibleSelected || isLoading
                                ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                                : 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">All Available</span>
                            <span className="sm:hidden">All</span>
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleClearAll}
                            disabled={!derivedState.hasSelection || isLoading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                              !derivedState.hasSelection || isLoading
                                ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                                : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                            }`}
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Clear All</span>
                            <span className="sm:hidden">Clear</span>
                          </motion.button>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {availableMembers.map(({ member, originalIndex }) => (
                        <FamilyMemberCard
                          key={`member-${originalIndex}-${member.name}`}
                          member={member}
                          index={originalIndex}
                          isSelected={selectedMembers.has(originalIndex)}
                          onToggleSelect={handleMemberToggle}
                          onRemoveRequest={handleRemoveRequest}
                          isLoading={isLoading}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Selection Summary */}
                  {derivedState.hasSelection && (
                    <div className="bg-blue-600 rounded-xl p-4 mb-6 border border-green-600/20">
                      <h4 className="font-semibold text-white mb-2">
                        Selected for today's session: <span className="text-green-400">{derivedState.selectedCount}</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(selectedMembers)
                          .filter(index => !removedMembers.has(index))
                          .map(index => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-green-500/40 text-green-200 rounded-full text-sm border border-green-400/50 font-medium"
                            >
                              {familyMembers[index].name}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Session Info */}
                  <div className="bg-gradient-to-br from-gray-800/40 to-gray-700/40 rounded-xl p-4 mb-6 border border-gray-600/20">
                    <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">
                      Family therapy session notes:
                    </h4>
                    <div className="space-y-2 text-xs sm:text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        Your therapist will acknowledge who's present
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        Session content will be tailored to attendees
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        You can start even if some members join late
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                      onClick={onClose}
                      className="w-full sm:flex-1 px-4 sm:px-6 py-3 border border-gray-600/50 text-gray-300 rounded-xl hover:bg-gray-700/30 hover:border-gray-500/60 transition-all duration-200 font-medium text-sm sm:text-base"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: derivedState.hasSelection ? 1.02 : 1 }}
                      whileTap={{ scale: derivedState.hasSelection ? 0.98 : 1 }}
                      onClick={handleContinue}
                      disabled={isLoading || !derivedState.hasSelection}
                      className={`w-full sm:flex-1 px-4 sm:px-6 py-3 rounded-xl transition-all duration-200 font-medium text-sm sm:text-base ${
                        derivedState.hasSelection
                          ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span className="hidden sm:inline">Starting Session...</span>
                          <span className="sm:hidden">Starting...</span>
                        </div>
                      ) : (
                        <>
                          <span className="hidden sm:inline">
                            Start Session with {derivedState.selectedCount} {derivedState.selectedCount === 1 ? 'Member' : 'Members'}
                          </span>
                          <span className="sm:hidden">
                            Start with {derivedState.selectedCount}
                          </span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Remove Member Confirmation Modal - Separate AnimatePresence for proper z-index */}
      <AnimatePresence>
        {memberToRemove && (
          <RemoveMemberConfirmationModal
            key="remove-member-confirmation-modal"
            isOpen={true}
            onClose={handleCancelRemove}
            onConfirm={handleConfirmRemove}
            member={memberToRemove.member}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>
    </>
  );
}