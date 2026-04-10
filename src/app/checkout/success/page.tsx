"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon, SparklesIcon, ClockIcon, CalendarIcon, CreditCardIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useSession } from '@/hooks/useClerkSession'

interface SubscriptionDetails {
  planName: string;
  billingCycle: string;
  amount: string;
  features: string[];
  nextBillingDate?: string;
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const sessionId = searchParams.get('session_id');
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [shouldRedirect, setShouldRedirect] = useState(true);

  useEffect(() => {
    // Trigger confetti animation
    const triggerConfetti = () => {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Create confetti from multiple origins
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // Additional burst in the center
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 }
      });
    };

    // Fetch subscription details
    const fetchSubscriptionDetails = async () => {
      try {
        // For now, we'll use mock data based on URL params
        // In production, this would fetch from the API
        const mockDetails: SubscriptionDetails = {
          planName: 'Essential Plan',
          billingCycle: 'Monthly',
          amount: '$12.99',
          features: [
            '8 sessions per month',
            '20 minutes per session',
            'Full analytics dashboard',
            'Crisis detection & support',
            'Session transcripts'
          ],
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })
        };
        
        setSubscriptionDetails(mockDetails);
      } catch (error) {
        console.error('Error fetching subscription details:', error);
      }
    };

    // Simulate loading and trigger confetti
    setTimeout(() => {
      setIsLoading(false);
      triggerConfetti();
      fetchSubscriptionDetails();
    }, 1000);

  }, []);

  // Separate effect for countdown to avoid setState during render
  useEffect(() => {
    if (!shouldRedirect) return;
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Use setTimeout to avoid setState during render
          setTimeout(() => {
            router.push('/dashboard');
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [router, shouldRedirect]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 overflow-y-auto">
      {/* Enhanced background gradient mesh */}
      <div className="fixed inset-0 w-full h-full pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-800/10 via-transparent to-transparent" />
      </div>

      {/* Floating particles animation */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-green-400/20 rounded-full blur-sm"
            animate={{
              y: [-20, -100],
              x: [0, (i % 2 === 0 ? 20 : -20)],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeOut"
            }}
            style={{
              left: `${20 + i * 15}%`,
              bottom: `${10 + i * 5}%`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-3 sm:px-6 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-900 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-green-400 border-t-transparent" />
                </div>
              </div>
              <p className="text-white/80 text-base sm:text-lg lg:text-xl mt-6 font-medium">Processing your subscription...</p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="max-w-2xl w-full"
            >
              {/* Main success card */}
              <motion.div
                variants={itemVariants}
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* Header section */}
                <div className="bg-gradient-to-br from-green-400/20 to-emerald-500/20 p-6 sm:p-8 lg:p-10 text-center border-b border-white/10">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.3
                    }}
                    className="inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mb-6"
                  >
                    <div className="relative w-full h-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-pulse" />
                      <div className="relative w-full h-full bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl">
                        <CheckCircleIcon className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-white" />
                      </div>
                    </div>
                  </motion.div>

                  <motion.h1
                    variants={itemVariants}
                    className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3"
                  >
                    Welcome to TherapyAI!
                  </motion.h1>

                  <motion.p
                    variants={itemVariants}
                    className="text-white/90 text-base sm:text-lg lg:text-xl font-medium flex items-center justify-center gap-2"
                  >
                    <SparklesIcon className="w-5 h-5 text-yellow-400" />
                    {session?.user?.name ? `${session.user.name}, your` : 'Your'} subscription is now active
                    <SparklesIcon className="w-5 h-5 text-yellow-400" />
                  </motion.p>
                </div>

                {/* Subscription details */}
                {subscriptionDetails && (
                  <motion.div
                    variants={itemVariants}
                    className="p-6 sm:p-8 bg-white/5 border-b border-white/10"
                  >
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                      <CreditCardIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                      Your {subscriptionDetails.planName}
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white/5 rounded-lg p-3 sm:p-4">
                        <p className="text-white/60 text-xs sm:text-sm mb-1">Billing Cycle</p>
                        <p className="text-white font-semibold text-sm sm:text-base lg:text-lg">
                          {subscriptionDetails.amount} / {subscriptionDetails.billingCycle}
                        </p>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-3 sm:p-4">
                        <p className="text-white/60 text-xs sm:text-sm mb-1">Next Billing Date</p>
                        <p className="text-white font-semibold text-sm sm:text-base lg:text-lg flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {subscriptionDetails.nextBillingDate}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-white/80 text-sm sm:text-base font-medium">Your plan includes:</p>
                      <ul className="space-y-1.5">
                        {subscriptionDetails.features.map((feature, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            className="flex items-center gap-2 text-white/70 text-xs sm:text-sm lg:text-base"
                          >
                            <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                            {feature}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}

                {/* Action buttons */}
                <div className="p-6 sm:p-8 space-y-3">
                  <motion.div variants={itemVariants}>
                    <Link
                      href="/dashboard"
                      className="group flex items-center justify-center w-full bg-gradient-to-r from-green-400 to-emerald-500 text-black font-semibold py-3.5 sm:py-4 px-6 rounded-lg sm:rounded-xl hover:from-green-500 hover:to-emerald-600 transform hover:scale-[1.02] transition-all duration-300 shadow-lg text-sm sm:text-base lg:text-lg"
                    >
                      Go to Dashboard
                      <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Link
                      href="/dashboard/therapy"
                      className="group flex items-center justify-center w-full bg-white/20 backdrop-blur-md text-white font-semibold py-3.5 sm:py-4 px-6 rounded-lg sm:rounded-xl hover:bg-white/30 transform hover:scale-[1.02] transition-all duration-300 border border-white/20 text-sm sm:text-base lg:text-lg"
                    >
                      Start Your First Session
                      <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 ml-2 text-yellow-400" />
                    </Link>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Link
                      href="/dashboard/resources"
                      className="group flex items-center justify-center w-full bg-transparent text-white/70 hover:text-white font-medium py-2 px-4 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                    >
                      Explore Resources & Guides
                      <ArrowRightIcon className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </motion.div>
                </div>

                {/* Auto-redirect notice */}
                <motion.div
                  variants={itemVariants}
                  className="px-6 pb-6 sm:px-8 sm:pb-8"
                >
                  <div className="bg-white/5 rounded-lg p-3 sm:p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                      <p className="text-white/70 text-xs sm:text-sm">
                        Redirecting to dashboard in {countdown} seconds...
                      </p>
                    </div>
                    <button
                      onClick={() => setShouldRedirect(false)}
                      className="text-white/50 hover:text-white text-xs sm:text-sm underline transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </motion.div>

              {/* Transaction ID */}
              {sessionId && (
                <motion.p
                  variants={itemVariants}
                  className="text-center text-white/40 text-xs sm:text-sm mt-6 font-mono"
                >
                  Transaction ID: {sessionId}
                </motion.p>
              )}

              {/* Help text */}
              <motion.div
                variants={itemVariants}
                className="text-center mt-8"
              >
                <p className="text-white/60 text-xs sm:text-sm">
                  Need help? Contact{' '}
                  <Link href="/support" className="text-green-400 hover:text-green-300 underline">
                    support
                  </Link>
                  {' '}or check out our{' '}
                  <Link href="/help" className="text-green-400 hover:text-green-300 underline">
                    getting started guide
                  </Link>
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}