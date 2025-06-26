'use client'

import React from 'react'
import { motion } from 'framer-motion'

const stats = [
  { value: '95%', label: 'Satisfaction Rate', description: 'Based on user feedback' },
  { value: '10K+', label: 'Active Users', description: 'Growing every day' },
  { value: '50K+', label: 'Sessions Completed', description: 'And counting' },
  { value: '24/7', label: 'Available', description: 'Always here for you' },
]

export default function StatsSection() {
  return (
    <section className="py-24 bg-gray-900/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Making a Real Impact
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Our platform has helped thousands improve their relationships through accessible, 
            professional therapy.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-purple-400 mb-2">
                {stat.value}
              </div>
              <div className="text-lg font-semibold text-white mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-gray-400">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}