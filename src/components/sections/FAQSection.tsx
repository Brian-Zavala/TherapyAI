'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'

const faqs = [
  {
    question: 'How does AI therapy work?',
    answer: 'Our AI therapy platform uses advanced language models trained on established therapy techniques. The AI therapist guides you through evidence-based exercises, asks thoughtful questions, and provides personalized insights based on your responses.',
  },
  {
    question: 'Is my data secure and private?',
    answer: 'Absolutely. We use enterprise-grade encryption for all data transmission and storage. Your sessions are completely confidential, and we never share your personal information with third parties. You can delete your data at any time.',
  },
  {
    question: 'Can AI replace a human therapist?',
    answer: 'Our platform is designed to complement, not replace, traditional therapy. It provides accessible support between sessions or for those who may not have access to in-person therapy. For severe mental health issues, we always recommend consulting with a licensed professional.',
  },
  {
    question: 'What types of therapy do you offer?',
    answer: 'We offer three main formats: Individual therapy for personal growth, Couples therapy using methods like the Gottman approach, and Family therapy supporting up to 7 family members. Each format is tailored to specific needs and goals.',
  },
  {
    question: 'How do I get started?',
    answer: 'Simply sign up for a free account, complete a brief onboarding questionnaire to help personalize your experience, and you can start your first session immediately. We offer a 7-day free trial so you can explore the platform risk-free.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your subscription at any time with no questions asked. Your access will continue until the end of your current billing period, and you can download all your session data before canceling.',
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-400">
            Everything you need to know about our therapy platform
          </p>
        </motion.div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              viewport={{ once: true }}
            >
              <Card 
                className="cursor-pointer hover:border-purple-500/50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white pr-4">
                      {faq.question}
                    </h3>
                    <motion.span
                      animate={{ rotate: openIndex === index ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-purple-400 text-xl"
                    >
                      ↓
                    </motion.span>
                  </div>
                  
                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="text-gray-400 mt-4">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}