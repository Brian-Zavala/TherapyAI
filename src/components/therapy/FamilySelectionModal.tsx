'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/Modal'
import { Users, User, Check } from 'lucide-react'

interface FamilyMember {
  name: string
  age: number
  relation: string
}

interface FamilySelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectMembers: (members: FamilyMember[]) => void
  familyMembers: FamilyMember[]
  isLoading?: boolean
  minSelection?: number
  maxSelection?: number
}

export const FamilySelectionModal: React.FC<FamilySelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectMembers,
  familyMembers,
  isLoading = false,
  minSelection = 1,
  maxSelection = 6
}) => {
  const [selectedMembers, setSelectedMembers] = useState<FamilyMember[]>([])

  const toggleMember = (member: FamilyMember) => {
    if (isLoading) return

    const isSelected = selectedMembers.some(
      m => m.name === member.name && m.relation === member.relation
    )

    if (isSelected) {
      setSelectedMembers(selectedMembers.filter(
        m => !(m.name === member.name && m.relation === member.relation)
      ))
    } else if (selectedMembers.length < maxSelection) {
      setSelectedMembers([...selectedMembers, member])
    }
  }

  const handleConfirm = () => {
    if (selectedMembers.length >= minSelection && !isLoading) {
      onSelectMembers(selectedMembers)
      setSelectedMembers([]) // Reset for next time
    }
  }

  const handleClose = () => {
    setSelectedMembers([])
    onClose()
  }

  const isMemberSelected = (member: FamilyMember) => {
    return selectedMembers.some(
      m => m.name === member.name && m.relation === member.relation
    )
  }

  const getRelationIcon = (relation: string) => {
    if (relation.toLowerCase().includes('child') || relation.toLowerCase().includes('son') || relation.toLowerCase().includes('daughter')) {
      return <User className="w-4 h-4" />
    }
    return <Users className="w-4 h-4" />
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Select Family Members">
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Select family members to include in this session.</p>
          {minSelection > 0 && (
            <p className="mt-1">
              Select at least {minSelection} member{minSelection > 1 ? 's' : ''}.
              {maxSelection && ` Maximum ${maxSelection} members.`}
            </p>
          )}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {familyMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No family members configured.</p>
              <p className="text-sm mt-2">Add family members in your profile settings.</p>
            </div>
          ) : (
            familyMembers.map((member, index) => (
              <button
                key={`${member.name}-${member.relation}-${index}`}
                onClick={() => toggleMember(member)}
                disabled={isLoading || (!isMemberSelected(member) && selectedMembers.length >= maxSelection)}
                className={`
                  w-full p-3 rounded-lg border-2 transition-all flex items-center space-x-3
                  ${isMemberSelected(member)
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : isLoading || selectedMembers.length >= maxSelection
                    ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                  }
                `}
              >
                <div className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                  ${isMemberSelected(member)
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}>
                  {isMemberSelected(member) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                
                <div className="flex-1 flex items-center space-x-2">
                  {getRelationIcon(member.relation)}
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {member.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {member.relation} • Age {member.age}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {familyMembers.length > 0 && (
          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || selectedMembers.length < minSelection}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Starting...' : `Start with ${selectedMembers.length} member${selectedMembers.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}