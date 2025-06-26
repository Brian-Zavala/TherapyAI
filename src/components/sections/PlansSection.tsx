'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const plans = [
  {
    name: 'Basic',
    price: '$49',
    period: '/month',
    description: 'Perfect for individuals starting their therapy journey',
    features: [
      '4 therapy sessions per month',
      'Basic progress tracking',
      'Email support',
      'Session recordings',
    ],
    badge: null,
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/month',
    description: 'Ideal for couples and families seeking regular support',
    features: [
      'Unlimited therapy sessions',
      'Advanced analytics & insights',
      'Priority support',
      'Session recordings & transcripts',
      'Custom therapy plans',
      'Family member accounts',
    ],
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations and therapy practices',
    features: [
      'Everything in Pro',
      'Multiple therapist accounts',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'Training & onboarding',
    ],
    badge: null,
  },
]

export default function PlansSection() {
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
            Choose Your Plan
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Flexible pricing options to meet your therapy needs. 
            Start with a 7-day free trial, cancel anytime.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className={`h-full ${plan.badge ? 'border-purple-500' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    {plan.badge && <Badge variant="default">{plan.badge}</Badge>}
                  </div>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400">{plan.period}</span>
                  </div>
                  <p className="text-gray-400">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <span className="text-purple-400 mr-2">✓</span>
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/auth/signup" className="block">
                    <Button className="w-full" variant={plan.badge ? 'default' : 'outline'}>
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}