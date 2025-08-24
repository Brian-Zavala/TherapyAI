'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusCircleIcon, XCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useFamilyMembersEnhanced } from '@/hooks/useFamilyMembersEnhanced'
import ButtonWithSound from '@/components/ui/buttons/ButtonWithSound'
import GlassCard from '@/components/ui/glass-card'

interface FamilyMembersStepProps {
  onComplete: (data: any) => void
  onBack?: () => void
  initialData?: any
}

// Comprehensive relationship options
const relationshipOptions = [
  // Children
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'child', label: 'Child (non-binary)' },
  
  // Parents
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'parent', label: 'Parent (non-binary)' },
  
  // Siblings
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'sibling', label: 'Sibling (non-binary)' },
  
  // Extended family
  { value: 'grandmother', label: 'Grandmother' },
  { value: 'grandfather', label: 'Grandfather' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'cousin', label: 'Cousin' },
  
  // Step-family
  { value: 'stepmother', label: 'Stepmother' },
  { value: 'stepfather', label: 'Stepfather' },
  { value: 'stepbrother', label: 'Stepbrother' },
  { value: 'stepsister', label: 'Stepsister' },
  
  // Other
  { value: 'friend', label: 'Close Friend' },
  { value: 'other', label: 'Other' },
]

export default function FamilyMembersStepEnhanced({
  onComplete,
  onBack,
  initialData,
}: FamilyMembersStepProps) {
  const {
    familyMembers,
    loading,
    error,
    isSaving,
    addFamilyMember,
    updateFamilyMember,
    removeFamilyMember,
    reorderFamilyMembers,
    saveFamilyMembers,
    hasLegacyData,
    migrateFromLegacyFormat,
  } = useFamilyMembersEnhanced({
    enableBackwardCompatibility: true,
    autoSave: false, // Manual save on complete
  })

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Handle legacy data migration
  useEffect(() => {
    if (hasLegacyData && !loading) {
      migrateFromLegacyFormat()
    }
  }, [hasLegacyData, loading, migrateFromLegacyFormat])

  // Add new family member
  const handleAddMember = () => {
    if (familyMembers.length >= 10) {
      setValidationErrors({ general: 'Maximum 10 family members allowed' })
      return
    }
    
    addFamilyMember({
      name: '',
      age: null,
      relation: null,
    })
  }

  // Validate before saving
  const validateAndComplete = async () => {
    const errors: Record<string, string> = {}
    
    // Validate each family member
    familyMembers.forEach((member, index) => {
      if (!member.name?.trim()) {
        errors[`member-${index}-name`] = 'Name is required'
      }
      if (member.age !== null && member.age !== undefined && (member.age < 0 || member.age > 150)) {
        errors[`member-${index}-age`] = 'Invalid age'
      }
    })
    
    setValidationErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      return
    }
    
    try {
      // Save family members
      await saveFamilyMembers()
      
      // Pass data to parent
      onComplete({
        familyMembers: familyMembers.map(fm => ({
          id: fm.id,
          name: fm.name,
          age: fm.age,
          relation: fm.relation,
        })),
        hasFamilyMembers: familyMembers.length > 0,
      })
    } catch (error) {
      setValidationErrors({ general: 'Failed to save family members. Please try again.' })
    }
  }

  // Handle drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderFamilyMembers(draggedIndex, index)
      setDraggedIndex(index)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading family members...</p>
        </div>
      </div>
    )
  }

  return (
    <GlassCard className="w-full max-w-2xl mx-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <UserGroupIcon className="w-16 h-16 mx-auto mb-4 text-blue-400" />
          <h2 className="text-3xl font-bold text-white mb-2">
            Your Family Members
          </h2>
          <p className="text-white/70">
            Tell us about the people who matter most to you
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {validationErrors.general && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-300">{validationErrors.general}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <AnimatePresence>
            {familyMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-white/5 backdrop-blur-sm rounded-lg p-4 border ${
                  draggedIndex === index
                    ? 'border-blue-500 shadow-lg'
                    : 'border-white/20'
                } cursor-move`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) =>
                          updateFamilyMember(member.id!, { name: e.target.value })
                        }
                        placeholder="Family member's name"
                        className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          validationErrors[`member-${index}-name`]
                            ? 'border-red-500'
                            : 'border-white/30'
                        }`}
                      />
                      {validationErrors[`member-${index}-name`] && (
                        <p className="text-red-400 text-xs mt-1">
                          {validationErrors[`member-${index}-name`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        Relationship
                      </label>
                      <select
                        value={member.relation || ''}
                        onChange={(e) =>
                          updateFamilyMember(member.id!, {
                            relation: e.target.value || null,
                          })
                        }
                        className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select relationship</option>
                        {relationshipOptions.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                            className="bg-gray-800"
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        Age (optional)
                      </label>
                      <input
                        type="number"
                        value={member.age || ''}
                        onChange={(e) =>
                          updateFamilyMember(member.id!, {
                            age: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        placeholder="Age"
                        min="0"
                        max="150"
                        className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          validationErrors[`member-${index}-age`]
                            ? 'border-red-500'
                            : 'border-white/30'
                        }`}
                      />
                      {validationErrors[`member-${index}-age`] && (
                        <p className="text-red-400 text-xs mt-1">
                          {validationErrors[`member-${index}-age`]}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => removeFamilyMember(member.id!)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    aria-label="Remove family member"
                  >
                    <XCircleIcon className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {familyMembers.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <UserGroupIcon className="w-16 h-16 mx-auto mb-4 text-white/30" />
              <p className="text-white/50 mb-4">
                No family members added yet
              </p>
              <ButtonWithSound
                onClick={handleAddMember}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Add Your First Family Member
              </ButtonWithSound>
            </motion.div>
          )}
        </div>

        {familyMembers.length > 0 && familyMembers.length < 10 && (
          <div className="mb-8">
            <ButtonWithSound
              onClick={handleAddMember}
              className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-white transition-all flex items-center justify-center gap-2"
            >
              <PlusCircleIcon className="w-5 h-5" />
              Add Another Family Member
            </ButtonWithSound>
          </div>
        )}

        <div className="flex gap-4">
          {onBack && (
            <ButtonWithSound
              onClick={onBack}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              Back
            </ButtonWithSound>
          )}
          <ButtonWithSound
            onClick={validateAndComplete}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </span>
            ) : familyMembers.length === 0 ? (
              'Skip This Step'
            ) : (
              'Continue'
            )}
          </ButtonWithSound>
        </div>

        {familyMembers.length > 1 && (
          <p className="text-center text-white/50 text-sm mt-4">
            Drag and drop to reorder family members
          </p>
        )}
      </motion.div>
    </GlassCard>
  )
}