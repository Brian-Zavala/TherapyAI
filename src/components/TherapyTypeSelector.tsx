'use client';

import React from 'react';

type TherapyType = 'couple' | 'solo' | 'family';

interface TherapyOption {
  id: string;
  type: TherapyType;
  title: string;
  description: string;
  therapist: string;
  imageUrl?: string;
}

const therapyOptions: TherapyOption[] = [
  {
    id: 'couple',
    type: 'couple',
    title: 'Couples Therapy',
    description: 'Work on your relationship together with guided support and structured communication techniques.',
    therapist: 'Dr. Maya Thompson',
    imageUrl: '/images/couple-therapy.jpg',
  },
  {
    id: 'solo',
    type: 'solo',
    title: 'Individual Therapy',
    description: 'Focus on your personal growth, mental health, and individual challenges in a private setting.',
    therapist: 'Dr. Elliot Mackaphy',
    imageUrl: '/images/solo-therapy.jpg',
  },
  {
    id: 'family',
    type: 'family',
    title: 'Family Therapy',
    description: 'Improve family dynamics, resolve conflicts, and strengthen bonds between family members.',
    therapist: 'Dr. Jada Pearson',
    imageUrl: '/images/family-therapy.jpg',
  },
];

interface TherapyTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: TherapyType) => void;
}

export default function TherapyTypeSelector({ isOpen, onClose, onSelect }: TherapyTypeSelectorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-indigo-800">Choose Your Therapy Session</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <p className="text-gray-600 mb-8">
            Select the type of therapy session that best meets your current needs.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {therapyOptions.map((option) => (
              <div
                key={option.id}
                className="bg-gradient-to-br from-white to-indigo-50 border border-indigo-100 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden flex flex-col"
                onClick={() => {
                  onSelect(option.type);
                  onClose();
                }}
              >
                {option.imageUrl ? (
                  <div className="w-full h-40 relative bg-gradient-to-br from-indigo-600 to-purple-600">
                    <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center">
                      <h3 className="text-xl font-bold text-white text-center px-4 shadow-text">
                        {option.title}
                      </h3>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                    <h3 className="text-xl font-bold text-white text-center px-4">
                      {option.title}
                    </h3>
                  </div>
                )}
                
                <div className="p-5 flex-grow flex flex-col">
                  <p className="text-gray-600 mb-4 flex-grow">
                    {option.description}
                  </p>
                  <div className="flex items-center text-indigo-700">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <span className="font-medium">{option.therapist}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}