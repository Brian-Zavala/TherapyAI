// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { CheckIcon, XMarkIcon, SparklesIcon, StarIcon, ShieldCheckIcon, HeartIcon, ChartBarIcon, ClockIcon, UsersIcon, BoltIcon } from '@heroicons/react/24/solid';
import { createCheckoutSession } from '@/lib/stripe-client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();

  // Handle Stripe checkout
  const handleCheckout = async (planType: 'essential' | 'growth' | 'unlimited', priceId: string) => {
    try {
      setLoadingPlan(planType);
      
      // Validate price ID is provided
      if (!priceId) {
        throw new Error('Price ID not configured for this plan');
      }
      
      await createCheckoutSession({
        priceId,
        planType,
        isAnnual,
      });
      
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to start checkout. Please try again.');
      setLoadingPlan(null);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  const cardHoverVariants = {
    rest: { scale: 1 },
    hover: { 
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15
      }
    }
  };

  const glowVariants = {
    initial: { opacity: 0.5 },
    animate: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Discover',
      icon: <HeartIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />,
      monthlyPrice: 0,
      annualPrice: 0,
      monthlyPriceId: null,
      annualPriceId: null,
      tagline: 'Start your journey',
      highlight: false,
      gradient: 'from-blue-700 to-blue-900',
      features: [
        { text: '3 sessions per month', included: true },
        { text: '15 minutes per session', included: true },
        { text: 'Basic mood tracking', included: true },
        { text: 'Crisis detection & support', included: true },
        { text: 'Email/text summaries', included: true },
        { text: 'AI-powered insights', included: true },
        { text: 'Priority support', included: false },
        { text: 'Advanced CBT modules', included: false },
        { text: 'Personalized therapy plans', included: false },
      ],
      cta: 'Start Free',
      ctaLink: '/auth/register',
      isFree: true
    },
    {
      id: 'essential',
      name: 'Essential',
      icon: <StarIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />,
      monthlyPrice: 12.99,
      annualPrice: 129,
      monthlyPriceId: 'price_1RuRWNAc4d9YDJXZlgZSzXuY',
      annualPriceId: 'price_1RuRWNAc4d9YDJXZhJM2bxvp',
      tagline: 'Perfect for regular use',
      highlight: false,
      gradient: 'from-blue-600 to-cyan-600',
      features: [
        { text: '8 sessions per month', included: true },
        { text: '20 minutes per session', included: true },
        { text: 'Full analytics dashboard', included: true },
        { text: 'Crisis detection & support', included: true },
        { text: 'Email/text summaries', included: true },
        { text: 'AI-powered insights', included: true },
        { text: 'Session transcripts', included: true },
        { text: 'Advanced CBT modules', included: false },
        { text: 'Personalized therapy plans', included: false },
      ],
      cta: 'Choose Essential',
      ctaLink: '/dashboard/therapy',
      isFree: false
    },
    {
      id: 'growth',
      name: 'Growth',
      icon: <ChartBarIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />,
      monthlyPrice: 24.99,
      annualPrice: 249,
      monthlyPriceId: 'price_1RuRWOAc4d9YDJXZQC1MCmFW',
      annualPriceId: 'price_1RuRWOAc4d9YDJXZLzS6ggkT',
      tagline: 'Most popular choice',
      highlight: true,
      gradient: 'from-green-600 to-emerald-600',
      features: [
        { text: '16 sessions per month', included: true },
        { text: '25 minutes per session', included: true },
        { text: 'Full analytics dashboard', included: true },
        { text: 'Crisis detection & support', included: true },
        { text: 'Email/text summaries', included: true },
        { text: 'AI-powered insights', included: true },
        { text: 'Session transcripts', included: true },
        { text: 'Priority support', included: true },
        { text: 'Personalized therapy plans', included: false },
      ],
      cta: 'Get Growth',
      ctaLink: '/dashboard/therapy',
      isFree: false
    },
    {
      id: 'unlimited',
      name: 'Unlimited',
      icon: <BoltIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />,
      monthlyPrice: 44.99,
      annualPrice: 449,
      monthlyPriceId: 'price_1RuRWPAc4d9YDJXZxJ1MlNmb',
      annualPriceId: 'price_1RuRWPAc4d9YDJXZXQAmj46j',
      tagline: 'Maximum flexibility',
      highlight: false,
      gradient: 'from-indigo-700 to-blue-800',
      features: [
        { text: '40 sessions per month', included: true },
        { text: '30 minutes per session', included: true },
        { text: 'Full analytics dashboard', included: true },
        { text: 'Crisis detection & support', included: true },
        { text: 'Email/text summaries', included: true },
        { text: 'AI-powered insights', included: true },
        { text: 'Session transcripts', included: true },
        { text: 'Priority support', included: true },
        { text: 'Advanced CBT modules', included: true },
        { text: 'Personalized therapy plans', included: true },
        { text: 'Partner/family accounts (2)', included: true },
        { text: 'Downloadable transcripts', included: true },
      ],
      cta: 'Go Unlimited',
      ctaLink: '/dashboard/therapy',
      isFree: false
    }
  ];

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 overflow-y-auto">
      {/* Performant gradient mesh background */}
      <div className="fixed inset-0 w-full h-full pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
        
        {/* Subtle CSS animation for visual interest */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.05) 50%, transparent 100%),
              linear-gradient(45deg, transparent 0%, rgba(6, 182, 212, 0.05) 50%, transparent 100%)
            `,
            backgroundSize: '300% 300%',
            animation: 'gradientShift 30s ease infinite',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-16">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1920px] mx-auto"
        >
          {/* Header */}
          <motion.div 
            variants={itemVariants}
            className="text-center mb-8 sm:mb-12 md:mb-16"
          >
            <motion.div
              className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 mb-4 sm:mb-6 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mr-1.5 sm:mr-2" />
              <span className="text-xs sm:text-sm lg:text-base text-white font-medium">Limited Time: Save 17% Annually</span>
            </motion.div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-white mb-3 sm:mb-4 md:mb-6 text-center">
              Choose Your Therapy Journey
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/80 max-w-3xl mx-auto mb-6 sm:mb-8 text-center">
              Experience AI-powered couple's therapy with flexible plans designed for every relationship
            </p>

            {/* Toggle switch */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <span className={`text-sm sm:text-base lg:text-lg font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-white/60'}`}>
                Monthly
              </span>
              <motion.button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative w-14 h-7 sm:w-16 sm:h-8 lg:w-20 lg:h-10 rounded-full bg-white/20 backdrop-blur-lg border border-white/30 p-1 cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute top-1 w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-white rounded-full shadow-lg"
                  animate={{
                    x: isAnnual ? 'calc(100% + 0.25rem)' : '0%'
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                />
              </motion.button>
              <span className={`text-sm sm:text-base lg:text-lg font-medium transition-colors ${isAnnual ? 'text-white' : 'text-white/60'}`}>
                Annual
              </span>
            </div>
          </motion.div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                variants={itemVariants}
                initial="rest"
                whileHover="hover"
                animate="rest"
                className="relative"
              >
                {plan.highlight && (
                  <div 
                    className="absolute -inset-[2px] rounded-2xl opacity-70"
                    style={{
                      background: 'linear-gradient(135deg, #4ade80, #10b981)',
                      boxShadow: `
                        0 0 20px rgba(74, 222, 128, 0.5),
                        0 0 40px rgba(74, 222, 128, 0.3),
                        0 0 60px rgba(74, 222, 128, 0.1)
                      `,
                      animation: 'pulseGlow 3s ease-in-out infinite',
                      willChange: 'transform',
                      transform: 'translateZ(0)',
                    }}
                  />
                )}
                
                <motion.div
                  variants={cardHoverVariants}
                  className={`relative h-full bg-white/10 backdrop-blur-md border border-white/20 rounded-lg sm:rounded-xl shadow-xl hover:bg-white/15 hover:border-white/30 transition-all duration-300 flex flex-col ${
                    plan.highlight ? 'ring-2 ring-green-400/50' : ''
                  }`}
                  style={{ 
                    minHeight: '600px',
                    willChange: 'transform',
                    transform: 'translateZ(0)'
                  }}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-green-400 to-emerald-400 text-black text-xs sm:text-sm font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg">
                        MOST POPULAR
                      </div>
                    </div>
                  )}

                  <div className="p-4 sm:p-5 md:p-6 flex flex-col h-full">
                    {/* Plan header */}
                    <div className="text-center mb-4 sm:mb-6">
                      <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br ${plan.gradient} mb-3 sm:mb-4`}>
                        <div className="text-white">
                          {plan.icon}
                        </div>
                      </div>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2 text-center">
                        {plan.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/70 text-center">
                        {plan.tagline}
                      </p>
                    </div>

                    {/* Pricing */}
                    <div className="text-center mb-4 sm:mb-6">
                      <AnimatePresence mode="wait">
                        {!isAnnual ? (
                          <motion.div
                            key="monthly"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                              ${plan.monthlyPrice}
                            </span>
                            <span className="text-sm sm:text-base text-white/60 ml-1">/month</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="annual"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                              ${(plan.annualPrice / 12).toFixed(2)}
                            </span>
                            <span className="text-sm sm:text-base text-white/60 ml-1">/month</span>
                            {plan.annualPrice > 0 && (
                              <div className="text-xs sm:text-sm text-green-400 mt-1 text-center">
                                Billed ${plan.annualPrice} yearly
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Features - flex-grow to push button down */}
                    <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 flex-grow">
                      {plan.features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-center"
                        >
                          {feature.included ? (
                            <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mr-2 flex-shrink-0" />
                          ) : (
                            <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/30 mr-2 flex-shrink-0" />
                          )}
                          <span className={`text-xs sm:text-sm lg:text-base text-center ${feature.included ? 'text-white' : 'text-white/40'}`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button - stays at bottom */}
                    <motion.div
                      className="mt-auto"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {plan.isFree ? (
                        <Link
                          href={plan.ctaLink}
                          className={`block w-full text-center px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base lg:text-lg transition-all duration-300 cursor-pointer ${
                            plan.highlight
                              ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-black hover:from-green-500 hover:to-emerald-500'
                              : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30'
                          }`}
                        >
                          {plan.cta}
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleCheckout(
                            plan.id as 'essential' | 'growth' | 'unlimited',
                            isAnnual ? plan.annualPriceId : plan.monthlyPriceId
                          )}
                          disabled={loadingPlan === plan.id}
                          className={`block w-full text-center px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base lg:text-lg transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            plan.highlight
                              ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-black hover:from-green-500 hover:to-emerald-500'
                              : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30'
                          }`}
                        >
                          {loadingPlan === plan.id ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            plan.cta
                          )}
                        </button>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Trust badges */}
          <motion.div
            variants={itemVariants}
            className="mt-12 sm:mt-16 text-center"
          >
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white/10 backdrop-blur-lg border border-white/20">
                <ShieldCheckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                <span className="text-xs sm:text-sm text-white">No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white/10 backdrop-blur-lg border border-white/20">
                <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                <span className="text-xs sm:text-sm text-white">Cancel Anytime</span>
              </div>
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white/10 backdrop-blur-lg border border-white/20">
                <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                <span className="text-xs sm:text-sm text-white">Join 10,000+ Couples</span>
              </div>
            </div>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            variants={itemVariants}
            className="mt-12 sm:mt-16 md:mt-20 max-w-4xl mx-auto"
          >
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center mb-6 sm:mb-8">
              Frequently Asked Questions
            </h2>
            <div className="grid gap-3 sm:gap-4">
              {[
                {
                  q: "Can I switch plans anytime?",
                  a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle."
                },
                {
                  q: "What payment methods do you accept?",
                  a: "We accept all major credit cards, debit cards, and PayPal for your convenience."
                },
                {
                  q: "Is there a free trial?",
                  a: "Yes! Our Discover plan is completely free and gives you 3 sessions per month to try our platform."
                },
                {
                  q: "What happens if I exceed my session limit?",
                  a: "You'll receive a notification when you're close to your limit. You can upgrade your plan or wait for the next billing cycle."
                }
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg sm:rounded-xl p-4 sm:p-5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-white mb-2">
                    {faq.q}
                  </h3>
                  <p className="text-xs sm:text-sm lg:text-base text-white/70">
                    {faq.a}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* CSS animation keyframes */}
      <style jsx>{`
        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        @keyframes pulseGlow {
          0%, 100% {
            transform: scale(1) translateZ(0);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.02) translateZ(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default PricingPage;