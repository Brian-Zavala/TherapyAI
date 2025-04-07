'use client';

import React, { useState, useEffect } from "react";
import TherapyButton from "@/components/TherapyButton";
import { COUPLE_THERAPY_ASSISTANT_CONFIG } from "@/lib/vapi";

export default function TherapyPageClient({ userId }: { userId: string }) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [selectedAssistant] = useState(COUPLE_THERAPY_ASSISTANT_CONFIG);
  
  useEffect(() => {
    const checkActive = () => {
      const hasActiveClass = document.body.classList.contains('session-active');
      setIsSessionActive(hasActiveClass);
    };
    
    checkActive();
    
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          checkActive();
        }
      });
    });
    
    observer.observe(document.body, { attributes: true });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Therapy Session</h1>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">{selectedAssistant.name}</h2>
          <p className="mb-6">
            Welcome to your confidential therapy space. Our AI therapist is here to support your journey toward better mental health and wellbeing.
          </p>
          <div className="my-6 flex justify-center">
            <TherapyButton 
              userId={userId} 
              assistantConfig={selectedAssistant} 
              therapyType="couple" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}