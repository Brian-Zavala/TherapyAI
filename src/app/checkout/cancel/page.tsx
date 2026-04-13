"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { XCircleIcon, ArrowLeftIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

export default function CheckoutCancelPage() {
  const router = useRouter();

  useEffect(() => {
    // Optional: Track cancellation analytics here
    console.log('Checkout cancelled by user');
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 overflow-y-auto">
      {/* Background gradient mesh */}
      <div className="fixed inset-0 w-full h-full pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-orange-900/30 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-3 sm:px-4 md:px-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg sm:rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1
              }}
              className="flex justify-center mb-6"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center">
                <XCircleIcon className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4"
            >
              Checkout Cancelled
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/80 text-sm sm:text-base lg:text-lg mb-8"
            >
              No worries! Your subscription hasn't been activated. Feel free to explore our plans when you're ready.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <Link
                href="/pricing"
                className="flex items-center justify-center w-full min-h-[44px] bg-gradient-to-r from-blue-400 to-indigo-500 text-white font-medium py-2 sm:py-3 px-3 sm:px-6 rounded-lg sm:rounded-xl hover:from-blue-500 hover:to-indigo-600 transition-all duration-300 cursor-pointer text-sm sm:text-base"
              >
                <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Back to Pricing
              </Link>

              <Link
                href="/auth/register"
                className="flex items-center justify-center w-full min-h-[44px] bg-white/20 backdrop-blur-md text-white font-medium py-2 sm:py-3 px-3 sm:px-6 rounded-lg sm:rounded-xl hover:bg-white/30 transition-all duration-300 cursor-pointer text-sm sm:text-base"
              >
                <ChatBubbleBottomCenterTextIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Try Free Plan
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-white/60 text-xs sm:text-sm"
            >
              <p className="mb-2">Need help choosing a plan?</p>
              <Link
                href="/support/contact"
                className="text-blue-400 hover:text-blue-300 underline transition-colors cursor-pointer"
              >
                Contact our support team
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}