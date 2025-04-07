'use client';

import React from 'react';
import Image from 'next/image';

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
    description: 'Build a healthier relationship with guided support, improved communication techniques, and conflict resolution strategies tailored for couples.',
    therapist: 'Dr. Maya Thompson',
    imageUrl: '/images/dr-maya-thompson.jpg',
  },
  {
    id: 'solo',
    type: 'solo',
    title: 'Individual Therapy',
    description: 'Embark on a journey of personal growth and emotional wellbeing with confidential, one-on-one therapeutic guidance for your unique challenges.',
    therapist: 'Dr. Elliot Mackaphy',
    imageUrl: '/images/dr-elliot-mackaphy.jpg',
  },
  {
    id: 'family',
    type: 'family',
    title: 'Family Therapy',
    description: 'Strengthen family bonds, improve communication patterns, and create healthier dynamics between all family members in a collaborative setting.',
    therapist: 'Dr. Jada Pearson',
    imageUrl: '/images/dr-jada-pearson.jpg',
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
        className="bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-indigo-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">Choose Your Therapist</h2>
              <div className="h-1 w-48 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mt-2"></div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 focus:outline-none transition-all duration-200 hover:scale-110"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <p className="text-gray-600 mb-8 max-w-2xl">
            Select your preferred therapist and therapy type that best meets your current needs.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {therapyOptions.map((option) => (
              <div
                key={option.id}
                className="bg-gradient-to-br from-white to-indigo-50 border border-indigo-100 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.03] hover:border-indigo-200 cursor-pointer overflow-hidden flex flex-col"
                onClick={() => {
                  onSelect(option.type);
                  onClose();
                }}
              >
                <div className="w-full h-36 bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {option.type === 'couple' ? (
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      ) : option.type === 'solo' ? (
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white text-center px-4">
                      {option.title}
                    </h3>
                  </div>
                </div>
                
                <div className="p-5 flex-grow flex flex-col">
                  <p className="text-gray-600 mb-6 flex-grow">
                    {option.description}
                  </p>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 p-1 mb-3 border-2 border-indigo-200 shadow-md overflow-hidden">
                      {/* 
                        IMPORTANT: To use AI-generated doctor images:
                        1. Create the following files in the /public/images/ directory:
                           - dr-maya-thompson.jpg (for couples therapy)
                           - dr-elliot-mackaphy.jpg (for individual therapy)
                           - dr-jada-pearson.jpg (for family therapy)
                        2. Make sure the images are square (1:1 aspect ratio) for best results
                      */}
                      <div className="w-full h-full rounded-full bg-white overflow-hidden relative">
                        {/* Simple img element for doctor photo */}
                        <img 
                          src={option.imageUrl}
                          alt={`Photo of ${option.therapist}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // If image fails to load, hide it and show fallback
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            // Show fallback icon (just set as a background before generating)
                            const fallbackId = `selector-fallback-${option.id}`;
                            const fallback = document.getElementById(fallbackId);
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                        
                        {/* Fallback icon - initially hidden */}
                        <div 
                          id={`selector-fallback-${option.id}`}
                          className="w-full h-full rounded-full bg-white absolute inset-0 items-center justify-center"
                          style={{ display: 'none' }}
                        >
                          <svg className="w-10 h-10 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                    <h4 className="font-bold text-lg mb-1 text-indigo-700">{option.therapist}</h4>
                    <span className="text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      {option.type === 'couple' ? 'AI Relationship Therapist' :
                       option.type === 'solo' ? 'AI Personal Therapist' : 'AI Family Therapist'}
                    </span>
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