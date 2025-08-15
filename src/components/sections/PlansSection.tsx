'use client'

import React from 'react'
import { motion } from 'framer-motion'
import PricingCards from '@/components/pricing/PricingCards'

export default function PlansSection() {
  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-gray-900/50">
      <div className="container mx-auto px-3 sm:px-4 md:px-5 lg:px-6 xl:px-7 2xl:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 leading-tight">
            Choose Your Plan
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
            Flexible pricing options to meet your therapy needs. 
            Start with our free tier, upgrade anytime.
          </p>
        </motion.div>
        
        <PricingCards />
      </div>
    </section>
  )
}