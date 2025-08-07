"use client";

import React, { useState, useEffect, memo } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type TherapyType = "couple" | "solo" | "family";

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
    id: "couple",
    type: "couple",
    title: "Couples Therapy",
    description:
      "Build a healthier relationship with guided support, improved communication techniques, and conflict resolution strategies tailored for couples.",
    therapist: "Dr. Maya Thompson",
    imageUrl: "/videos/maya_profile.mp4",
  },
  {
    id: "solo",
    type: "solo",
    title: "Individual Therapy",
    description:
      "Embark on a journey of personal growth and emotional wellbeing with confidential, one-on-one therapeutic guidance for your unique challenges.",
    therapist: "Dr. Elliot Mackaphy",
    imageUrl: "/videos/ian_profile.mp4",
  },
  {
    id: "family",
    type: "family",
    title: "Family Therapy",
    description:
      "Strengthen family bonds, improve communication patterns, and create healthier dynamics between all family members in a collaborative setting.",
    therapist: "Dr. Jada Pearson",
    imageUrl: "/videos/jada_profile.mp4",
  },
];

interface TherapyTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: TherapyType) => void;
  hasFamilyMembers?: boolean;
  familyMembersLoading?: boolean;
  hasPartner?: boolean;
  profileLoading?: boolean;
  currentTherapyType?: TherapyType | null;
}

export default function TherapyTypeSelector({
  isOpen,
  onClose,
  onSelect,
  hasFamilyMembers = true,
  familyMembersLoading = false,
  hasPartner = true,
  profileLoading = false,
  currentTherapyType = null,
}: TherapyTypeSelectorProps) {
  const [isClient, setIsClient] = useState(false);
  const [showFamilyTooltip, setShowFamilyTooltip] = useState(false);
  const [familyCardTapped, setFamilyCardTapped] = useState(false);
  const [showCoupleTooltip, setShowCoupleTooltip] = useState(false);
  const [coupleCardTapped, setCoupleCardTapped] = useState(false);
  const router = useRouter();

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log("[TherapyTypeSelector] Props:", {
        hasFamilyMembers,
        familyMembersLoading,
        hasPartner,
        profileLoading,
        currentTherapyType,
      });
      console.log("[TherapyTypeSelector] Should show close button:", !!currentTherapyType);
    }
  }, [
    isOpen,
    hasFamilyMembers,
    familyMembersLoading,
    hasPartner,
    profileLoading,
    currentTherapyType,
  ]);

  // Debug tooltip state changes (only logs when states actually change)
  useEffect(() => {
    if (isOpen && (showFamilyTooltip || familyCardTapped)) {
      console.log("[TherapyTypeSelector] family tooltip state changed:", {
        isDisabled: !hasFamilyMembers && !familyMembersLoading,
        showTooltip: showFamilyTooltip || familyCardTapped,
        hoverState: showFamilyTooltip,
        tapState: familyCardTapped,
      });
    }
  }, [
    isOpen,
    showFamilyTooltip,
    familyCardTapped,
    hasFamilyMembers,
    familyMembersLoading,
  ]);

  useEffect(() => {
    if (isOpen && (showCoupleTooltip || coupleCardTapped)) {
      console.log("[TherapyTypeSelector] couple tooltip state changed:", {
        isDisabled: !hasPartner && !profileLoading,
        showTooltip: showCoupleTooltip || coupleCardTapped,
        hoverState: showCoupleTooltip,
        tapState: coupleCardTapped,
      });
    }
  }, [isOpen, showCoupleTooltip, coupleCardTapped, hasPartner, profileLoading]);

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
              className="relative bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-2xl md:max-w-4xl max-h-[85vh] overflow-y-auto border border-indigo-100 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button - always visible */}
              <button
                onClick={onClose}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 p-2 rounded-lg bg-white hover:bg-gray-100 shadow-md transition-all duration-200 group"
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5 text-gray-600 group-hover:text-gray-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              
              <div className="p-4 sm:p-6 md:p-8">
                
                <div className="flex justify-center items-center mb-6 sm:mb-8">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent text-center">
                      Choose Your Therapist
                    </h2>
                    <div className="h-1 bg-gradient-to-r from-blue-500/10 via-blue-300/80 to-transparent rounded-full mt-2"></div>
                  </div>
                </div>
                <div className="mb-6 sm:mb-8">
                  <p className="text-sm sm:text-base text-gray-600 text-center max-w-2xl mx-auto">
                    {currentTherapyType ? (
                      <>
                        Currently selected: <span className="font-semibold text-blue-600">
                          {currentTherapyType === 'couple' ? 'Dr. Maya Thompson' :
                           currentTherapyType === 'solo' ? 'Dr. Elliot Mackaphy' :
                           'Dr. Jada Pearson'}
                        </span>. Choose a different therapist below.
                      </>
                    ) : (
                      "Select your therapist and therapy type that best meets your current needs."
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {therapyOptions.map((option, index) => {
                    const isFamilyLoading =
                      option.type === "family" && familyMembersLoading;
                    const isCoupleLoading =
                      option.type === "couple" && profileLoading;
                    const isLoading = isFamilyLoading || isCoupleLoading;

                    const isFamilyDisabled =
                      option.type === "family" &&
                      !hasFamilyMembers &&
                      !familyMembersLoading;
                    const isCoupleDisabled =
                      option.type === "couple" &&
                      !hasPartner &&
                      !profileLoading;
                    const isDisabled = isFamilyDisabled || isCoupleDisabled;

                    const showTooltip =
                      (option.type === "family" &&
                        (showFamilyTooltip || familyCardTapped) &&
                        isFamilyDisabled) ||
                      (option.type === "couple" &&
                        (showCoupleTooltip || coupleCardTapped) &&
                        isCoupleDisabled);

                    // Debug tooltip state moved to useEffect to prevent excessive logging

                    return (
                      <motion.div
                        key={option.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={
                          !isDisabled && !isLoading ? { scale: 1.02 } : {}
                        }
                        whileTap={
                          !isDisabled && !isLoading ? { scale: 0.98 } : {}
                        }
                        className={`${
                          isDisabled
                            ? "bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 opacity-60 cursor-not-allowed"
                            : isLoading
                              ? "bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 cursor-wait"
                              : currentTherapyType === option.type
                                ? "bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 shadow-xl cursor-pointer ring-2 ring-blue-200"
                                : "bg-gradient-to-br from-white to-indigo-50 border border-indigo-100 hover:shadow-xl hover:border-indigo-200 cursor-pointer"
                        } rounded-xl shadow-md transition-all duration-300 flex flex-col h-full relative`}
                        role="button"
                        tabIndex={isDisabled || isLoading ? -1 : 0}
                        aria-label={`${option.title} with ${option.therapist}${
                          isDisabled
                            ? option.type === "family"
                              ? " - Unavailable: Add family members to your profile first"
                              : option.type === "couple"
                                ? " - Unavailable: Add a partner to your profile first"
                                : " - Unavailable"
                            : isLoading
                              ? " - Loading..."
                              : ""
                        }`}
                        aria-disabled={isDisabled || isLoading}
                        onClick={() => {
                          if (isLoading) {
                            return; // Don't do anything while loading
                          }
                          if (option.type === "family" && !hasFamilyMembers) {
                            setFamilyCardTapped(true);
                            setTimeout(() => setFamilyCardTapped(false), 3000);
                            return;
                          }
                          if (option.type === "couple" && !hasPartner) {
                            setCoupleCardTapped(true);
                            setTimeout(() => setCoupleCardTapped(false), 3000);
                            return;
                          }
                          if (!isDisabled) {
                            onSelect(option.type);
                          }
                        }}
                        onMouseEnter={() => {
                          if (option.type === "family" && !hasFamilyMembers) {
                            setShowFamilyTooltip(true);
                          }
                          if (option.type === "couple" && !hasPartner) {
                            setShowCoupleTooltip(true);
                          }
                        }}
                        onMouseLeave={() => {
                          setShowFamilyTooltip(false);
                          setShowCoupleTooltip(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (isLoading) return;
                            if (option.type === "family" && !hasFamilyMembers) {
                              setFamilyCardTapped(true);
                              setTimeout(
                                () => setFamilyCardTapped(false),
                                3000
                              );
                              return;
                            }
                            if (option.type === "couple" && !hasPartner) {
                              setCoupleCardTapped(true);
                              setTimeout(
                                () => setCoupleCardTapped(false),
                                3000
                              );
                              return;
                            }
                            if (!isDisabled) {
                              onSelect(option.type);
                            }
                          }
                        }}
                      >
                        {/* Current selection indicator */}
                        {currentTherapyType === option.type && !isDisabled && !isLoading && (
                          <div className="absolute top-2 right-2 z-20">
                            <div className="bg-blue-500 text-white rounded-full p-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="3"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          </div>
                        )}

                        {/* Loading overlay */}
                        {isLoading && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-xl">
                            <div className="bg-white rounded-full p-3">
                              <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                            </div>
                          </div>
                        )}

                        {/* Disabled overlay with lock icon */}
                        {isDisabled && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 rounded-xl">
                            <div className="bg-white/90 rounded-full p-3">
                              <svg
                                className="w-8 h-8 text-gray-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            </div>
                          </div>
                        )}

                        {/* Tooltip/Feedback Message */}
                        <AnimatePresence>
                          {showTooltip && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-2 left-2 right-2 z-[10002]"
                              style={{ pointerEvents: "auto" }}
                            >
                              <div className="bg-gray-900/95 text-white px-4 py-3 rounded-lg shadow-xl text-sm backdrop-blur-sm border border-gray-700">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium mb-1">
                                      {option.type === "family"
                                        ? "Add family members to your profile first"
                                        : "Add a partner to your profile first"}
                                    </p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push("/dashboard/profile");
                                      }}
                                      className="text-blue-300 hover:text-blue-200 underline text-xs font-medium inline-flex items-center gap-1"
                                    >
                                      Go to Profile Settings
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M9 5l7 7-7 7"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowFamilyTooltip(false);
                                      setShowCoupleTooltip(false);
                                      setFamilyCardTapped(false);
                                      setCoupleCardTapped(false);
                                    }}
                                    className="text-gray-400 hover:text-white transition-colors"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div
                          className={`w-full h-28 sm:h-32 md:h-36 ${
                            isDisabled
                              ? "bg-gradient-to-br from-gray-400 to-gray-600"
                              : isLoading
                                ? "bg-gradient-to-br from-gray-300 to-gray-500"
                                : "bg-gradient-to-br from-blue-400 to-blue-600"
                          } flex items-center justify-center`}
                        >
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                              {option.type === "couple" ? (
                                <svg
                                  className="h-7 w-7 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                  />
                                </svg>
                              ) : option.type === "solo" ? (
                                <svg
                                  className="h-7 w-7 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="h-7 w-7 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                  />
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
                                <video
                                  src={option.imageUrl}
                                  className="w-full h-full object-cover"
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  onError={(e) => {
                                    const target = e.target as HTMLVideoElement;
                                    target.style.display = "none";
                                    const fallbackId = `selector-fallback-${option.id}`;
                                    const fallback = document.getElementById(fallbackId);
                                    if (fallback) {
                                      fallback.style.display = "flex";
                                    }
                                  }}
                                />

                                {/* Fallback icon - initially hidden */}
                                <div
                                  id={`selector-fallback-${option.id}`}
                                  className="w-full h-full rounded-full bg-white absolute inset-0 items-center justify-center"
                                  style={{ display: "none" }}
                                >
                                  <svg
                                    className="w-10 h-10 text-indigo-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="1.5"
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    ></path>
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <h4 className="font-bold text-base sm:text-lg mb-1 text-blue-500">
                              {option.therapist}
                            </h4>
                            <span className="text-sm bg-blue-500/85 text-white px-3 py-1 rounded-full font-medium">
                              {option.type === "couple"
                                ? "AI Relationship Therapist"
                                : option.type === "solo"
                                  ? "AI Personal Therapist"
                                  : "AI Family Therapist"}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
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
