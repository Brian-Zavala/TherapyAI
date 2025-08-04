"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { ShieldCheck, Brain, Heart, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClinicalDisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function ClinicalDisclaimerModal({ 
  isOpen, 
  onAccept, 
  onDecline 
}: ClinicalDisclaimerModalProps) {
  const [isClient, setIsClient] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on both body and html elements
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Restore scrolling
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
      document.documentElement.style.overflow = 'unset';
    }
    return () => {
      // Cleanup on unmount
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleAccept = () => {
    if (acknowledged) {
      // Clear any declined flags and set permission granted
      localStorage.removeItem('dashboardDisclaimerDeclined');
      localStorage.setItem('dashboardPermissionGranted', 'true');
      onAccept();
    }
  };

  const handleDecline = () => {
    // Set declined flag to show permission page next time
    localStorage.setItem('dashboardDisclaimerDeclined', 'true');
    onDecline();
  };

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Insights",
      description: "Our AI analyzes session patterns to provide supplementary insights",
      disclaimer: "25-40% confidence level"
    },
    {
      icon: Heart,
      title: "Therapist Collaboration",
      description: "Evidence-based methods approved by licensed therapists",
      disclaimer: "Professional therapy insight"
    },
    {
      icon: ShieldCheck,
      title: "Your Safety First",
      description: "Crisis detection and immediate support when needed",
      disclaimer: "Not a replacement for therapy"
    }
  ];

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with full height coverage */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 w-full h-full min-h-screen bg-black/60 backdrop-blur-sm z-[10000] pointer-events-auto"
            onClick={handleDecline}
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              width: '100vw',
              height: '100vh',
              minHeight: '100vh'
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
              type: "spring", 
              duration: 0.5,
              damping: 25,
              stiffness: 300
            }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 sm:p-6 lg:p-8 pointer-events-none"
          >
            <div className="relative w-full max-w-2xl max-h-[90vh] min-h-[600px] overflow-y-auto rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-auto" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(30, 58, 138, 0.1), rgba(30, 58, 138, 0.05))' }}>
              {/* Gradient background effects - Blue liquid glass theme */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-blue-800/15 to-blue-900/20 rounded-2xl" />
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-2xl" />
              </div>

              {/* Content - Responsive padding */}
              <div className="relative p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center mb-8"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-400/20 mb-4">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Welcome to Your AI-Enhanced Therapy Journey
                  </h2>
                  <p className="text-white/70 text-lg">
                    Understanding how we support your mental health
                  </p>
                </motion.div>

                {/* Features Grid */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="grid gap-4 mb-8"
                >
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      onHoverStart={() => setHoveredFeature(index)}
                      onHoverEnd={() => setHoveredFeature(null)}
                      className={cn(
                        "relative rounded-xl border transition-all duration-300 overflow-hidden",
                        hoveredFeature === index 
                          ? "border-white/20 shadow-lg" 
                          : "border-white/10"
                      )}
                    >
                      {/* Frosted glass background layer - full card coverage */}
                      <div 
                        className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl" 
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                      />
                      
                      {/* Content with padding */}
                      <div className="relative flex items-start gap-4 p-6 z-10">
                        <div className={cn(
                          "p-3 rounded-lg transition-all duration-300",
                          hoveredFeature === index
                            ? "bg-gradient-to-br from-blue-500/30 to-blue-400/30"
                            : "bg-white/10"
                        )}>
                          <feature.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {feature.title}
                          </h3>
                          <p className="text-white/70 text-sm mb-2">
                            {feature.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs text-yellow-500/80">
                              {feature.disclaimer}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Important Notice */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="relative border border-amber-500/20 rounded-xl mb-8 overflow-hidden"
                >
                  {/* Frosted glass background layer - full coverage */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-xl" 
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                  />
                  
                  <div className="relative p-6 z-10">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Important Information
                  </h4>
                  <ul className="space-y-2 text-sm text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>AI insights are supplementary tools</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>Always consult your therapist for personalized guidance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>This platform is HIPAA compliant for secure therapy sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>In case of emergency, contact emergency services immediately</span>
                    </li>
                  </ul>
                  </div>
                </motion.div>

                {/* Acknowledgment */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mb-8"
                >
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={cn(
                        "w-6 h-6 rounded-md border-2 transition-all duration-300",
                        acknowledged 
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 border-transparent" 
                          : "bg-white/5 border-white/20 group-hover:border-white/40"
                      )}>
                        {acknowledged && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-full h-full flex items-center justify-center"
                          >
                            <CheckCircle className="w-4 h-4 text-white" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                    <span className="text-white/80 text-sm leading-relaxed">
                      I understand that AI insights are supplementary tools with limitations, 
                      and I will work with my therapist to interpret and apply any insights 
                      to my specific situation.
                    </span>
                  </label>
                </motion.div>

                {/* Actions - Responsive button container */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4"
                >
                  <Button
                    variant="outline"
                    onClick={handleDecline}
                    className="w-full sm:flex-1 min-w-0 px-4 py-2.5 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 text-sm sm:text-base whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    I'll Review Later
                  </Button>
                  <Button
                    onClick={handleAccept}
                    disabled={!acknowledged}
                    className={cn(
                      "w-full sm:flex-1 min-w-0 px-4 py-2.5 transition-all duration-300 text-sm sm:text-base whitespace-nowrap overflow-hidden text-ellipsis",
                      acknowledged
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                        : "bg-white/10 text-white/50 cursor-not-allowed"
                    )}
                  >
                    I Understand & Continue
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!isClient) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    const root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
    return createPortal(modalContent, root);
  }

  return createPortal(modalContent, modalRoot);
}