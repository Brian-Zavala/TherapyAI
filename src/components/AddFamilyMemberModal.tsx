'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus } from 'lucide-react';
import { createPortal } from 'react-dom';

interface AddFamilyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (member: { name: string; age: string; relationship: string }) => void;
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
  const [relationship, setRelationship] = useState('');
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setAge('');
      setRelationship('');
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

    onAdd({ name: name.trim(), age: age.trim(), relationship: relationship.trim() });
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
            className="fixed inset-0 z-[10001] flex items-center justify-center p-3 sm:p-4 overflow-x-hidden"
          >
            <div
              className="relative w-full max-w-md bg-gradient-to-br from-gray-900/95 via-slate-800/95 to-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative px-6 py-6 border-b border-gray-600/30">
                <button
                  onClick={onClose}
                  className="absolute top-3 sm:p-4 right-4 p-2 rounded-full bg-gray-800/60 hover:bg-gray-700/80 transition-colors cursor-pointer duration-200 border border-gray-600/50"
                >
                  <X className="w-4 h-4 text-gray-300" />
                </button>
                
                <div className="flex items-center gap-2 sm:gap-3">
                  <UserPlus className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Add Family Member</h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-300 text-sm sm:text-base sm:text-lg">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm sm:text-base sm:text-lg font-medium text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter family member's name"
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-colors cursor-pointer"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-base sm:text-lg font-medium text-gray-300 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter age (optional)"
                    min="0"
                    max="120"
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-colors cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-base sm:text-lg font-medium text-gray-300 mb-2">
                    Relationship
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-colors cursor-pointer"
                  >
                    <option value="" className="bg-gray-800">Select relationship</option>
                    
                    <optgroup label="Children" className="bg-gray-900">
                      <option value="Son" className="bg-gray-800">Son</option>
                      <option value="Daughter" className="bg-gray-800">Daughter</option>
                      <option value="Stepson" className="bg-gray-800">Stepson</option>
                      <option value="Stepdaughter" className="bg-gray-800">Stepdaughter</option>
                      <option value="Adopted Son" className="bg-gray-800">Adopted Son</option>
                      <option value="Adopted Daughter" className="bg-gray-800">Adopted Daughter</option>
                      <option value="Foster Son" className="bg-gray-800">Foster Son</option>
                      <option value="Foster Daughter" className="bg-gray-800">Foster Daughter</option>
                    </optgroup>
                    
                    <optgroup label="Parents" className="bg-gray-900">
                      <option value="Father" className="bg-gray-800">Father</option>
                      <option value="Mother" className="bg-gray-800">Mother</option>
                      <option value="Stepfather" className="bg-gray-800">Stepfather</option>
                      <option value="Stepmother" className="bg-gray-800">Stepmother</option>
                      <option value="Adoptive Father" className="bg-gray-800">Adoptive Father</option>
                      <option value="Adoptive Mother" className="bg-gray-800">Adoptive Mother</option>
                      <option value="Foster Father" className="bg-gray-800">Foster Father</option>
                      <option value="Foster Mother" className="bg-gray-800">Foster Mother</option>
                    </optgroup>
                    
                    <optgroup label="Grandparents" className="bg-gray-900">
                      <option value="Grandfather" className="bg-gray-800">Grandfather</option>
                      <option value="Grandmother" className="bg-gray-800">Grandmother</option>
                      <option value="Paternal Grandfather" className="bg-gray-800">Paternal Grandfather</option>
                      <option value="Paternal Grandmother" className="bg-gray-800">Paternal Grandmother</option>
                      <option value="Maternal Grandfather" className="bg-gray-800">Maternal Grandfather</option>
                      <option value="Maternal Grandmother" className="bg-gray-800">Maternal Grandmother</option>
                      <option value="Step-Grandfather" className="bg-gray-800">Step-Grandfather</option>
                      <option value="Step-Grandmother" className="bg-gray-800">Step-Grandmother</option>
                    </optgroup>
                    
                    <optgroup label="Grandchildren" className="bg-gray-900">
                      <option value="Grandson" className="bg-gray-800">Grandson</option>
                      <option value="Granddaughter" className="bg-gray-800">Granddaughter</option>
                      <option value="Step-Grandson" className="bg-gray-800">Step-Grandson</option>
                      <option value="Step-Granddaughter" className="bg-gray-800">Step-Granddaughter</option>
                    </optgroup>
                    
                    <optgroup label="Siblings" className="bg-gray-900">
                      <option value="Brother" className="bg-gray-800">Brother</option>
                      <option value="Sister" className="bg-gray-800">Sister</option>
                      <option value="Stepbrother" className="bg-gray-800">Stepbrother</option>
                      <option value="Stepsister" className="bg-gray-800">Stepsister</option>
                      <option value="Half-Brother" className="bg-gray-800">Half-Brother</option>
                      <option value="Half-Sister" className="bg-gray-800">Half-Sister</option>
                      <option value="Adopted Brother" className="bg-gray-800">Adopted Brother</option>
                      <option value="Adopted Sister" className="bg-gray-800">Adopted Sister</option>
                      <option value="Foster Brother" className="bg-gray-800">Foster Brother</option>
                      <option value="Foster Sister" className="bg-gray-800">Foster Sister</option>
                    </optgroup>
                    
                    <optgroup label="In-Laws" className="bg-gray-900">
                      <option value="Father-in-Law" className="bg-gray-800">Father-in-Law</option>
                      <option value="Mother-in-Law" className="bg-gray-800">Mother-in-Law</option>
                      <option value="Son-in-Law" className="bg-gray-800">Son-in-Law</option>
                      <option value="Daughter-in-Law" className="bg-gray-800">Daughter-in-Law</option>
                      <option value="Brother-in-Law" className="bg-gray-800">Brother-in-Law</option>
                      <option value="Sister-in-Law" className="bg-gray-800">Sister-in-Law</option>
                    </optgroup>
                    
                    <optgroup label="Extended Family" className="bg-gray-900">
                      <option value="Uncle" className="bg-gray-800">Uncle</option>
                      <option value="Aunt" className="bg-gray-800">Aunt</option>
                      <option value="Nephew" className="bg-gray-800">Nephew</option>
                      <option value="Niece" className="bg-gray-800">Niece</option>
                      <option value="Cousin" className="bg-gray-800">Cousin</option>
                      <option value="Great-Grandfather" className="bg-gray-800">Great-Grandfather</option>
                      <option value="Great-Grandmother" className="bg-gray-800">Great-Grandmother</option>
                      <option value="Great-Uncle" className="bg-gray-800">Great-Uncle</option>
                      <option value="Great-Aunt" className="bg-gray-800">Great-Aunt</option>
                    </optgroup>
                    
                    <optgroup label="Other Relationships" className="bg-gray-900">
                      <option value="Guardian" className="bg-gray-800">Guardian</option>
                      <option value="Ward" className="bg-gray-800">Ward</option>
                      <option value="Godfather" className="bg-gray-800">Godfather</option>
                      <option value="Godmother" className="bg-gray-800">Godmother</option>
                      <option value="Godson" className="bg-gray-800">Godson</option>
                      <option value="Goddaughter" className="bg-gray-800">Goddaughter</option>
                      <option value="Ex-Spouse" className="bg-gray-800">Ex-Spouse</option>
                      <option value="Co-Parent" className="bg-gray-800">Co-Parent</option>
                      <option value="Other Family Member" className="bg-gray-800">Other Family Member</option>
                      <option value="Other" className="bg-gray-800">Other</option>
                    </optgroup>
                  </select>
                </div>

                <div className="flex gap-2 sm:gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-700/30 hover:border-gray-500/60 transition-all cursor-pointer duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all cursor-pointer duration-200 font-medium"
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