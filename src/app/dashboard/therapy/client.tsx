"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { TherapyButtonWrapper as TherapyButton } from "@/components/TherapyButtonWrapper";
import TherapyTypeSelector from "@/components/TherapyTypeSelector";
import DigitalClock from "@/components/DigitalClock";
import UnifiedSessionModal, { SessionModalMode } from "@/components/UnifiedSessionModal";
import { useTherapySessionRecovery } from "@/hooks/useTherapySessionRecovery";
import { motion, AnimatePresence } from "framer-motion";
import type { TherapyType } from "@/types/therapy-session";
import {
  COUPLE_THERAPY_ASSISTANT_CONFIG,
  INDIVIDUAL_THERAPY_ASSISTANT_CONFIG,
  FAMILY_THERAPY_ASSISTANT_CONFIG,
} from "@/lib/vapi";
import { useProfile } from "@/providers/ProfileProvider";
import { isSessionActive as checkSessionActive } from "@/lib/utils/session-status";
import { useFamilyMembersEnhanced } from "@/hooks/useFamilyMembersEnhanced";

export default function TherapyPageClient({ userId }: { userId: string }) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const { profile } = useProfile();
  
  // Family members hook
  const { familyMembers, loading: familyMembersLoading } = useFamilyMembersEnhanced({ autoSave: false });
  
  // Session recovery hook - only runs on therapy page
  const { isChecking: isCheckingForSession, hasActiveSession, shouldAutoRestart } = useTherapySessionRecovery();
  
  // Track if initial check is complete
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  
  // Add minimum wait time for session check to prevent UI flash
  const [minimumWaitComplete, setMinimumWaitComplete] = useState(false);
  
  // Clean up any stale recovery data on component mount (prevents HMR issues)
  useEffect(() => {
    const cleanupStaleRecoveryData = () => {
      try {
        // During development, Fast Refresh can leave stale data
        // Only clean up if we're not actively in a session and data is old
        const hasActiveSession = document.body.classList.contains('session-active')
        if (!hasActiveSession) {
          const staleKeys = ['session-recovery-pending', 'session-continue-trigger']
          staleKeys.forEach(key => {
            const value = sessionStorage.getItem(key)
            if (value) {
              try {
                const data = JSON.parse(value)
                const dataAge = Date.now() - new Date(data.recoveredAt || data.timestamp || 0).getTime()
                // Only clean up if data is older than 60 seconds
                if (dataAge > 60000) {
                  console.log(`🧹 Cleaning up stale recovery data: ${key} (age: ${Math.round(dataAge/1000)}s)`)
                  sessionStorage.removeItem(key)
                }
              } catch {
                // If can't parse, it's likely corrupted, so remove it
                console.log(`🧹 Cleaning up corrupted recovery data: ${key}`)
                sessionStorage.removeItem(key)
              }
            }
          })
        }
      } catch (error) {
        console.warn('Error cleaning up stale recovery data:', error)
      }
    }
    
    // Small delay to allow other components to initialize first
    const timer = setTimeout(cleanupStaleRecoveryData, 100)
    return () => clearTimeout(timer)
  }, []) // Only run once on mount

  // currentTime state removed - no longer needed with DigitalClock component
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [selectedAssistant, setSelectedAssistant] = useState<typeof COUPLE_THERAPY_ASSISTANT_CONFIG | null>(null); // Don't default to any specific therapist
  
  // Unified session modal state
  const [sessionModalMode, setSessionModalMode] = useState<SessionModalMode>(null);
  const [recoverySessionData, setRecoverySessionData] = useState<any>(null);
  const [conflictSessionData, setConflictSessionData] = useState<any>(null);
  
  // Effect to detect recovery sessions and set modal mode
  useEffect(() => {
    const checkForRecoverySession = () => {
      const pendingRecovery = sessionStorage.getItem('session-recovery-pending');
      if (pendingRecovery) {
        try {
          const data = JSON.parse(pendingRecovery);
          console.log('🔔 Recovery session detected, setting unified modal to recovery mode');
          setRecoverySessionData(data);
          setSessionModalMode('recovery');
        } catch (error) {
          console.error('Error parsing recovery data:', error);
          sessionStorage.removeItem('session-recovery-pending');
        }
      }
    };
    
    // Check immediately
    checkForRecoverySession();
    
    // Listen for storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'session-recovery-pending' && e.newValue) {
        checkForRecoverySession();
      }
    };
    
    // Listen for custom events
    const handleCustomEvent = () => {
      checkForRecoverySession();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('session-recovery-ready', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('session-recovery-ready', handleCustomEvent);
    };
  }, []);

  // Track when initial session check is complete with minimum wait time
  useEffect(() => {
    if (!isCheckingForSession && !initialCheckComplete) {
      // 2025 Standard: Only log in debug mode
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_SESSION === 'true') {
        console.log('🔍 Initial session check complete');
      }
      setInitialCheckComplete(true);
    }
  }, [isCheckingForSession, initialCheckComplete]);
  
  // Ensure minimum wait time before showing UI (prevents flash)
  useEffect(() => {
    const timer = setTimeout(() => {
      // 2025 Standard: Only log in debug mode
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_SESSION === 'true') {
        console.log('⏱️ Minimum wait time complete');
      }
      setMinimumWaitComplete(true);
    }, 1500); // Wait 1.5 seconds minimum to allow recovery modal to catch up
    
    return () => clearTimeout(timer);
  }, []);

  // Show therapy type selector when no active session is found - let USER choose, don't default
  useEffect(() => {
    // Wait for BOTH initial check AND minimum wait time to prevent UI flash
    if (initialCheckComplete && minimumWaitComplete && !isCheckingForSession && !selectedAssistant && !sessionType) {
      // Check if there's pending recovery data that modal should handle
      const checkRecoveryData = () => {
        const pendingRecovery = sessionStorage.getItem('session-recovery-pending');
        const recoveryInProgress = sessionStorage.getItem('recovery-check-in-progress');
        
        if (pendingRecovery || recoveryInProgress === 'true') {
          // Don't show type selector, let the modal handle recovery
          return true;
        }
        return false;
      };
      
      // Check immediately
      if (checkRecoveryData()) {
        return;
      }
      
      // If no recovery data and no active session, wait a bit more then show selector
      if (!hasActiveSession) {
        // Give the modal extra time to detect recovery data (up to 2 seconds total)
        // Reduced frequency to avoid performance issues
        const checkInterval = setInterval(() => {
          if (checkRecoveryData()) {
            clearInterval(checkInterval);
            return;
          }
        }, 500); // Check every 500ms instead of 100ms
        
        // After 2 seconds, if still no recovery data, show the type selector
        const timeout = setTimeout(() => {
          clearInterval(checkInterval);
          const finalCheck = sessionStorage.getItem('session-recovery-pending');
          if (!finalCheck && !hasActiveSession) {
            console.log('📝 No active session found after extended check, showing therapy type selector for user to choose');
            // CRITICAL: Don't set any defaults - let the user choose their therapy type
            // The therapist will be set in handleSelectTherapyType when user makes their choice
            setShowTypeSelector(true);
          }
        }, 2000);
        
        return () => {
          clearInterval(checkInterval);
          clearTimeout(timeout);
        };
      }
    }
  }, [initialCheckComplete, minimumWaitComplete, isCheckingForSession, hasActiveSession, selectedAssistant, sessionType]);
  
  // CRITICAL FIX: Only show therapist selector AFTER checking for active sessions
  // This prevents the modal from appearing before session recovery
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  // Countdown overlay state
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [meditationStep, setMeditationStep] = useState<
    "none" | "countdown" | "breathe" | "begin" | "done"
  >("none");
  // Quick actions menu state
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  // User profile data
  // Remove local userProfile state - now using ProfileProvider
  const userProfile = profile;
  const [_unusedUserProfile, _setUnusedUserProfile] = useState<{
    name?: string;
    partnerName?: string;
    familyMember1?: string;
    familyMember1Age?: number;
    familyMember1Relation?: string;
    familyMember2?: string;
    familyMember2Age?: number;
    familyMember2Relation?: string;
    familyMember3?: string;
    familyMember3Age?: number;
    familyMember3Relation?: string;
    familyMember4?: string;
    familyMember4Age?: number;
    familyMember4Relation?: string;
    familyMember5?: string;
    familyMember5Age?: number;
    familyMember5Relation?: string;
    familyMember6?: string;
    familyMember6Age?: number;
    familyMember6Relation?: string;
    familyMember7?: string;
    familyMember7Age?: number;
    familyMember7Relation?: string;
  }>({});

  // Digital clock state removed - now using DigitalClock component

  // Removed - now using ProfileProvider

  // Update time function removed - now handled by DigitalClock component

  useEffect(() => {
    const checkActive = () => {
      const hasActiveClass = document.body.classList.contains("session-active");
      setIsSessionActive(hasActiveClass);

      // Hide the type selector when session becomes active
      if (hasActiveClass) {
        setShowTypeSelector(false);
      }
      
      console.log(`🎨 Session active state changed: ${hasActiveClass ? 'ACTIVE (starry night)' : 'INACTIVE (gradient)'}`);
    };

    // Initial check
    checkActive();

    // Watch for class changes on body
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          checkActive();
        }
      });
    });

    observer.observe(document.body, { attributes: true });
    
    // Also listen for custom event
    const handleSessionStateChange = () => {
      console.log('📡 Received sessionStateChanged event')
      checkActive();
    };
    
    window.addEventListener('sessionStateChanged', handleSessionStateChange);

    // Clock updates now handled by DigitalClock component

    return () => {
      observer.disconnect();
      window.removeEventListener('sessionStateChanged', handleSessionStateChange);
    };
  }, []);
  
  // Listen for session ended event to show therapy type selector
  useEffect(() => {
    const handleSessionEnded = () => {
      console.log('🎯 Therapy page received sessionEnded event, showing type selector');
      // Reset all session-related state
      setSelectedAssistant(null);
      setSessionType(null);
      setMeditationStep("none");
      setIsSessionActive(false);
      
      // Show the therapy type selector after a small delay
      setTimeout(() => {
        setShowTypeSelector(true);
      }, 800);
    };
    
    window.addEventListener('sessionEnded', handleSessionEnded);
    return () => window.removeEventListener('sessionEnded', handleSessionEnded);
  }, []);

  // Handle selecting therapy type (used by both popup and UI elements within the page)
  const handleSelectTherapyType = (
    type: "couple" | "solo" | "family" | string
  ) => {
    setSessionType(type);

    // Set the appropriate assistant based on the session type
    let assistant;
    switch (type) {
      case "solo":
        assistant = INDIVIDUAL_THERAPY_ASSISTANT_CONFIG;
        break;
      case "family":
        assistant = FAMILY_THERAPY_ASSISTANT_CONFIG;
        break;
      case "couple":
      default:
        assistant = COUPLE_THERAPY_ASSISTANT_CONFIG;
        break;
    }

    console.log(
      `Selected ${type} therapy with assistant:`,
      assistant.name,
      "ID:",
      assistant.id
    );
    setSelectedAssistant(assistant);

    // Hide the type selector modal immediately to start meditation
    setShowTypeSelector(false);

    // Start the meditation sequence
    setMeditationStep("countdown");
    setCountdownValue(3);

    // Show 3 for one second
    setTimeout(() => {
      // Show 2
      setCountdownValue(2);

      setTimeout(() => {
        // Show 1
        setCountdownValue(1);

        setTimeout(() => {
          // After showing 1, transition to "Breathe"
          setMeditationStep("breathe");

          // After 10 seconds of breathing, transition to "Begin"
          setTimeout(() => {
            setMeditationStep("begin");

            // After 5 seconds of "Begin", show therapy interface
            setTimeout(() => {
              setMeditationStep("done");
              setShowTypeSelector(false);
            }, 5000);
          }, 10000);
        }, 1000); // Show 1 for 1 second
      }, 1000); // Show 2 for 1 second
    }, 1000); // Show 3 for 1 second
  };

  // Time formatting removed - now handled by DigitalClock component

  // Function to open therapist selection modal
  const openTherapistSelector = () => {
    // Only allow opening if initial check is complete
    if (initialCheckComplete) {
      setShowTypeSelector(true);
    } else {
      console.log('⏳ Cannot open therapist selector - still checking for active sessions');
    }
  };

  // Handle continuing an active session
  const handleContinueActiveSession = async (sessionData: any) => {
    console.log('🔄 Continuing active session:', sessionData.id)
    
    try {
      // Validate session data
      if (!sessionData || !sessionData.id) {
        throw new Error('Invalid session data provided')
      }
      
      // Verify session is still active on server
      console.log('🔍 Verifying session is still active on server...')
      const sessionCheck = await fetch(`/api/sessions/${sessionData.id}`)
      if (!sessionCheck.ok) {
        throw new Error('Session no longer exists on server')
      }
      
      const currentSessionData = await sessionCheck.json()
      // Use utility function for case-insensitive status check
      if (!checkSessionActive(currentSessionData.status)) {
        throw new Error(`Session is ${currentSessionData.status}, cannot continue`)
      }
      
          // CRITICAL FIX: Use theme as primary source, assistant ID as secondary
      // Theme is more reliable for session recovery since it reflects actual session content
      let detectedType = null
      let themeDetectedType = null
      let assistantDetectedType = null
      
      // First, try to detect from theme (most reliable for recovery)
      if (sessionData.theme || currentSessionData.theme) {
        const theme = sessionData.theme || currentSessionData.theme
        console.log(`🔍 Primary: Detecting session type from theme: "${theme}"`);
        
        if (theme.toLowerCase().includes('individual') || theme.toLowerCase().includes('solo')) {
          themeDetectedType = 'solo'
          console.log(`✅ Theme indicates Solo therapy`);
        } else if (theme.toLowerCase().includes('family')) {
          themeDetectedType = 'family'
          console.log(`✅ Theme indicates Family therapy`);
        } else if (theme.toLowerCase().includes('couple')) {
          themeDetectedType = 'couple'
          console.log(`✅ Theme indicates Couple therapy`);
        }
      }
      
      // Secondary: Check assistant ID for validation
      if (sessionData.assistantId || currentSessionData.assistantId) {
        const assistantId = sessionData.assistantId || currentSessionData.assistantId
        console.log(`🔍 Secondary: Validating with assistantId: "${assistantId}"`)
        console.log(`🔍 Available assistant IDs:`);
        console.log(`  - Individual: "${INDIVIDUAL_THERAPY_ASSISTANT_CONFIG.id}"`);
        console.log(`  - Family: "${FAMILY_THERAPY_ASSISTANT_CONFIG.id}"`);
        console.log(`  - Couple: "${COUPLE_THERAPY_ASSISTANT_CONFIG.id}"`);
        
        if (assistantId === INDIVIDUAL_THERAPY_ASSISTANT_CONFIG.id) {
          assistantDetectedType = 'solo'
          console.log(`✅ Assistant ID matches Individual therapy`);
        } else if (assistantId === FAMILY_THERAPY_ASSISTANT_CONFIG.id) {
          assistantDetectedType = 'family'
          console.log(`✅ Assistant ID matches Family therapy`);
        } else if (assistantId === COUPLE_THERAPY_ASSISTANT_CONFIG.id) {
          assistantDetectedType = 'couple'
          console.log(`✅ Assistant ID matches Couple therapy`);
        } else {
          console.log(`⚠️ AssistantId "${assistantId}" did not match any known assistant configs`);
        }
      } else {
        console.log(`⚠️ No assistantId found in session data`);
      }
      
      // Decision logic: Theme takes priority, but validate against assistant ID
      if (themeDetectedType && assistantDetectedType) {
        if (themeDetectedType === assistantDetectedType) {
          detectedType = themeDetectedType
          console.log(`✅ Theme and Assistant ID agree: ${detectedType}`)
        } else {
          // MISMATCH: Theme wins for session recovery
          detectedType = themeDetectedType
          console.log(`⚠️ MISMATCH: Theme says "${themeDetectedType}", Assistant ID says "${assistantDetectedType}". Using theme for recovery.`)
        }
      } else if (themeDetectedType) {
        detectedType = themeDetectedType
        console.log(`✅ Using theme detection: ${detectedType}`)
      } else if (assistantDetectedType) {
        detectedType = assistantDetectedType
        console.log(`✅ Using assistant ID detection: ${detectedType}`)
      }
      
      // Final fallback if no type detected
      if (!detectedType) {
        console.log(`⚠️ Could not detect session type, defaulting to 'couple'`);
        detectedType = 'couple';
      }
      
      console.log(`🎯 Detected session type: ${detectedType}`)
      
      // Set the session type and assistant
      setSessionType(detectedType)
      let assistant
      switch (detectedType) {
        case 'solo':
          assistant = INDIVIDUAL_THERAPY_ASSISTANT_CONFIG
          break
        case 'family':
          assistant = FAMILY_THERAPY_ASSISTANT_CONFIG
          break
        case 'couple':
        default:
          assistant = COUPLE_THERAPY_ASSISTANT_CONFIG
          break
      }
      setSelectedAssistant(assistant)
      
      // CRITICAL: Hide type selector and ensure UI transitions to active session view
      setShowTypeSelector(false)
      setMeditationStep('done')
      
      // Additional state synchronization to ensure UI shows active session
      console.log('🔄 Synchronizing UI state for active session...')
      
      // Small delay to ensure state changes propagate
      setTimeout(() => {
        // Double-check that session-active class is present
        if (!document.body.classList.contains('session-active')) {
          console.log('⚠️ session-active class missing, adding it manually')
          document.body.classList.add('session-active')
        }
        
        // Verify UI is in correct state
        const isSessionActiveSet = document.body.classList.contains('session-active')
        console.log(`🔍 UI State Check: session-active class=${isSessionActiveSet}, showTypeSelector=${false}, meditationStep=done`)
      }, 100)
      
      console.log(`✅ Session recovery setup complete - ${detectedType} therapy with ${assistant.name}`)
      
      // CRITICAL FIX: Signal to TherapyButtonRefactored to auto-start the session
      console.log('🚀 Triggering auto-start for recovered session...')
      console.log('📊 Session duration:', currentSessionData.duration || sessionData.duration, 'minutes')
      
      // Set a flag to indicate auto-start should happen
      sessionStorage.setItem('session-auto-start', JSON.stringify({
        sessionId: sessionData.id,
        sessionData: {
          ...currentSessionData,
          duration: currentSessionData.duration || sessionData.duration || 60 // Ensure duration is preserved
        },
        detectedType,
        timestamp: Date.now(),
        sessionDuration: currentSessionData.duration || sessionData.duration || 60 // Explicit duration field
      }))
      
      // Trigger a custom event that TherapyButtonRefactored can listen for
      window.dispatchEvent(new CustomEvent('sessionRecoveryComplete', {
        detail: {
          sessionId: sessionData.id,
          sessionData: {
            ...currentSessionData,
            duration: currentSessionData.duration || sessionData.duration || 60 // Ensure duration is preserved
          },
          detectedType,
          assistant,
          sessionDuration: currentSessionData.duration || sessionData.duration || 60 // Explicit duration field
        }
      }))
      
      console.log('👉 Session recovery complete - VAPI session should start automatically')
      
    } catch (error) {
      console.error('❌ Error continuing active session:', error)
      
      // Show user-friendly error and provide fallback options
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      // Reset to safe state
      setSessionType(null)
      setShowTypeSelector(true)
      setMeditationStep('none')
      
      // Clean up any stale session data
      sessionStorage.removeItem('session-recovery-pending')
      sessionStorage.removeItem('session-continue-trigger')
      sessionStorage.removeItem('current-session-id')
      sessionStorage.removeItem('session-auto-start')
      
      // Notify user
      alert(`Failed to continue session: ${errorMessage}\n\nYou'll need to start a new session. Any previous session has been safely ended.`)
      
      throw error // Re-throw so modal can handle it too
    }
  }

  // Handle starting new session (ends previous)
  const handleStartNewSession = () => {
    console.log('🆕 Starting new session, previous session ended')
    
    // Reset all state and show type selector
    setSessionType(null)
    setSelectedAssistant(null) // CRITICAL: Reset assistant selection
    setMeditationStep('none')
    setIsSessionActive(false)
    
    // Clear any stale recovery state to prevent race conditions
    sessionStorage.removeItem('session-recovery-pending')
    sessionStorage.removeItem('recovery-check-in-progress')
    sessionStorage.removeItem('current-session-id')
    sessionStorage.removeItem('session-auto-start')
    
    // Close the unified modal
    setSessionModalMode(null)
    setRecoverySessionData(null)
    setConflictSessionData(null)
    
    // Small delay to ensure modal closes and state resets before showing type selector
    setTimeout(() => {
      console.log('📝 Showing therapy type selector for new session')
      setShowTypeSelector(true)
    }, 300) // 300ms delay to allow UnifiedSessionModal to close smoothly
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // If there's a click and it's not inside the quick actions menu or button
      if (
        quickActionsOpen &&
        !target.closest("[data-quick-actions-menu]") &&
        !target.closest("[data-quick-actions-button]")
      ) {
        setQuickActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [quickActionsOpen]);

  // Use React.createElement to avoid JSX parsing issues
  return React.createElement(React.Fragment, null, [
    // Persistent blur background that stays throughout the meditation
    meditationStep !== "none" &&
      meditationStep !== "done" &&
      React.createElement("div", {
        key: "persistent-blur-bg",
        className:
          "fixed inset-0 z-40 bg-black/70 backdrop-blur-xl pointer-events-none",
        style: { transition: "opacity 0.7s ease-in-out" },
      }),

    // Unified Meditation Overlay with AnimatePresence to handle text transitions
    React.createElement(
      AnimatePresence,
      { mode: "wait", key: "meditation-presence" },
      // Countdown
      meditationStep === "countdown" &&
        React.createElement(
          motion.div,
          {
            key: "countdown-overlay",
            className:
              "fixed inset-0 flex items-center justify-center z-50 pointer-events-none overflow-visible p-16",
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.7 },
          },
          [
            React.createElement(
              motion.div,
              {
                key: "countdown-number",
                className:
                  "text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold countdown-number overflow-visible whitespace-nowrap flex items-center justify-center min-w-[4rem] text-center",
                initial: { scale: 0.8, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                exit: { scale: 1.2, opacity: 0 },
                transition: { duration: 0.5 },
              },
              countdownValue
            ),
          ]
        ),

      // Breathe Text
      meditationStep === "breathe" &&
        React.createElement(
          motion.div,
          {
            key: "breathe-overlay",
            className:
              "fixed inset-0 flex items-center justify-center z-50 pointer-events-none",
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.7 },
          },
          [
            React.createElement(
              motion.div,
              {
                key: "breathe-text",
                className:
                  "text-white text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold breath-text",
                initial: { opacity: 0, scale: 0.9 },
                animate: { opacity: 1, scale: 1 },
                exit: { opacity: 0, scale: 0.9 },
                transition: { duration: 0.7 },
              },
              "Breathe"
            ),
          ]
        ),

      // Begin Text
      meditationStep === "begin" &&
        React.createElement(
          motion.div,
          {
            key: "begin-overlay",
            className:
              "fixed inset-0 flex items-center justify-center z-50 pointer-events-none",
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.7 },
          },
          [
            React.createElement(
              motion.div,
              {
                key: "begin-text",
                className:
                  "text-white text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold begin-text",
                initial: { opacity: 0, scale: 0.9 },
                animate: { opacity: 1, scale: 1 },
                exit: { opacity: 0, scale: 0.9 },
                transition: { duration: 0.7 },
              },
              "Begin"
            ),
          ]
        )
    ),

    // Therapy Type Selector Popup - only show after initial check
    // This ensures session recovery modal appears first if needed
    React.createElement(TherapyTypeSelector, {
      key: "therapy-selector",
      isOpen: showTypeSelector && initialCheckComplete && minimumWaitComplete && !hasActiveSession && !selectedAssistant,
      onClose: () => {
        /* No-op: User must select a therapist */
      },
      onSelect: handleSelectTherapyType,
      hasFamilyMembers: familyMembers.length > 0,
      familyMembersLoading: familyMembersLoading,
      // User has partner if they have a partner name OR they're in a relationship status that implies a partner
      hasPartner: Boolean(profile?.partnerName) || 
                  ['dating', 'engaged', 'married', 'in a relationship'].includes(profile?.relationshipStatus?.toLowerCase() || ''),
      profileLoading: false, // Profile is already loaded from ProfileProvider
    }),

    // Stars background for session
    isSessionActive &&
      React.createElement(
        "div",
        {
          key: "stars-container",
          className:
            "fixed inset-0 w-full h-full overflow-hidden pointer-events-none",
          style: {
            zIndex: 1,
            bottom: "-5px", // Extend below viewport
            height: "calc(100vh + 5px)", // Make taller than viewport
          },
        },
        [
          React.createElement("div", {
            key: "stars",
            className: "stars",
          }),
          // Shooting stars removed as requested
        ]
      ),

    // Night sky background
    isSessionActive &&
      React.createElement("div", {
        key: "night-sky-bg",
        className:
          "fixed inset-0 bg-gradient-to-b from-[#0b0b2b] via-[#1b2735] to-[#090a0f]",
        style: {
          zIndex: 0,
          overflowX: "hidden",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        },
      }),

    // Gradient background with animated circles for inactive session
    !isSessionActive &&
      React.createElement(
        "div",
        {
          key: "gradient-bg",
          className: "gradient-bg",
          style: { zIndex: 0 },
        },
        [
          React.createElement(
            "div",
            {
              key: "gradient-container",
              className: "gradient-container",
            },
            [
              React.createElement("div", {
                key: "circle-small",
                className: "circle-small",
              }),
              React.createElement("div", {
                key: "circle-medium",
                className: "circle-medium",
              }),
              React.createElement("div", {
                key: "circle-large",
                className: "circle-large",
              }),
              React.createElement("div", {
                key: "circle-xlarge",
                className: "circle-xlarge",
              }),
              React.createElement("div", {
                key: "circle-xxlarge",
                className: "circle-xxlarge",
              }),
            ]
          ),
        ]
      ),

    // Main Content
    React.createElement(
      "div",
      {
        key: "main-container",
        className:
          "min-h-screen w-full transition-all duration-300 ease-in-out opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards] relative z-10 bg-transparent overflow-x-hidden overflow-y-auto",
      },
      [
        // Main content wrapper
        React.createElement(
          "div",
          {
            key: "main-content",
            className:
              "w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-7 lg:px-8 xl:px-12 pt-4 sm:pt-6 md:pt-8 pb-32 sm:pb-24 md:pb-32 relative z-10",
          },
          [
            // Date/Time Header - reduced bottom margin
            React.createElement(
              "div",
              {
                key: "header",
                className:
                  "flex flex-col md:flex-row md:justify-between md:items-center mb-2 sm:mb-3 md:mb-4",
              },
              [
                // Title and date
                React.createElement(
                  "div",
                  {
                    key: "title-date",
                    className:
                      "mb-4 md:mb-0 opacity-0 animate-[fadeIn_0.4s_ease-in-out_forwards]",
                  },
                  [
                    // Title removed as requested
                  ]
                ),

                // Digital clock component - centered and smaller on mobile
                React.createElement(
                  "div",
                  {
                    key: "digital-clock",
                    className: `digital-clock-container ${
                      isSessionActive ? "text-white" : "text-black/80"
                    } transition-all duration-500 opacity-0 animate-[fadeIn_0.4s_ease-in-out_0.1s_forwards] mx-auto md:mx-0 scale-75 sm:scale-90 md:scale-95 lg:scale-100`,
                  },
                  [
                    // Digital time display
                    // Digital clock component - isolated from re-renders
                    React.createElement(
                      "div",
                      {
                        key: "digital-clock-wrapper",
                        className: isSessionActive ? "neon-text" : "",
                      },
                      React.createElement(DigitalClock, {})
                    ),
                  ]
                ),
              ]
            ),

            // Main card content - only show when therapy type is selected or session is active
            (sessionType || isSessionActive) ? React.createElement(
              "div",
              {
                key: "main-card",
                className:
                  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-xl backdrop-blur-xs bg-transparent mt-6 sm:mt-3 md:mt-4",
              },
              [
                // Card session with enhanced styling
                React.createElement(
                  "div",
                  {
                    key: "session-card",
                    className: `md:col-span-3 relative overflow-visible rounded-lg shadow-xl transition-all duration-700 opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards] z-10 ${
                      isSessionActive
                        ? "bg-transparent p-4 md:p-6 lg:p-8 rounded-xl"
                        : "bg-transparent rounded-xl p-4 sm:p-8 md:p-12 lg:p-16"
                    }`,
                  },
                  [
                    // Card content
                    React.createElement(
                      "div",
                      {
                        key: "card-content",
                        className: "relative z-10 rounded-xl",
                      },
                      [
                        // Session header with status indicator and therapist info - reduced margin
                        React.createElement(
                          "div",
                          {
                            key: "session-header",
                            className:
                              "mb-2 sm:mb-3 flex flex-col items-center hide-during-session",
                          },
                          [
                            // Navigation buttons at the top with enhanced styling
                            !isSessionActive && initialCheckComplete
                              ? React.createElement(
                                  "div",
                                  {
                                    key: "action-buttons",
                                    className:
                                      "w-full flex justify-between items-center mt-0 mb-4 px-2 sm:px-4 md:px-5 lg:px-6",
                                  },
                                  [
                                    // Quick Actions Menu Button and Popup
                                    React.createElement(
                                      motion.div,
                                      {
                                        key: "quick-actions-container",
                                        className: "relative z-20",
                                      },
                                      [
                                        // Main Quick Actions button
                                        React.createElement(
                                          motion.button,
                                          {
                                            key: "quick-actions-button",
                                            ...{ 'data-quick-actions-button': "true" },
                                            onClick: () =>
                                              setQuickActionsOpen(
                                                !quickActionsOpen
                                              ),
                                            className: `flex items-center rounded-lg px-3 py-2 text-xs font-medium ${
                                              quickActionsOpen
                                                ? "bg-blue-500/60 text-white shadow-lg shadow-blue-400/30 ring-2 ring-blue-200"
                                                : isSessionActive
                                                  ? "bg-blue-700/50 text-white hover:bg-blue-700/60"
                                                  : "bg-blue-500/70 text-white hover:bg-blue-500/80"
                                            } transition-all duration-300 cursor-pointer`,
                                            whileHover: { scale: 1.05 },
                                            whileTap: { scale: 0.95 },
                                            initial: { opacity: 0, y: 20 },
                                            animate: { opacity: 1, y: 0 },
                                            transition: {
                                              type: "spring",
                                              stiffness: 500,
                                              damping: 30,
                                            },
                                          },
                                          [
                                            React.createElement(
                                              "span",
                                              {
                                                key: "button-text",
                                                className: "flex items-center",
                                              },
                                              [
                                                React.createElement(
                                                  "svg",
                                                  {
                                                    key: "menu-icon",
                                                    className: "h-4 w-4 mr-1",
                                                    fill: "none",
                                                    viewBox: "0 0 24 24",
                                                    stroke: "currentColor",
                                                  },
                                                  React.createElement("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M4 6h16M4 12h16M4 18h16",
                                                  })
                                                ),
                                                "Quick Actions",

                                                // Animated chevron
                                                React.createElement(
                                                  motion.svg,
                                                  {
                                                    key: "chevron-icon",
                                                    className: "h-4 w-4 ml-1",
                                                    fill: "none",
                                                    viewBox: "0 0 24 24",
                                                    stroke: "currentColor",
                                                    animate: {
                                                      rotate: quickActionsOpen
                                                        ? 180
                                                        : 0,
                                                    },
                                                    transition: {
                                                      duration: 0.3,
                                                    },
                                                  },
                                                  React.createElement("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M19 9l-7 7-7-7",
                                                  })
                                                ),
                                              ]
                                            ),
                                          ]
                                        ),

                                        // Popup menu
                                        React.createElement(
                                          AnimatePresence,
                                          {
                                            mode: "wait",
                                            key: "quick-actions-presence",
                                          },
                                          quickActionsOpen &&
                                            React.createElement(
                                              motion.div,
                                              {
                                                key: "popup-menu",
                                                ...{ 'data-quick-actions-menu': "true" },
                                                className:
                                                  "absolute left-0 mt-2 w-48 rounded-md shadow-xl bg-white ring-1 ring-black/5 ring-opacity-5 z-30 overflow-hidden",
                                                initial: {
                                                  opacity: 0,
                                                  y: -10,
                                                  scale: 0.95,
                                                },
                                                animate: {
                                                  opacity: 1,
                                                  y: 0,
                                                  scale: 1,
                                                },
                                                exit: {
                                                  opacity: 0,
                                                  y: -10,
                                                  scale: 0.95,
                                                },
                                                transition: {
                                                  type: "spring",
                                                  stiffness: 500,
                                                  damping: 30,
                                                },
                                              },
                                              [
                                                React.createElement(
                                                  motion.div,
                                                  {
                                                    key: "popup-content",
                                                    className:
                                                      "py-1 divide-y divide-gray-100",
                                                    variants: {
                                                      open: {
                                                        transition: {
                                                          staggerChildren: 0.07,
                                                          delayChildren: 0.05,
                                                        },
                                                      },
                                                      closed: {
                                                        transition: {
                                                          staggerChildren: 0.05,
                                                          staggerDirection: -1,
                                                        },
                                                      },
                                                    },
                                                    initial: "closed",
                                                    animate: "open",
                                                  },
                                                  [
                                                    // Dashboard button
                                                    React.createElement(
                                                      motion.a,
                                                      {
                                                        key: "dashboard-button",
                                                        href: "/dashboard",
                                                        className:
                                                          "flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-green-500/80 cursor-pointer",
                                                        variants: {
                                                          open: {
                                                            opacity: 1,
                                                            y: 0,
                                                            transition: {
                                                              type: "spring",
                                                              stiffness: 300,
                                                              damping: 24,
                                                            },
                                                          },
                                                          closed: {
                                                            opacity: 0,
                                                            y: 20,
                                                          },
                                                        },
                                                        whileHover: {
                                                          x: 5,
                                                          transition: {
                                                            type: "spring",
                                                            stiffness: 400,
                                                          },
                                                        },
                                                      },
                                                      [
                                                        React.createElement(
                                                          "svg",
                                                          {
                                                            key: "dashboard-icon",
                                                            className:
                                                              "h-4 w-4 mr-2 text-blue-500",
                                                            fill: "none",
                                                            viewBox:
                                                              "0 0 24 24",
                                                            stroke:
                                                              "currentColor",
                                                          },
                                                          React.createElement(
                                                            "path",
                                                            {
                                                              strokeLinecap:
                                                                "round",
                                                              strokeLinejoin:
                                                                "round",
                                                              strokeWidth: 2,
                                                              d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
                                                            }
                                                          )
                                                        ),
                                                        "Dashboard",
                                                      ]
                                                    ),

                                                    // Sessions button
                                                    React.createElement(
                                                      motion.a,
                                                      {
                                                        key: "sessions-button",
                                                        href: "/dashboard/sessions",
                                                        className:
                                                          "flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-green-500/80 cursor-pointer",
                                                        variants: {
                                                          open: {
                                                            opacity: 1,
                                                            y: 0,
                                                            transition: {
                                                              type: "spring",
                                                              stiffness: 300,
                                                              damping: 24,
                                                            },
                                                          },
                                                          closed: {
                                                            opacity: 0,
                                                            y: 20,
                                                          },
                                                        },
                                                        whileHover: {
                                                          x: 5,
                                                          transition: {
                                                            type: "spring",
                                                            stiffness: 400,
                                                          },
                                                        },
                                                      },
                                                      [
                                                        React.createElement(
                                                          "svg",
                                                          {
                                                            key: "sessions-icon",
                                                            className:
                                                              "h-4 w-4 mr-2 text-blue-500",
                                                            fill: "none",
                                                            viewBox:
                                                              "0 0 24 24",
                                                            stroke:
                                                              "currentColor",
                                                          },
                                                          React.createElement(
                                                            "path",
                                                            {
                                                              strokeLinecap:
                                                                "round",
                                                              strokeLinejoin:
                                                                "round",
                                                              strokeWidth: 2,
                                                              d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
                                                            }
                                                          )
                                                        ),
                                                        "Sessions",
                                                      ]
                                                    ),

                                                    // Resources button
                                                    React.createElement(
                                                      motion.a,
                                                      {
                                                        key: "resources-button",
                                                        href: "/dashboard/resources",
                                                        className:
                                                          "flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-green-500/80 cursor-pointer",
                                                        variants: {
                                                          open: {
                                                            opacity: 1,
                                                            y: 0,
                                                            transition: {
                                                              type: "spring",
                                                              stiffness: 300,
                                                              damping: 24,
                                                            },
                                                          },
                                                          closed: {
                                                            opacity: 0,
                                                            y: 20,
                                                          },
                                                        },
                                                        whileHover: {
                                                          x: 5,
                                                          transition: {
                                                            type: "spring",
                                                            stiffness: 400,
                                                          },
                                                        },
                                                      },
                                                      [
                                                        React.createElement(
                                                          "svg",
                                                          {
                                                            key: "resources-icon",
                                                            className:
                                                              "h-4 w-4 mr-2 text-blue-500",
                                                            fill: "none",
                                                            viewBox:
                                                              "0 0 24 24",
                                                            stroke:
                                                              "currentColor",
                                                          },
                                                          React.createElement(
                                                            "path",
                                                            {
                                                              strokeLinecap:
                                                                "round",
                                                              strokeLinejoin:
                                                                "round",
                                                              strokeWidth: 2,
                                                              d: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
                                                            }
                                                          )
                                                        ),
                                                        "Resources",
                                                      ]
                                                    ),
                                                  ]
                                                ),
                                              ]
                                            )
                                        ),
                                      ]
                                    ),
                                    // Switch therapist button - only visible when session is not active and initial check is complete
                                    !isSessionActive && initialCheckComplete &&
                                      React.createElement(
                                        motion.button,
                                        {
                                          key: "switch-therapist",
                                          onClick: openTherapistSelector,
                                          className: `flex items-center rounded-lg px-3 py-2 text-xs font-medium 
                    bg-rose-500/70 text-white hover:bg-rose-500/80 cursor-pointer`,
                                          whileHover: { scale: 1.05 },
                                          whileTap: { scale: 0.95 },
                                          initial: { opacity: 0, y: 20 },
                                          animate: { opacity: 1, y: 0 },
                                          transition: {
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 30,
                                            delay: 0.1, // Slight delay for staggered animation
                                          },
                                        },
                                        [
                                          React.createElement(
                                            motion.div,
                                            {
                                              key: "button-content",
                                              className: "flex items-center",
                                              initial: { x: -5 },
                                              animate: { x: 0 },
                                              transition: {
                                                type: "spring",
                                                stiffness: 300,
                                              },
                                            },
                                            [
                                              React.createElement(
                                                "svg",
                                                {
                                                  key: "switch-icon",
                                                  className: "h-4 w-4 mr-1",
                                                  fill: "none",
                                                  viewBox: "0 0 24 24",
                                                  stroke: "currentColor",
                                                },
                                                React.createElement("path", {
                                                  strokeLinecap: "round",
                                                  strokeLinejoin: "round",
                                                  strokeWidth: 2,
                                                  d: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
                                                })
                                              ),
                                              "Switch Therapist",
                                            ]
                                          ),
                                        ]
                                      ),
                                  ]
                                )
                              : null,
                            // Only show therapist info when therapy type is selected
                            sessionType && selectedAssistant ? React.createElement(
                              "div",
                              {
                                key: "therapist",
                                className: "flex flex-col items-center",
                              },
                              [
                                // Doctor image container - smaller photo with enhanced styling
                                React.createElement(
                                  "div",
                                  {
                                    key: "therapist-photo",
                                    className: `w-12 h-12 rounded-full overflow-hidden shadow-md transition-all duration-500 mb-1 ${
                                      isSessionActive
                                        ? "border-2 border-blue-500 ring-2 ring-blue-300/50"
                                        : "border-2 border-blue-400 ring-2 ring-blue-200/50"
                                    }`,
                                  },
                                  [
                                    React.createElement(
                                      "div",
                                      {
                                        key: "photo-placeholder",
                                        className: `w-full h-full ${
                                          isSessionActive
                                            ? "bg-gradient-to-br from-purple-500/80 to-blue-600/80"
                                            : "bg-gradient-to-br from-blue-100 to-blue-200"
                                        } flex items-center justify-center`,
                                      },
                                      [
                                        // Simple approach with two containers and conditional rendering
                                        React.createElement(
                                          React.Fragment,
                                          { key: "doctor-image-container" },
                                          [
                                            // A simpler approach: just use a regular image element instead of next/image
                                            // Actual doc photo or fallback icon - handled with onError
                                            React.createElement("img", {
                                              key: "doctor-photo",
                                              src:
                                                sessionType === "couple"
                                                  ? "/images/dr-maya-thompson.jpg"
                                                  : sessionType === "solo"
                                                    ? "/images/dr-elliot-mackaphy.jpg"
                                                    : "/images/dr-jada-pearson.jpg",
                                              alt: selectedAssistant?.name || "Therapist",
                                              className:
                                                "w-full h-full object-cover",
                                              onError: (e) => {
                                                // If image fails to load, replace with fallback icon
                                                const target =
                                                  e.target as HTMLImageElement;
                                                // Replace the src with a transparent pixel
                                                target.style.display = "none";
                                                // Show fallback icon
                                                const fallbackContainer =
                                                  document.getElementById(
                                                    "doctor-fallback-" +
                                                      (sessionType || "default")
                                                  );
                                                if (fallbackContainer) {
                                                  fallbackContainer.style.display =
                                                    "flex";
                                                }
                                              },
                                            }),

                                            // Fallback icon - Initially hidden, shown if image fails to load
                                            React.createElement(
                                              "div",
                                              {
                                                id:
                                                  "doctor-fallback-" +
                                                  (sessionType || "default"),
                                                key: "fallback-container",
                                                className:
                                                  "w-full h-full absolute inset-0 flex items-center justify-center",
                                                style: { display: "none" }, // Hidden by default, shown when image fails
                                              },
                                              React.createElement(
                                                "svg",
                                                {
                                                  key: "doctor-icon",
                                                  className: `h-8 w-8 transition-colors duration-500 ${isSessionActive ? "text-white" : "text-indigo-600"}`,
                                                  fill: "none",
                                                  viewBox: "0 0 24 24",
                                                  stroke: "currentColor",
                                                },
                                                React.createElement("path", {
                                                  strokeLinecap: "round",
                                                  strokeLinejoin: "round",
                                                  strokeWidth: 1.5,
                                                  d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
                                                })
                                              )
                                            ),
                                          ]
                                        ),
                                      ]
                                    ),
                                  ]
                                ),
                                // Therapist text - centered with enhanced styling
                                React.createElement(
                                  "div",
                                  {
                                    key: "therapist-text",
                                    className: "text-center",
                                  },
                                  [
                                    React.createElement(
                                      "h2",
                                      {
                                        key: "therapist-name",
                                        className: `text-xl font-bold transition-colors duration-500 ${isSessionActive ? "text-white" : "text-black/90"}`,
                                      },
                                      selectedAssistant?.name || "Loading..."
                                    ),
                                    React.createElement(
                                      "p",
                                      {
                                        key: "therapist-type",
                                        className: `text-xs font-medium px-3 py-0.5 rounded-full transition-all duration-500 shadow-sm ${
                                          isSessionActive
                                            ? "bg-gradient-to-r from-green-500/60 to-blue-500/60 text-white"
                                            : "bg-blue-100/70 text-black/90"
                                        }`,
                                      },
                                      sessionType === "couple"
                                        ? "AI Relationship Therapist"
                                        : sessionType === "solo"
                                          ? "AI Personal Therapist"
                                          : "AI Family Therapist"
                                    ),
                                  ]
                                ),
                              ]
                            ) : null,

                            // Status indicator (when active) - centered, shown prominently when active
                            isSessionActive
                              ? React.createElement(
                                  "div",
                                  {
                                    key: "status",
                                    className:
                                      "flex items-center justify-center mt-2 mb-4",
                                  },
                                  [
                                    React.createElement("div", {
                                      key: "status-dot",
                                      className:
                                        "h-2.5 w-2.5 bg-green-400 rounded-full animate-pulse mr-2",
                                    }),
                                    React.createElement(
                                      "span",
                                      {
                                        key: "status-text",
                                        className:
                                          "text-white text-sm font-medium",
                                      },
                                      "Live Session"
                                    ),
                                  ]
                                )
                              : null,
                          ]
                        ),

                        // Session welcome text or active message
                        React.createElement(
                          "div",
                          {
                            key: "session-content",
                            className: `transition-colors duration-500 ${isSessionActive ? "text-white" : "text-black"} mt-4 sm:mt-0`,
                          },
                          [
                            // Always render the therapy button container
                            React.createElement(
                              "div",
                              {
                                key: "therapy-button-container",
                                className: "w-full flex flex-col items-center",
                              },
                              [
                                // Session info - Enhanced styling
                                (!initialCheckComplete || !minimumWaitComplete)
                                  ? React.createElement(
                                      "div",
                                      {
                                        key: "checking-sessions",
                                        className:
                                          "space-y-3 mb-2 mt-4 sm:mt-6 text-center max-w-xl mx-auto p-3 sm:p-5 rounded-xl backdrop-blur-sm bg-gradient-to-b from-white/70 to-white/50 shadow-lg border border-white/60",
                                      },
                                      [
                                        React.createElement(
                                          "div",
                                          {
                                            key: "checking-content",
                                            className: "flex flex-col items-center space-y-4 py-8"
                                          },
                                          [
                                            React.createElement(
                                              motion.div,
                                              {
                                                key: "spinner",
                                                className: "w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full",
                                                animate: { rotate: 360 },
                                                transition: { duration: 1, repeat: Infinity, ease: "linear" }
                                              }
                                            ),
                                            React.createElement(
                                              "p",
                                              {
                                                key: "checking-text",
                                                className: "text-base text-black/80 font-medium"
                                              },
                                              "Checking for active sessions..."
                                            )
                                          ]
                                        )
                                      ]
                                    )
                                  : (isSessionActive || hasActiveSession)
                                  ? React.createElement(
                                      "div",
                                      {
                                        key: "active-info",
                                        className:
                                          "p-4 md:p-6 rounded-2xl mb-4 md:mb-8 shadow-inner bg-transparent",
                                      },
                                      [
                                        // Info icon at the top with pulsing animation - hidden on mobile
                                        React.createElement(
                                          "div",
                                          {
                                            key: "info-header",
                                            className: "hidden sm:flex justify-center mb-2",
                                          },
                                          [
                                            React.createElement(
                                              "div",
                                              {
                                                key: "info-icon-container",
                                                className:
                                                  "w-10 h-1 rounded-full bg-transparent flex items-center justify-center mb-1 shadow-lg animate-[float_4s_ease-in-out_infinite]",
                                              },
                                              [
                                                React.createElement(
                                                  "svg",
                                                  {
                                                    key: "info-icon",
                                                    className: "w-5 h-5 text-white",
                                                    fill: "none",
                                                    viewBox: "0 0 24 24",
                                                    stroke: "currentColor",
                                                  },
                                                  React.createElement("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 1.5,
                                                    d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                                                  })
                                                ),
                                              ]
                                            ),
                                          ]
                                        ),
                                        // Session message with enhanced styling - hidden on mobile
                                        React.createElement(
                                          "p",
                                          {
                                            key: "active-message",
                                            className:
                                              "hidden sm:block text-white text-center text-xs sm:text-sm lg:text-base bg-transparent py-3 px-4 rounded-lg backdrop-blur-sm shadow-inner mt-2 z-50 relative mx-auto max-w-[95%] md:max-w-[90%] lg:max-w-[80%]",
                                          },
                                          sessionType === "couple"
                                            ? "Speak naturally and I will respond to help with your relationship concerns. Everything shared is completely private and secure."
                                            : sessionType === "solo"
                                              ? "Speak naturally and I will respond to help with your personal concerns. Everything shared is completely private and secure."
                                              : "Speak naturally and I will respond to help with your family concerns. Everything shared is completely private and secure."
                                        ),
                                      ]
                                    )
                                  : sessionType && selectedAssistant ? React.createElement(
                                  "div",
                                  {
                                    key: "welcome-info",
                                    className:
                                      "space-y-3 mb-2 mt-4 sm:mt-6 text-center max-w-xl mx-auto hide-during-session p-3 sm:p-5 rounded-xl backdrop-blur-sm bg-gradient-to-b from-white/70 to-white/50 shadow-lg border border-white/60",
                                  },
                                  [
                                    // Welcome header and therapist intro combined with better styling
                                    React.createElement(
                                      "div",
                                      {
                                        key: "welcome-therapist-header",
                                        className: "space-y-0.5",
                                      },
                                      [
                                        // Welcome header with enhanced typography
                                        React.createElement(
                                          "h2",
                                          {
                                            key: "welcome-header",
                                            className:
                                              "text-lg sm:text-xl font-semibold text-black/90 tracking-tight",
                                          },
                                          `Hello! Welcome to your session`
                                        ),
                                        // Therapist name with emphasis and enhanced styling
                                        React.createElement(
                                          "p",
                                          {
                                            key: "therapist-name",
                                            className:
                                              "text-sm sm:text-base font-medium text-black/90 bg-blue-50/80 px-2 py-0.5 rounded-md inline-block",
                                          },
                                          selectedAssistant?.name ? `I'm ${selectedAssistant.name}` : "Loading therapist..."
                                        ),
                                      ]
                                    ),

                                    // Warm welcome message - better typography and contrast
                                    React.createElement(
                                      "p",
                                      {
                                        key: "warm-welcome",
                                        className:
                                          "text-sm text-black/80 leading-relaxed max-w-md mx-auto bg-white/40 px-3 py-2 rounded-lg shadow-sm border border-blue-100/50",
                                      },
                                      sessionType === "couple"
                                        ? `I'm delighted to meet you both${userProfile.name ? ", " + userProfile.name : ""}${userProfile.partnerName ? " and " + userProfile.partnerName : ""}, today! This is a safe space where we can work together on strengthening your connection and understanding each other better.`
                                        : sessionType === "solo"
                                          ? `I'm so glad you're here today${userProfile.name ? ", " + userProfile.name : ""}! This is your private, judgment-free space where we can explore whatever is on your mind and work toward your personal goals.`
                                          : `Hello ${userProfile.name ? userProfile.name : ""}${userProfile.partnerName ? ", " + userProfile.partnerName : ""}${userProfile.familyMember1 ? ", " + userProfile.familyMember1 : ""}${userProfile.familyMember2 ? ", " + userProfile.familyMember2 : ""}${userProfile.familyMember3 ? ", " + userProfile.familyMember3 : ""}${userProfile.familyMember4 ? ", " + userProfile.familyMember4 : ""}!! I'm excited to meet everyone today This is a supportive environment where all family members can share openly as we work together to improve communication and connection.`
                                    ),

                                    // CTA message with enhanced styling
                                    React.createElement(
                                      "div",
                                      {
                                        key: "cta-container",
                                        className: "mt-3",
                                      },
                                      React.createElement(
                                        "div",
                                        {
                                          key: "cta-message-container",
                                          className:
                                            "flex flex-col items-center space-y-2",
                                        },
                                        [
                                          React.createElement(
                                            "p",
                                            {
                                              key: "cta-message",
                                              className:
                                                "text-black/90 font-medium py-1 px-3 border border-blue-300 rounded-lg bg-gradient-to-r from-blue-50/90 to-blue-50/80 backdrop-blur-sm inline-block text-xs shadow-sm",
                                            },
                                            "Ready to talk? Click the button below."
                                          ),
                                        ]
                                      )
                                    ),
                                  ]
                                ) : null,
                                
                                // Show therapy button only after initial check AND therapist selection
                                initialCheckComplete && selectedAssistant && React.createElement(
                                  "div",
                                  {
                                    key: "button-wrapper-persistent",
                                    className: "flex justify-center items-center w-full mt-1 mb-4 pb-8",
                                  },
                                  React.createElement(TherapyButton, {
                                    key: "therapy-button-main", // Add stable key to prevent remounting
                                    therapyType: (sessionType || "couple") as TherapyType,
                                    disabled: false,
                                    onSessionConflict: (conflictData: any) => {
                                      console.log('🔴 Session conflict detected:', conflictData)
                                      setConflictSessionData(conflictData)
                                      setSessionModalMode('conflict')
                                    }
                                  })
                                ),
                              ]
                            ),
                          ]
                        ),
                      ]
                    ),
                  ]
                ),
              ]
            ) : null,
          ]
        ),
      ]
    ),

    // Unified Session Modal (handles both recovery and conflict cases)
    React.createElement(UnifiedSessionModal, {
      key: "unified-session-modal",
      mode: sessionModalMode,
      sessionData: recoverySessionData,
      conflictSession: conflictSessionData,
      onContinueSession: handleContinueActiveSession,
      onStartNewSession: handleStartNewSession,
      onResume: () => {
        // For conflict mode - resume button
        console.log('Resume existing session from conflict modal');
        setSessionModalMode(null);
        setConflictSessionData(null);
      },
      onEndAndStartNew: () => {
        // For conflict mode - end and start new
        handleStartNewSession();
      },
      onClose: () => {
        // Close the modal without action
        setSessionModalMode(null);
        setConflictSessionData(null);
      }
    }),

    // Session Recovery Notification - REMOVED to eliminate duplicate modals
    // User will see only the ActiveSessionFoundModal which has better UX
    // React.createElement(SessionRecoveryNotification, {
    //   key: "session-recovery-notification"
    // }),

    // Session Recovery Checking Indicator - Only on therapy page when actually checking
    isCheckingForSession && 
      React.createElement(
        motion.div,
        {
          key: "session-checking-indicator",
          className: "fixed top-4 right-4 z-[9998] pointer-events-none",
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.8 },
          transition: { duration: 0.3 }
        },
        React.createElement(
          "div",
          {
            className: "bg-black/70 text-white px-3 py-2 rounded-lg text-xs backdrop-blur-sm border border-white/20"
          },
          [
            React.createElement(
              "div",
              {
                key: "checking-content",
                className: "flex items-center space-x-2"
              },
              [
                React.createElement(
                  motion.div,
                  {
                    key: "spinner",
                    className: "w-3 h-3 border border-white/40 border-t-white rounded-full",
                    animate: { rotate: 360 },
                    transition: { duration: 1, repeat: Infinity, ease: "linear" }
                  }
                ),
                React.createElement(
                  "span",
                  { key: "text" },
                  "Checking for active session..."
                )
              ]
            )
          ]
        )
      )
  ]);
}
