'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
            onClick={onClose}
          />
          
          {/* Modal Container - Centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          >
            <div 
              className="relative bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-2xl md:max-w-4xl max-h-[85vh] overflow-y-auto border border-indigo-100"
              onClick={(e) => e.stopPropagation()}
            >
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex justify-center items-center mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent text-center">Choose Your Therapist</h2>
              <div className="h-1 bg-gradient-to-r from-blue-500/10 via-blue-300/80 to-transparent rounded-full mt-2"></div>
            </div>
          </div>
          <div className="mb-6 sm:mb-8">
            <p className="text-sm sm:text-base text-gray-600 text-center max-w-2xl mx-auto">
              Select your therapist and therapy type that best meets your current needs.
            </p>
          </div>
          
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {therapyOptions.map((option, index) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-br from-white to-indigo-50 border border-indigo-100 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:border-indigo-200 cursor-pointer overflow-hidden flex flex-col h-full"
                onClick={() => {
                  onSelect(option.type);
                }}
              >
                <div className="w-full h-28 sm:h-32 md:h-36 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
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
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-white text-center px-2 sm:px-4">
                      {option.title}
                    </h3>
                  </div>
                </div>
                
                <div className="p-4 sm:p-5 flex-grow flex flex-col">
                  <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 flex-grow">
                    {option.description}
                  </p>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-500/10 p-1 mb-2 sm:mb-3 border-2 border-blue-500/10 shadow-md overflow-hidden">
                    
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
                    <h4 className="font-bold text-base sm:text-lg mb-1 text-blue-500">{option.therapist}</h4>
                    <span className="text-sm bg-blue-500/85 text-white px-3 py-1 rounded-full font-medium">
                      {option.type === 'couple' ? 'AI Relationship Therapist' :
                       option.type === 'solo' ? 'AI Personal Therapist' : 'AI Family Therapist'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Render portal only on client side
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