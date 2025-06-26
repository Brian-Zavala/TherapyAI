'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    title: 'AI-Powered Therapy',
    description: 'Advanced AI technology trained on proven therapy techniques to provide personalized guidance.',
    icon: '🧠',
  },
  {
    title: 'Complete Privacy',
    description: 'Your sessions are completely confidential with enterprise-grade encryption and security.',
    icon: '🔒',
  },
  {
    title: 'Evidence-Based',
    description: 'Built on established therapy frameworks like Gottman Method and Emotionally Focused Therapy.',
    icon: '📊',
  },
  {
    title: 'Real-Time Insights',
    description: 'Track your progress with detailed analytics and personalized recommendations.',
    icon: '📈',
  },
  {
    title: 'Flexible Scheduling',
    description: 'Available 24/7, start a session whenever you need support or guidance.',
    icon: '🗓️',
  },
  {
    title: 'Multi-Format Support',
    description: 'Choose between couple, family, or individual therapy sessions based on your needs.',
    icon: '👥',
  },
]

export default function FeaturesSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Why Choose Our Platform
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            We combine cutting-edge technology with proven therapy methods to deliver 
            professional support when you need it most.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full hover:border-purple-500/50 transition-colors">
                <CardHeader>
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}