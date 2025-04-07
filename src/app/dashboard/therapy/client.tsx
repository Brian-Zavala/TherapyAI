'use client';

import React, { useState, useEffect } from "react";
import TherapyButton from "@/components/TherapyButton";
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

  useEffect(() => {
    const checkActive = () => {
      const hasActiveClass = document.body.classList.contains('session-active');
      setIsSessionActive(hasActiveClass);
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
    
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => {
      observer.disconnect();
      clearInterval(timer);
    };
  }, []);
  
  // Handle therapy type selection
  const handleSelectTherapyType = (type: string) => {
    setSessionType(type);
    
    // Set the appropriate assistant based on the session type
    switch (type) {
      case 'solo':
        setSelectedAssistant(INDIVIDUAL_THERAPY_ASSISTANT_CONFIG);
        break;
      case 'family':
        setSelectedAssistant(FAMILY_THERAPY_ASSISTANT_CONFIG);
        break;
      case 'couple':
      default:
        setSelectedAssistant(COUPLE_THERAPY_ASSISTANT_CONFIG);
        break;
    }
  };

  // Format time
  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Format date
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(currentTime);

  // Use React.createElement to avoid JSX parsing issues
  return React.createElement("div", { 
    className: `min-h-screen transition-all duration-700 ease-in-out opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards] ${
      isSessionActive 
        ? 'bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950' 
        : 'bg-gradient-to-b from-slate-50 via-indigo-50/50 to-purple-50/50'
    }`
  }, [
    // Main content wrapper
    React.createElement("div", { 
      key: "main-content",
      className: "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 relative z-10"
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
          React.createElement("h1", {
            key: "title",
            className: `text-3xl md:text-4xl font-bold transition-colors duration-500 ${isSessionActive ? 'text-white' : 'text-indigo-800'}`
          }, isSessionActive ? 'Therapy Session' : 'Start a Session'),
          React.createElement("p", {
            key: "date",
            className: `text-sm mt-1 transition-colors duration-500 ${isSessionActive ? 'text-indigo-300' : 'text-indigo-600'}`
          }, formattedDate)
        ]),
        
        // Time display
        React.createElement("div", {
          key: "time",
          className: `flex items-center transition-colors duration-500 ${
            isSessionActive ? 'text-indigo-200' : 'text-indigo-700'
          } opacity-0 animate-[fadeIn_0.4s_ease-in-out_0.1s_forwards]`
        }, [
          React.createElement("svg", {
            key: "clock-icon",
            className: "h-5 w-5 mr-2",
            fill: "none",
            viewBox: "0 0 24 24",
            stroke: "currentColor"
          }, React.createElement("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 1.5,
            d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          })),
          React.createElement("span", {
            key: "time-text",
            className: "text-lg font-medium"
          }, formattedTime)
        ])
      ]),
      
      // Main card content
      React.createElement("div", {
        key: "main-card",
        className: "grid grid-cols-1 md:grid-cols-3 gap-8"
      }, [
        // Card session
        React.createElement("div", {
          key: "session-card",
          className: `md:col-span-3 relative overflow-hidden rounded-2xl shadow-xl transition-all duration-700 opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards] ${
            isSessionActive 
              ? 'bg-gradient-to-br from-slate-900/90 to-indigo-900/90 border border-indigo-500/30 p-6' 
              : 'bg-white p-8'
          }`
        }, [
          // Card content
          React.createElement("div", {
            key: "card-content",
            className: "relative z-10"
          }, [
            // Session header with status indicator
            React.createElement("div", {
              key: "session-header",
              className: "mb-6 flex items-center justify-between"
            }, [
              // Therapist info
              React.createElement("div", {
                key: "therapist",
                className: "flex items-center"
              }, [
                React.createElement("div", {
                  key: "therapist-icon",
                  className: `w-10 h-10 flex items-center justify-center rounded-full mr-4 transition-colors duration-500 ${
                    isSessionActive 
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600' 
                      : 'bg-gradient-to-br from-indigo-100 to-purple-100'
                  }`
                }, [
                  React.createElement("svg", {
                    key: "chat-icon",
                    className: `h-5 w-5 transition-colors duration-500 ${isSessionActive ? 'text-white' : 'text-indigo-600'}`,
                    fill: "none",
                    viewBox: "0 0 24 24",
                    stroke: "currentColor"
                  }, React.createElement("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                  }))
                ]),
                React.createElement("div", {
                  key: "therapist-text"
                }, [
                  React.createElement("h2", {
                    key: "therapist-name",
                    className: `text-xl font-bold transition-colors duration-500 ${isSessionActive ? 'text-white' : 'text-indigo-800'}`
                  }, selectedAssistant.name),
                  React.createElement("p", {
                    key: "therapist-type",
                    className: `text-sm transition-colors duration-500 ${isSessionActive ? 'text-indigo-300' : 'text-indigo-600'}`
                  }, sessionType === 'couple' ? 'AI Relationship Therapist' : 
                     sessionType === 'solo' ? 'AI Personal Therapist' : 
                     'AI Family Therapist')
                ])
              ]),
              
              // Status indicator (when active)
              isSessionActive ? React.createElement("div", {
                key: "status",
                className: "flex items-center"
              }, [
                React.createElement("div", {
                  key: "status-dot",
                  className: "h-2.5 w-2.5 bg-green-400 rounded-full animate-pulse mr-2"
                }),
                React.createElement("span", {
                  key: "status-text",
                  className: "text-indigo-200 text-sm font-medium"
                }, "Live Session")
              ]) : null
            ]),
            
            // Session welcome text or active message
            React.createElement("div", {
              key: "session-content",
              className: `transition-colors duration-500 ${isSessionActive ? 'text-white' : 'text-gray-700'}`
            }, [
              // Session info
              isSessionActive ? 
                React.createElement("div", {
                  key: "active-info",
                  className: "p-5 rounded-xl mb-8 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30"
                }, [
                  React.createElement("div", {
                    key: "active-info-content",
                    className: "flex items-start"
                  }, [
                    React.createElement("svg", {
                      key: "info-icon",
                      className: "w-6 h-6 text-indigo-300 mr-3 mt-0.5 flex-shrink-0",
                      fill: "none",
                      viewBox: "0 0 24 24",
                      stroke: "currentColor"
                    }, React.createElement("path", {
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      strokeWidth: 1.5,
                      d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    })),
                    React.createElement("p", {
                      key: "active-message",
                      className: "text-indigo-100"
                    }, 
                      sessionType === 'couple' ? 
                        'Your session is now active. Speak naturally and I will respond to help with your relationship concerns. Everything you share is completely private and secure.' :
                       sessionType === 'solo' ?
                        'Your session is now active. Speak naturally and I will respond to help with your personal concerns. Everything you share is completely private and secure.' :
                        'Your session is now active. Speak naturally and I will respond to help with your family concerns. Everything you share is completely private and secure.'
                    )
                  ])
                ]) :
                React.createElement("div", {
                  key: "welcome-info",
                  className: "space-y-4 mb-8"
                }, [
                  React.createElement("p", {
                    key: "welcome-message"
                  }, 
                    sessionType === 'couple' ? 
                     `Welcome to your confidential couple therapy space. I am ${selectedAssistant.name}, your AI relationship therapist, here to support your journey toward a healthier relationship.` :
                     sessionType === 'solo' ? 
                     `Welcome to your confidential therapy space. I am ${selectedAssistant.name}, your AI personal therapist, here to support your journey toward personal growth and wellbeing.` :
                     `Welcome to your confidential family therapy space. I am ${selectedAssistant.name}, your AI family therapist, here to support your journey toward healthier family dynamics and communication.`
                  ),
                  React.createElement("p", {
                    key: "cta-message",
                    className: "text-indigo-600 font-medium"
                  }, "Click the button below to start a session whenever you're ready to talk.")
                ]),
              
              // Therapy button
              React.createElement("div", {
                key: "button-container",
                className: "flex justify-center items-center mt-8 w-full"
              }, React.createElement(TherapyButton, { 
                userId: userId, 
                assistantConfig: selectedAssistant, 
                therapyType: sessionType || 'couple' 
              }))
            ])
          ])
        ])
      ])
    ])
  ]);
}