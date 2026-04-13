'use client'

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import BokehBackground from '@/components/ui/bokeh-background'
import GlassCard from '@/components/ui/glass-card'

export default function TermsAndConditions() {
  // Enable smooth scrolling for this page
  useEffect(() => {
    document.documentElement.classList.add('smooth-scroll');
    return () => {
      document.documentElement.classList.remove('smooth-scroll');
    };
  }, []);
  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-blue-900/20" />
      <BokehBackground />
      
      <div className="relative z-10 min-h-screen flex items-start sm:items-center justify-center px-3 sm:px-4 md:px-6 pt-16 sm:pt-20 md:pt-24 pb-8">
        <div className="w-full max-w-4xl">
          <button
            type="button"
            className="inline-flex items-center text-white hover:text-white/60 mb-4 sm:mb-6 cursor-pointer bg-transparent p-2 whitespace-nowrap text-sm sm:text-base min-h-[44px]"
            onClick={() => window.location.href = '/'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </button>

          <GlassCard className="w-full">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                Terms and Conditions
              </h1>
              <p className="mt-2 text-xs sm:text-sm md:text-base text-white/70">
                Last updated: 4/12/2026
              </p>
            </div>

            <div className="prose prose-invert max-w-none">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 text-white/90"
              >
                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
                  <p>By accessing and using TherapyAI.us, you accept and agree to be bound by the terms and provision of this agreement.</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">2. Use License</h2>
                  <p>Permission is granted to temporarily download one copy of the materials (information or software) on TherapyAI.us for personal, non-commercial transitory viewing only.</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>This is the grant of a license, not a transfer of title</li>
                    <li>This license shall automatically terminate if you violate any of these restrictions</li>
                    <li>We may terminate this license at any time</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">3. Health Disclaimer</h2>
                  <p>The information on this website is not intended or implied to be a substitute for professional medical advice, diagnosis or treatment. All content is for general information purposes only.</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>Always seek the advice of your physician or other qualified health provider</li>
                    <li>Never disregard professional medical advice or delay in seeking it</li>
                    <li>In case of emergency, call your local emergency number immediately</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">4. Privacy</h2>
                  <p>Your use of our Service is also governed by our Privacy Policy. Please review our Privacy Policy, which also governs the Site and informs users of our data collection practices.</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">5. AI Therapist Services</h2>
                  <p>Our platform provides AI therapist services. The following terms apply:</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>Our services use advanced AI technology, not licensed human therapists</li>
                    <li>AI therapists are designed to provide supportive conversation and guidance</li>
                    <li>Sessions are confidential as per our privacy policy</li>
                    <li>You must be 18 years or older to use our services</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">6. Cancellation Policy</h2>
                  <p>Sessions must be cancelled at least 24 hours in advance. Late cancellations or no-shows may incur fees as per your therapist's policy.</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">7. Prohibited Uses</h2>
                  <p>You may not use our services:</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                    <li>To violate any international, federal, provincial or state regulations, rules, laws, or local ordinances</li>
                    <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                    <li>To submit false or misleading information</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">8. Disclaimer</h2>
                  <p>The materials on TherapyAI.us are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">9. Limitations</h2>
                  <p>In no event shall TherapyAI.us or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our website.</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">10. Governing Law</h2>
                  <p>These terms and conditions are governed by and construed in accordance with the laws of the United States and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">11. Contact Information</h2>
                  <p>If you have any questions about these Terms and Conditions, please contact us at:</p>
                  <ul className="list-none ml-4 mt-2">
                    <li>Email: support@therapyai.us</li>
                  </ul>
                </section>
              </motion.div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}