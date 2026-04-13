'use client';

import { motion } from 'framer-motion';
import { CheckCircle, User, Trash2 } from 'lucide-react';
import { memo } from 'react';
import { formatRelationLabel } from '@/lib/utils';

interface FamilyMember {
  name: string;
  age: number;
  relationship: string;
}

interface FamilyMemberCardProps {
  member: FamilyMember;
  index: number;
  isSelected: boolean;
  onToggleSelect: (index: number) => void;
  onRemoveRequest: (index: number) => void;
  isLoading: boolean;
}

const FamilyMemberCard = memo(({
  member,
  index,
  isSelected,
  onToggleSelect,
  onRemoveRequest,
  isLoading
}: FamilyMemberCardProps) => {
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveRequest(index);
  };

  const getCardStyle = () => {
    if (isSelected) {
      return 'border-green-400/60 bg-blue-600 shadow-xl shadow-green-500/10';
    }
    return 'border-gray-600/40 bg-blue-600 hover:border-gray-500/60 hover:shadow-lg hover:shadow-blue-500/10';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${getCardStyle()}`}
      onClick={() => onToggleSelect(index)}
    >
      {/* Action Buttons */}
      <div className="absolute top-1 right-2">
        {/* Remove Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleRemoveClick}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-xs transition-all duration-200 bg-gray-700/50 text-gray-400 hover:bg-red-500/20 hover:text-red-300"
          title="Remove from profile"
        >
          <Trash2 className="w-3 h-3" />
        </motion.button>
      </div>


      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isSelected
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-700/50 text-gray-400'
          }`}>
            <User className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white">
              {member.name}
            </h4>
            <p className="text-sm text-gray-300">
              {formatRelationLabel(member.relationship)}, {member.age} years old
            </p>
          </div>
        </div>
        
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          isSelected
            ? 'border-green-400 bg-green-500'
            : 'border-gray-500'
        }`}>
          {isSelected && (
            <CheckCircle className="w-3 h-3 text-white" />
          )}
        </div>
      </div>

    </motion.div>
  );
});

FamilyMemberCard.displayName = 'FamilyMemberCard';

export default FamilyMemberCard;