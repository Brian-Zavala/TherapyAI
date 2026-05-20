// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { CheckIcon, XMarkIcon, SparklesIcon, ShieldCheckIcon, HeartIcon, BoltIcon, ClockIcon, UsersIcon } from '@heroicons/react/24/solid';
import { createCheckoutSession } from '@/lib/stripe-client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import CreditDisplay from '@/components/CreditDisplay';

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();

  const handleCheckout = async (planType: 'pro', priceId: string) => {
    try {
      setLoadingPlan(planType);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 10 }
    }
  };

  const cardHoverVariants = {
    rest: { scale: 1 },
    hover: {
      scale: 1.02,
      transition: { type: "spring", stiffness: 300, damping: 15 }
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: <HeartIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />,
      monthlyPrice: 0,
      annualPrice: 0,
      monthlyPriceId: null,
      annualPriceId: null,
      tagline: 'Start your journey',
      highlight: false,
      gradient: 'from-blue-700 to-blue-900',
      features: [
        { text: '2 sessions per month', included: true },
        { text: '15 minutes per session', included: true },
        { text: 'Basic mood tracking', included: true },
        { text: 'Crisis detection & support', included: true },
        { text: 'Email/text summaries', included: true },
        { text: 'AI-powered insights', included: true },
        { text: 'Session transcripts', included: false },
        { text: 'Advanced CBT modules', included: false },
        { text: 'Personalized therapy plans', included: false },
        { text: 'Priority support', included: false },
      ],
      cta: 'Get Started Free',
      ctaLink: '/sign-up',
      isFree: true
    },
    {
      id: 'pro',
      name: 'Pro',
      icon: <BoltIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />,
      monthlyPrice: 10,
      annualPrice: 96,
      monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
      annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || '',
      tagline: 'Everything you need',
      highlight: true,
      gradient: 'from-purple-600 to-indigo-600',
      features: [
        { text: '2 sessions per month', included: true },
        { text: '30 minutes per session', included: true },
        { text: 'Full analytics dashboard', included: true },
        { text: 'Crisis detection & support', included: true },
        { text: 'Email/text summaries', included: true },
        { text: 'AI-powered insights', included: true },
        { text: 'Session transcripts', included: true },
        { text: 'Advanced CBT modules', included: true },
        { text: 'Personalized therapy plans', included: true },
        { text: 'Priority support', included: true },
      ],
      cta: 'Get Pro',
      ctaLink: '/dashboard/billing',
      isFree: false
    }
  ];

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 overflow-y-auto">
      <CreditDisplay />
      {/* Background */}
      <div className="fixed inset-0 w-full h-full pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent" />
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.05) 50%, transparent 100%),
              linear-gradient(45deg, transparent 0%, rgba(147, 51, 234, 0.05) 50%, transparent 100%)
            `,
            backgroundSize: '300% 300%',
            animation: 'gradientShift 30s ease infinite',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 px-3 sm:px-4 md:px-6 pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12 md:pb-16">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <motion.div
            variants={itemVariants}
            className="text-center mb-8 sm:mb-12 md:mb-16"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 md:mb-6 text-center">
              Start Free. Upgrade Anytime.
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/80 max-w-2xl mx-auto mb-6 sm:mb-8 text-center">
              Experience AI-powered therapy at your own pace — no commitment required.
            </p>

            {/* Annual toggle */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <span className={`text-sm sm:text-base font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-white/60'}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative w-14 h-7 sm:w-16 sm:h-8 rounded-full transition-colors duration-300 cursor-pointer border border-white/30 flex-shrink-0 ${
                  isAnnual ? 'bg-purple-500' : 'bg-white/20 backdrop-blur-lg'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                    isAnnual ? 'translate-x-7 sm:translate-x-8' : 'translate-x-0'
                  }`}
                />
              </button>
              <div className="relative flex items-center">
                <span className={`text-sm sm:text-base font-medium transition-colors ${isAnnual ? 'text-white' : 'text-white/60'}`}>
                  Annual
                </span>
                {isAnnual && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute left-full ml-2 whitespace-nowrap text-xs bg-green-500/30 text-green-400 border border-green-500/40 px-2 py-0.5 rounded-full font-medium"
                  >
                    Save 20%
                  </motion.span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-3xl mx-auto">
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
                      background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                      boxShadow: `
                        0 0 20px rgba(168, 85, 247, 0.5),
                        0 0 40px rgba(168, 85, 247, 0.3),
                        0 0 60px rgba(168, 85, 247, 0.1)
                      `,
                      animation: 'pulseGlow 3s ease-in-out infinite',
                      willChange: 'transform',
                      transform: 'translateZ(0)',
                    }}
                  />
                )}

                <motion.div
                  variants={cardHoverVariants}
                  className={`relative h-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl hover:bg-white/15 hover:border-white/30 transition-all duration-300 flex flex-col ${
                    plan.highlight ? 'ring-2 ring-purple-400/50' : ''
                  }`}
                  style={{
                    willChange: 'transform',
                    transform: 'translateZ(0)'
                  }}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-purple-400 to-indigo-400 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg whitespace-nowrap">
                        MOST POPULAR
                      </div>
                    </div>
                  )}

                  <div className="p-5 sm:p-6 md:p-8 flex flex-col h-full">
                    {/* Plan header */}
                    <div className="text-center mb-4 sm:mb-6">
                      <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br ${plan.gradient} mb-3 sm:mb-4`}>
                        <div className="text-white">
                          {plan.icon}
                        </div>
                      </div>
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2 text-center">
                        {plan.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/70 text-center">
                        {plan.tagline}
                      </p>
                    </div>

                    {/* Pricing */}
                    <div className="text-center mb-5 sm:mb-6">
                      <AnimatePresence mode="wait">
                        {plan.monthlyPrice === 0 ? (
                          <motion.div
                            key="free"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Free</span>
                            <div className="text-xs sm:text-sm text-white/50 mt-1">No credit card required</div>
                          </motion.div>
                        ) : !isAnnual ? (
                          <motion.div
                            key="monthly"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">$10</span>
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
                            <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">$8</span>
                            <span className="text-sm sm:text-base text-white/60 ml-1">/month</span>
                            <div className="text-xs sm:text-sm text-green-400 mt-1 text-center">
                              Billed $96 yearly — save $24
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 flex-grow">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          {feature.included ? (
                            <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mr-2 sm:mr-3 flex-shrink-0" />
                          ) : (
                            <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/30 mr-2 sm:mr-3 flex-shrink-0" />
                          )}
                          <span className={`text-xs sm:text-sm lg:text-base ${feature.included ? 'text-white' : 'text-white/40'}`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <motion.div
                      className="mt-auto"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {plan.isFree ? (
                        <Link
                          href={plan.ctaLink}
                          className="block w-full text-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base lg:text-lg transition-all duration-300 cursor-pointer bg-white/20 backdrop-blur-md text-white hover:bg-white/30 border border-white/20"
                        >
                          {plan.cta}
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleCheckout(
                            'pro',
                            isAnnual ? plan.annualPriceId : plan.monthlyPriceId
                          )}
                          disabled={loadingPlan === plan.id}
                          className="block w-full text-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base lg:text-lg transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-lg shadow-purple-500/25"
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
            className="mt-10 sm:mt-14 text-center"
          >
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 md:gap-6">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white/10 backdrop-blur-lg border border-white/20">
                <ShieldCheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-white whitespace-nowrap">No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white/10 backdrop-blur-lg border border-white/20">
                <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-white whitespace-nowrap">Cancel Anytime</span>
              </div>
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white/10 backdrop-blur-lg border border-white/20">
                <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-white whitespace-nowrap">Join Thousands of Users</span>
              </div>
            </div>
          </motion.div>

          {/* FAQ */}
          <motion.div
            variants={itemVariants}
            className="mt-12 sm:mt-16 md:mt-20 max-w-3xl mx-auto"
          >
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center mb-6 sm:mb-8">
              Frequently Asked Questions
            </h2>
            <div className="grid gap-3 sm:gap-4">
              {[
                {
                  q: "What's included in the free plan?",
                  a: "The free plan gives you 2 sessions per month (15 minutes each), basic mood tracking, crisis detection, and AI-powered insights — everything you need to get started."
                },
                {
                  q: "Can I upgrade or cancel anytime?",
                  a: "Yes. You can upgrade to Pro or cancel at any time. If you cancel, you keep Pro access until the end of your current billing period."
                },
                {
                  q: "What payment methods do you accept?",
                  a: "We accept all major credit cards and debit cards, processed securely through Stripe."
                },
                {
                  q: "What happens when I hit my free session limit?",
                  a: "You'll be notified when you're close to your limit. You can upgrade to Pro for unlimited sessions, or wait for your limit to reset at the start of next month."
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

      <style jsx>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes pulseGlow {
          0%, 100% { transform: scale(1) translateZ(0); opacity: 0.7; }
          50% { transform: scale(1.02) translateZ(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
