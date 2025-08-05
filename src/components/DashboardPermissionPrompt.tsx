"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, ShieldCheck } from 'lucide-react';
import { ClinicalDisclaimerModal } from '@/components/ClinicalDisclaimerModal';

// Dynamically import Lottie to reduce initial bundle size
const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-white/5 animate-pulse rounded-full" />
});

// Animation cache for performance
const animationCache = new Map<string, any>();

interface DashboardPermissionPromptProps {
  onPermissionGranted?: () => void;
}

export function DashboardPermissionPrompt({ onPermissionGranted }: DashboardPermissionPromptProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [animationData, setAnimationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load Lottie animation
  useEffect(() => {
    const loadAnimation = async () => {
      const url = '/animations/Businessman flies up with rocket.json';
      
      if (animationCache.has(url)) {
        setAnimationData(animationCache.get(url));
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          animationCache.set(url, data);
          setAnimationData(data);
        }
      } catch (error) {
        console.error('Failed to load animation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnimation();
  }, []);

  const handleAccept = () => {
    // Set permission granted in localStorage
    localStorage.setItem('dashboardPermissionGranted', 'true');
    setShowModal(false);
    
    // Call the callback if provided
    if (onPermissionGranted) {
      onPermissionGranted();
    } else {
      // Reload the page to refresh dashboard state
      window.location.reload();
    }
  };

  const handleDecline = () => {
    setShowModal(false);
  };

  const handleGrantPermissions = () => {
    setShowModal(true);
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <>
      <div className="fixed inset-0 w-full h-full bg-gray-950 overflow-hidden">
        {/* Static gradient background matching Lottie theme */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Deep blue gradient base */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900" />
          
          {/* Subtle static gradient accents */}
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
          
          {/* Mesh gradient overlay */}
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-full h-full overflow-y-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            {/* Lottie Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 mx-auto mb-6 sm:mb-8"
            >
              {/* Subtle glow effect behind animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 blur-[60px] scale-110" />
              
              {!isLoading && animationData && (
                <Lottie
                  animationData={animationData}
                  loop={true}
                  autoplay={true}
                  className="relative z-10 w-full h-full"
                  style={{ willChange: 'transform' }}
                />
              )}
            </motion.div>

            {/* Title and description */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 leading-tight"
            >
              Dashboard Access Required
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-base sm:text-lg md:text-xl text-white/70 mb-8 sm:mb-10 md:mb-12 px-4 max-w-lg mx-auto"
            >
              To view your therapy insights and metrics, please grant permission for AI-enhanced analytics
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center relative z-20"
            >
              <div className="relative inline-block">
                {/* Animated rainbow glow */}
                <div 
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: `radial-gradient(circle at center, 
                      transparent 0%,
                      #ff0080 10%,
                      #ff8c00 20%, 
                      #ffd700 30%,
                      #00ff00 40%,
                      #00ffff 50%,
                      #0080ff 60%,
                      #8000ff 70%,
                      #ff0080 80%,
                      transparent 100%
                    )`,
                    filter: 'blur(20px)',
                    opacity: 0.7,
                    animation: 'rainbowExpand 3s ease-in-out infinite',
                  }}
                />
                
                <Button
                  type="button"
                  onClick={handleGrantPermissions}
                  size="lg"
                  className="relative text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 group pointer-events-auto z-10 cursor-pointer overflow-hidden"
                >
                  {/* Animated rainbow overlay inside button */}
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(circle at center, 
                        #ff0080 0%,
                        #ff8c00 14%,
                        #ffd700 28%,
                        #00ff00 42%,
                        #00ffff 56%,
                        #0080ff 70%,
                        #8000ff 84%,
                        #ff0080 100%
                      )`,
                      backgroundSize: '200% 200%',
                      backgroundPosition: 'center',
                      animation: 'rainbowPulse 4s ease-in-out infinite',
                      opacity: 0.9,
                    }}
                  />
                  <span className="relative z-10 flex items-center font-semibold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                    <ShieldCheck className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                    Grant Permissions
                  </span>
                </Button>
                
                <style jsx global>{`
                  @keyframes rainbowExpand {
                    0% {
                      transform: scale(0.8);
                      opacity: 0.7;
                    }
                    50% {
                      transform: scale(1.4);
                      opacity: 0.5;
                    }
                    100% {
                      transform: scale(0.8);
                      opacity: 0.7;
                    }
                  }
                  
                  @keyframes rainbowPulse {
                    0% {
                      background-size: 100% 100%;
                    }
                    50% {
                      background-size: 300% 300%;
                    }
                    100% {
                      background-size: 100% 100%;
                    }
                  }
                  
                  @media (prefers-reduced-motion: reduce) {
                    @keyframes rainbowExpand,
                    @keyframes rainbowPulse {
                      0%, 100% {
                        transform: none;
                        background-size: 100% 100%;
                      }
                    }
                  }
                `}</style>
              </div>

              <Button
                type="button"
                onClick={handleGoHome}
                variant="outline"
                size="lg"
                className="border-white/20 text-white hover:bg-white/10 hover:border-white/30 px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg transition-all duration-300 group pointer-events-auto relative z-50 cursor-pointer"
              >
                <Home className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Return Home
              </Button>
            </motion.div>

            {/* Additional info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="mt-8 sm:mt-10 md:mt-12 text-xs sm:text-sm text-white/50 max-w-md mx-auto px-4"
            >
              <p>
                Your privacy is important to us. Dashboard metrics are processed locally and only used to enhance your therapy experience.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Clinical Disclaimer Modal */}
      {showModal && (
        <ClinicalDisclaimerModal
          isOpen={showModal}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
    </>
  );
}