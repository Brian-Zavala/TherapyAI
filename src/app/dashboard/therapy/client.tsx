'use client';

import React, { useState, useEffect } from "react";
import Image from "next/image";
import TherapyButton from "@/components/TherapyButton";
import TherapyTypeSelector from "@/components/TherapyTypeSelector";
import { motion, AnimatePresence } from "framer-motion";
import { 
  COUPLE_THERAPY_ASSISTANT_CONFIG, 
  INDIVIDUAL_THERAPY_ASSISTANT_CONFIG, 
  FAMILY_THERAPY_ASSISTANT_CONFIG 
} from "@/lib/vapi";

export default function TherapyPageClient({ userId }: { userId: string }) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [selectedAssistant, setSelectedAssistant] = useState(COUPLE_THERAPY_ASSISTANT_CONFIG);
  // Default to show the selector - user must explicitly choose session type
  const [showTypeSelector, setShowTypeSelector] = useState(true);
  // Countdown overlay state
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [meditationStep, setMeditationStep] = useState<'none' | 'countdown' | 'breathe' | 'begin' | 'done'>('none');
  // User profile data
  const [userProfile, setUserProfile] = useState<{
    name?: string;
    partnerName?: string;
    familyMember1?: string;
    familyMember2?: string;
    familyMember3?: string;
    familyMember4?: string;
  }>({});
  
  // Digital clock state
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');
  const [seconds, setSeconds] = useState<string>('');
  const [ampm, setAmPm] = useState<string>('');
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [date, setDate] = useState<number>(0);
  const [year, setYear] = useState<number>(0);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profileResponse = await fetch('/api/user/profile');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setUserProfile(profileData);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  useEffect(() => {
    const checkActive = () => {
      const hasActiveClass = document.body.classList.contains('session-active');
      setIsSessionActive(hasActiveClass);
      
      // Hide the type selector when session becomes active
      if (hasActiveClass) {
        setShowTypeSelector(false);
      }
    };
    
    // Initial check
    checkActive();
    
    // Watch for class changes on body
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          checkActive();
        }
      });
    });
    
    observer.observe(document.body, { attributes: true });
    
    // Update time every second for digital clock
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now);
      
      // Hours in 12-hour format
      let hour = now.getHours();
      const isAM = hour < 12;
      if (hour === 0) hour = 12; // Convert midnight (0) to 12
      if (hour > 12) hour -= 12; // Convert 13-23 to 1-11
      
      // Update time components
      setHours(hour < 10 ? '0' + hour : hour.toString());
      setMinutes(now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes().toString());
      setSeconds(now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds().toString());
      setAmPm(isAM ? 'AM' : 'PM');
      
      // Update date components
      const monthList = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const dayList = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      
      setDay(dayList[now.getDay()]);
      setMonth(monthList[now.getMonth()]);
      setDate(now.getDate());
      setYear(now.getFullYear());
    };
    
    // Initial update
    updateClock();
    
    // Set up interval
    const timer = setInterval(updateClock, 1000);
    
    return () => {
      observer.disconnect();
      clearInterval(timer);
    };
  }, []);
  
  // Handle selecting therapy type (used by both popup and UI elements within the page)
  const handleSelectTherapyType = (type: 'couple' | 'solo' | 'family' | string) => {
    setSessionType(type);
    
    // Set the appropriate assistant based on the session type
    let assistant;
    switch (type) {
      case 'solo':
        assistant = INDIVIDUAL_THERAPY_ASSISTANT_CONFIG;
        break;
      case 'family':
        assistant = FAMILY_THERAPY_ASSISTANT_CONFIG;
        break;
      case 'couple':
      default:
        assistant = COUPLE_THERAPY_ASSISTANT_CONFIG;
        break;
    }
    
    console.log(`Selected ${type} therapy with assistant:`, assistant.name, 'ID:', assistant.id);
    setSelectedAssistant(assistant);
    
    // Start the meditation sequence
    setMeditationStep('countdown');
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
          setMeditationStep('breathe');
          
          // After 10 seconds of breathing, transition to "Begin"
          setTimeout(() => {
            setMeditationStep('begin');
            
            // After 5 seconds of "Begin", show therapy interface
            setTimeout(() => {
              setMeditationStep('done');
              setShowTypeSelector(false);
            }, 5000);
          }, 10000);
        }, 1000); // Show 1 for 1 second
      }, 1000); // Show 2 for 1 second
    }, 1000); // Show 3 for 1 second
  };

  // These are kept for compatibility with older code
  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(currentTime);
  
  // Format date in the style from the digital clock component
  const digitalClockDate = `${day}, ${month} ${date} ${year}`;


  // Function to open therapist selection modal
  const openTherapistSelector = () => {
    setShowTypeSelector(true);
  };

  // Use React.createElement to avoid JSX parsing issues
  return React.createElement(React.Fragment, null, [
    
    // Persistent blur background that stays throughout the meditation
    meditationStep !== 'none' && meditationStep !== 'done' && React.createElement("div", {
      key: "persistent-blur-bg",
      className: "fixed inset-0 z-40 bg-black/70 backdrop-blur-xl pointer-events-none",
      style: { transition: "opacity 0.7s ease-in-out" }
    }),
    
    // Unified Meditation Overlay with AnimatePresence to handle text transitions
    React.createElement(AnimatePresence, { mode: "wait", key: "meditation-presence" }, 
      // Countdown
      meditationStep === 'countdown' && React.createElement(motion.div, {
        key: "countdown-overlay",
        className: "fixed inset-0 flex items-center justify-center z-50 pointer-events-none",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.7 }
      }, [
        React.createElement(motion.div, {
          key: "countdown-number",
          className: "text-white text-7xl sm:text-8xl md:text-9xl font-bold countdown-number",
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 1.2, opacity: 0 },
          transition: { duration: 0.5 }
        }, countdownValue)
      ]),
      
      // Breathe Text
      meditationStep === 'breathe' && React.createElement(motion.div, {
        key: "breathe-overlay",
        className: "fixed inset-0 flex items-center justify-center z-50 pointer-events-none",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.7 }
      }, [
        React.createElement(motion.div, {
          key: "breathe-text",
          className: "text-white text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold breath-text",
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.9 },
          transition: { duration: 0.7 }
        }, "Breathe")
      ]),
      
      // Begin Text
      meditationStep === 'begin' && React.createElement(motion.div, {
        key: "begin-overlay",
        className: "fixed inset-0 flex items-center justify-center z-50 pointer-events-none",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.7 }
      }, [
        React.createElement(motion.div, {
          key: "begin-text",
          className: "text-white text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold begin-text",
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.9 },
          transition: { duration: 0.7 }
        }, "Begin")
      ])
    ),
    
    // Therapy Type Selector Popup
    React.createElement(TherapyTypeSelector, {
      key: "therapy-selector",
      isOpen: showTypeSelector,
      onClose: () => setShowTypeSelector(false),
      onSelect: handleSelectTherapyType
    }),
    
    // Stars background for session
    isSessionActive && React.createElement("div", {
      key: "stars-container",
      className: "fixed inset-0 w-full h-full overflow-hidden pointer-events-none",
      style: { 
        zIndex: 1,
        bottom: "-5px", // Extend below viewport
        height: "calc(100vh + 5px)" // Make taller than viewport
      }
    }, [
      React.createElement("div", { 
        key: "stars", 
        className: "stars" 
      }),
      React.createElement("div", {
        key: "shooting-star-1",
        className: "shooting-star"
      }),
      React.createElement("div", {
        key: "shooting-star-2",
        className: "shooting-star"
      }),
      React.createElement("div", {
        key: "shooting-star-3",
        className: "shooting-star"
      })
    ]),
    
    // Night sky background
    isSessionActive && React.createElement("div", {
      key: "night-sky-bg",
      className: "fixed inset-0 bg-gradient-to-b from-[#0b0b2b] via-[#1b2735] to-[#090a0f]",
      style: { 
        zIndex: 0, 
        overflowX: "hidden",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%", 
        height: "100%"
      }
    }),
    
    // Gradient background with animated circles for inactive session
    !isSessionActive && React.createElement("div", {
      key: "gradient-bg",
      className: "gradient-bg",
      style: { zIndex: 0 }
    }, [
      React.createElement("div", {
        key: "gradient-container",
        className: "gradient-container",
      }, [
        React.createElement("div", {
          key: "circle-small",
          className: "circle-small"
        }),
        React.createElement("div", {
          key: "circle-medium",
          className: "circle-medium"
        }),
        React.createElement("div", {
          key: "circle-large",
          className: "circle-large"
        }),
        React.createElement("div", {
          key: "circle-xlarge",
          className: "circle-xlarge"
        }),
        React.createElement("div", {
          key: "circle-xxlarge",
          className: "circle-xxlarge"
        })
      ])
    ]),
    
    // Main Content
    React.createElement("div", { 
      key: "main-container",
      className: "min-h-screen w-full transition-all duration-300 ease-in-out opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards] relative z-10 bg-transparent overflow-x-hidden"
  }, [
    // Main content wrapper
    React.createElement("div", { 
      key: "main-content",
      className: "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-10 pb-16 relative z-10"
    }, [
      // Date/Time Header
      React.createElement("div", {
        key: "header",
        className: "flex flex-col md:flex-row md:justify-between md:items-center mb-8"
      }, [
        // Title and date
        React.createElement("div", {
          key: "title-date",
          className: "mb-4 md:mb-0 opacity-0 animate-[fadeIn_0.4s_ease-in-out_forwards]"
        }, [
          // Title removed as requested
        ]),
        
        // Digital clock component - centered on mobile
        React.createElement("div", {
          key: "digital-clock",
          className: `digital-clock-container ${
            isSessionActive ? 'text-white' : 'text-black/80'
          } transition-all duration-500 opacity-0 animate-[fadeIn_0.4s_ease-in-out_0.1s_forwards] mx-auto md:mx-0`
        }, [
          // Digital time display
          React.createElement("div", {
            key: "digital-time",
            className: `digital-time ${isSessionActive ? 'neon-text' : ''}`
          }, [
            React.createElement("div", {
              key: "hours",
              className: "hours"
            }, hours),
            React.createElement("div", {
              key: "separator1",
              className: "separator"
            }, ":"),
            React.createElement("div", {
              key: "minutes",
              className: "minutes"
            }, minutes),
            React.createElement("div", {
              key: "separator2",
              className: "separator"
            }, ":"),
            React.createElement("div", {
              key: "seconds",
              className: "seconds"
            }, seconds),
            React.createElement("div", {
              key: "am-pm",
              className: "am-pm"
            }, ampm)
          ]),
          
          // Digital date display
          React.createElement("div", {
            key: "digital-date",
            className: `digital-date ${isSessionActive ? 'neon-text' : ''}`
          }, digitalClockDate)
        ])
      ]),
      
      // Main card content
      React.createElement("div", {
        key: "main-card",
        className: "grid grid-cols-1 md:grid-cols-3 gap-8 rounded-xl backdrop-blur-xs bg-transparent"
      }, [
        // Card session
        React.createElement("div", {
          key: "session-card",
          className: `md:col-span-3 relative overflow-hidden rounded-lg shadow-xl transition-all duration-700 opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards] z-10 ${
            isSessionActive 
              ? 'bg-transparent p-6 md:p-8 lg:p-10 rounded-xl' 
              : 'bg-transparent rounded-xl p-10 sm:p-40 md:p-44 lg:p-48 bg-transparent'
          }`
        }, [
          // Card content
          React.createElement("div", {
            key: "card-content",
            className: "relative z-10 rounded-xl"
          }, [
            // Session header with status indicator and therapist info
            React.createElement("div", {
              key: "session-header",
              className: "mb-8 flex flex-col items-center hide-during-session"
            }, [
              // Switch therapist button - moved to top
              !isSessionActive ? 
                React.createElement("div", {
                  key: "action-buttons",
                  className: "self-end mb-4"
                }, [
                  React.createElement("button", {
                    key: "switch-therapist",
                    onClick: openTherapistSelector,
                    className: `flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-300 hover:cursor-pointer ${
                      isSessionActive 
                        ? 'bg-red-700/30 text-white-300 hover:bg-red-700/40' 
                        : 'bg-red-500/60 text-black hover:bg-red-500/70'
                    }`
                  }, [
                    React.createElement("svg", {
                      key: "switch-icon",
                      className: "h-3.5 w-3.5 mr-1",
                      fill: "none",
                      viewBox: "0 0 24 24",
                      stroke: "currentColor"
                    }, React.createElement("path", {
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      strokeWidth: 2,
                      d: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    })),
                    "Switch Therapist"
                  ])
                ]) : null,
              // Therapist info - Enhanced centered layout
              React.createElement("div", {
                key: "therapist",
                className: "flex flex-col items-center"
              }, [
                // Doctor image container
                React.createElement("div", {
                  key: "therapist-photo",
                  className: `w-16 h-16 rounded-full overflow-hidden border-2 transition-colors duration-500 mb-2 ${
                    isSessionActive 
                      ? 'border-blue-500' 
                      : 'border-blue-300'
                  }`
                }, [
                  React.createElement("div", {
                    key: "photo-placeholder",
                    className: `w-full h-full ${
                      isSessionActive 
                        ? 'bg-gradient-to-br from-purple-500/80 to-blue-600/80' 
                        : 'bg-gradient-to-br from-blue-100 to-blue-200'
                    } flex items-center justify-center`
                  }, [
                    // Simple approach with two containers and conditional rendering
                    React.createElement(React.Fragment, { key: "doctor-image-container" }, [
                      // A simpler approach: just use a regular image element instead of next/image
                      // Actual doc photo or fallback icon - handled with onError
                      React.createElement("img", {
                        key: "doctor-photo",
                        src: sessionType === 'couple' ? '/images/dr-maya-thompson.jpg' :
                              sessionType === 'solo' ? '/images/dr-elliot-mackaphy.jpg' :
                              '/images/dr-jada-pearson.jpg',
                        alt: selectedAssistant.name,
                        className: "w-full h-full object-cover",
                        onError: (e) => {
                          // If image fails to load, replace with fallback icon
                          const target = e.target as HTMLImageElement;
                          // Replace the src with a transparent pixel
                          target.style.display = 'none';
                          // Show fallback icon
                          const fallbackContainer = document.getElementById('doctor-fallback-' + (sessionType || 'default'));
                          if (fallbackContainer) {
                            fallbackContainer.style.display = 'flex';
                          }
                        }
                      }),
                      
                      // Fallback icon - Initially hidden, shown if image fails to load
                      React.createElement("div", {
                        id: 'doctor-fallback-' + (sessionType || 'default'),
                        key: "fallback-container",
                        className: "w-full h-full absolute inset-0 flex items-center justify-center",
                        style: { display: 'none' } // Hidden by default, shown when image fails
                      }, 
                        React.createElement("svg", {
                          key: "doctor-icon",
                          className: `h-8 w-8 transition-colors duration-500 ${isSessionActive ? 'text-white' : 'text-indigo-600'}`,
                          fill: "none",
                          viewBox: "0 0 24 24",
                          stroke: "currentColor"
                        }, React.createElement("path", {
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          strokeWidth: 1.5,
                          d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        }))
                      )
                    ])
                  ])
                ]),
                // Therapist text - centered
                React.createElement("div", {
                  key: "therapist-text",
                  className: "text-center"
                }, [
                  React.createElement("h2", {
                    key: "therapist-name",
                    className: `text-xl font-bold transition-colors duration-500 mb-1 ${isSessionActive ? 'text-white' : 'text-black'}`
                  }, selectedAssistant.name),
                  React.createElement("p", {
                    key: "therapist-type",
                    className: `text-xs font-medium px-3 py-1 rounded-full transition-colors duration-500 ${
                      isSessionActive 
                        ? 'bg-green-500/50 text-white' 
                        : 'bg-indigo-50/50 text-black'
                    }`
                  }, sessionType === 'couple' ? 'AI Relationship Therapist' : 
                     sessionType === 'solo' ? 'AI Personal Therapist' : 
                     'AI Family Therapist')
                ])
              ]),
              
              // Status indicator (when active) - centered, shown prominently when active
              isSessionActive ? 
                React.createElement("div", {
                  key: "status",
                  className: "flex items-center justify-center mt-2 mb-4"
                }, [
                  React.createElement("div", {
                    key: "status-dot",
                    className: "h-2.5 w-2.5 bg-green-400 rounded-full animate-pulse mr-2"
                  }),
                  React.createElement("span", {
                    key: "status-text",
                    className: "text-white text-sm font-medium"
                  }, "Live Session")
                ]) : null
            ]),
            
            // Session welcome text or active message
            React.createElement("div", {
              key: "session-content",
              className: `transition-colors duration-500 ${isSessionActive ? 'text-white' : 'text-black'}`
            }, [
              // Session info - Enhanced styling
              isSessionActive ? 
                React.createElement("div", {
                  key: "active-info",
                  className: "p-4 md:p-6 rounded-2xl mb-4 md:mb-8 shadow-inner bg-transparent"
                }, [
                  // Info icon at the top with pulsing animation
                  React.createElement("div", {
                    key: "info-header",
                    className: "flex justify-center mb-2"
                  }, [
                    React.createElement("div", {
                      key: "info-icon-container",
                      className: "w-10 h-1 rounded-full bg-transparent flex items-center justify-center mb-1 shadow-lg animate-[float_4s_ease-in-out_infinite]"
                    }, [
                      React.createElement("svg", {
                        key: "info-icon",
                        className: "w-5 h-5 text-white",
                        fill: "none",
                        viewBox: "0 0 24 24",
                        stroke: "currentColor"
                      }, React.createElement("path", {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        strokeWidth: 1.5,
                        d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      }))
                    ])
                  ]),
                  // Session message with enhanced styling - hidden on mobile
                  React.createElement("p", {
                    key: "active-message",
                    className: "hidden sm:block text-white text-center text-xs sm:text-sm lg:text-base bg-transparent py-3 px-4 rounded-lg backdrop-blur-sm shadow-inner mt-2 z-50 relative mx-auto max-w-[95%] md:max-w-[90%] lg:max-w-[80%]"
                  }, 
                    sessionType === 'couple' ? 
                      'Speak naturally and I will respond to help with your relationship concerns. Everything shared is completely private and secure.' :
                     sessionType === 'solo' ?
                      'Speak naturally and I will respond to help with your personal concerns. Everything shared is completely private and secure.' :
                      'Speak naturally and I will respond to help with your family concerns. Everything shared is completely private and secure.'
                  )
                ]) :
                React.createElement("div", {
                  key: "welcome-info",
                  className: "space-y-4 md:space-y-5 mb-8 text-center max-w-xl mx-auto hide-during-session p-7 sm:p-8 rounded-xl backdrop-blur-sm bg-white/60 shadow-md border border-white/40"
                }, [
                 
                  // Welcome header
                  React.createElement("h2", {
                    key: "welcome-header",
                    className: "text-xl sm:text-2xl font-medium text-black mb-3"
                  }, 
                    `Hello! Welcome to your session`
                  ),
                    // Decorative element
                    React.createElement("div", {
                      key: "decorative-line",
                      className: "h-0.5 bg-gradient-to-r from-transparent via-black/50 to-transparent mx-auto mb-4"
                    }),
                  // Therapist intro 
                  React.createElement("div", {
                    key: "therapist-intro",
                    className: "flex flex-col items-center mb-4 space-y-2"
                  }, [
                    // Therapist name with emphasis
                    React.createElement("p", {
                      key: "therapist-name",
                      className: "text-lg sm:text-xl font-medium text-gray-800"
                    }, 
                      `I'm ${selectedAssistant.name}`
                    ),
                    
                  ]),
                  
                
                  
                  // Warm welcome message
                  React.createElement("p", {
                    key: "warm-welcome",
                    className: "text-base text-gray-700 leading-relaxed max-w-md mx-auto px-2"
                  }, 
                    sessionType === 'couple' ? 
                     `I'm delighted to meet you both${userProfile.name ? ', ' + userProfile.name : ''}${userProfile.partnerName ? ' and ' + userProfile.partnerName : ''}, today! This is a safe space where we can work together on strengthening your connection and understanding each other better.` :
                     sessionType === 'solo' ? 
                     `I'm so glad you're here today${userProfile.name ? ', ' + userProfile.name : ''}! This is your private, judgment-free space where we can explore whatever is on your mind and work toward your personal goals.` :
                     `Hello ${userProfile.name ? '  ' + userProfile.name : ''}${userProfile.partnerName ? ', ' + userProfile.partnerName : ''}${userProfile.familyMember1 ? ', ' + userProfile.familyMember1 : ''}${userProfile.familyMember2 ? ', ' + userProfile.familyMember2 : ''}${userProfile.familyMember3 ? ', ' + userProfile.familyMember3 : ''}${userProfile.familyMember4 ? ', ' + userProfile.familyMember4 : ''}!! I'm excited to meet everyone today This is a supportive environment where all family members can share openly as we work together to improve communication and connection.`
                  ),
                  // CTA message
                  React.createElement("div", {
                    key: "cta-container",
                    className: "mt-6"
                  }, 
                    React.createElement("p", {
                      key: "cta-message",
                      className: "text-gray-700/90 font-medium py-3 px-6 border border-indigo-200 rounded-lg bg-indigo-50/70 backdrop-blur-sm inline-block text-sm shadow-sm"
                    }, "Ready to talk? Click the button below.")
                  )
                ]),
              
              // Therapy button with enhanced style - centered text on mobile only
              React.createElement("div", {
                key: "button-container",
                className: "flex justify-center items-center w-full text-center sm:text-left -mt-14"
              }, 
                React.createElement("div", {
                  key: "button-wrapper",
                  className: "max-w-md w-full"
                }, React.createElement(TherapyButton, { 
                  userId: userId, 
                  assistantConfig: selectedAssistant, 
                  therapyType: sessionType || 'couple' 
                }))
              )
            ])
          ])
        ])
      ])
    ])
  ])
  ]);
}