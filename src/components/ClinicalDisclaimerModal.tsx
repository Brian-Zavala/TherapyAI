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
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleAccept = () => {
    if (acknowledged) {
      onAccept();
    }
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
      description: "All insights are reviewed by your therapist before display",
      disclaimer: "Professional oversight required"
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
            onClick={onDecline}
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
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl">
              {/* Gradient background effects */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />
              </div>

              {/* Content */}
              <div className="relative p-8">
                {/* Header */}
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center mb-8"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
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
                        "relative p-6 rounded-xl border transition-all duration-300",
                        hoveredFeature === index 
                          ? "bg-white/10 border-white/20 shadow-lg" 
                          : "bg-white/5 border-white/10"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-3 rounded-lg transition-all duration-300",
                          hoveredFeature === index
                            ? "bg-gradient-to-br from-purple-500/30 to-pink-500/30"
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
                  className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6 mb-8"
                >
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Important Information
                  </h4>
                  <ul className="space-y-2 text-sm text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>AI insights are supplementary tools with 25-40% confidence levels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>Always consult your therapist for personalized guidance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>This platform is not HIPAA compliant for production use</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>In case of emergency, contact your therapist or emergency services immediately</span>
                    </li>
                  </ul>
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
                          ? "bg-gradient-to-br from-purple-500 to-pink-500 border-transparent" 
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

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex gap-4"
                >
                  <Button
                    variant="outline"
                    onClick={onDecline}
                    className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30"
                  >
                    I'll Review Later
                  </Button>
                  <Button
                    onClick={handleAccept}
                    disabled={!acknowledged}
                    className={cn(
                      "flex-1 transition-all duration-300",
                      acknowledged
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
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