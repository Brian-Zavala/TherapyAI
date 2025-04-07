'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import ButtonWithSound from '@/components/ButtonWithSound'

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full">
      {/* Hero section with background image and gradient overlay */}
      <section className="w-full relative overflow-hidden min-h-[80vh]  shadow-md shadow-gray-400 rounded-t-2xl ">
        {/* Background gradient - lighter to let image show through better */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-100/70 via-purple-100/60 to-white/40 z-0"></div>
        
        {/* Happy couple image with increased opacity */}
        <div className="absolute inset-0 w-full h-full z-0">
          <Image
            src="/images/happy-couple.jpg"
            alt="Happy couple laughing together"
            fill
            className="object-cover object-center opacity-50 md:opacity-60 rounded-t-2xl" // Increased opacity
            priority
          />
          {/* Lighter gradient overlay to let more image show through */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-white/40 to-purple-100/30"></div>
        </div>
        
        {/* Hero content with darker text for better contrast */}
       <div className="relative z-10 flex flex-col items-center text-center py-20 px-4 min-h-[80vh] justify-center">
  <motion.h1 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.7 }}
    className="text-4xl md:text-5xl font-bold text-gray-900 mb-8" // Added mb-8 for margin-bottom
  >
    Strengthen Your Relationships
  </motion.h1>
  
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay: 0.4 }}
  >
    <ButtonWithSound
      as={Link}
      href="/dashboard/therapy" 
      className="bg-gradient-to-r from-indigo-500 to-purple-600 
     text-white 
     font-medium 
     py-3 
     px-8 
     rounded-full 
     text-lg 
     shadow-md 
     hover:shadow-lg 
     transition 
     duration-300
     hover:ring-2
     hover:ring-gray-500
     hover:ring-opacity-50 
     focus:outline-none 
     focus:ring-4 
     focus:ring-purple-500"
    >
      Start Your Therapy Session
    </ButtonWithSound>
  </motion.div>
</div>
      </section>
      
      {/* Features section remains the same */}
      <section className="w-full py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16 text-gray-800">
            How We Support Your Relationship
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature cards - same as before */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-100 group hover:border-indigo-300"
            >
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-indigo-200 transition-colors">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Private Sessions</h3>
              <p className="text-gray-600">Connect with an AI therapist from the comfort of your home, with complete privacy and confidentiality.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-100 group hover:border-indigo-300"
            >
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-indigo-200 transition-colors">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">24/7 Availability</h3>
              <p className="text-gray-600">Get help whenever you need it - any time, any day. Our AI therapist is always ready to support your relationship.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-100 group hover:border-indigo-300"
            >
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-indigo-200 transition-colors">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Proven Techniques</h3>
              <p className="text-gray-600">Our AI is trained in evidence-based therapeutic approaches that help couples build stronger, healthier relationships.</p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}