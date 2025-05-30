'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import BokehBackground from '@/components/ui/bokeh-background'
import GlassCard from '@/components/ui/glass-card'

export default function PrivacyPolicy() {
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
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <button 
            type="button"
            className="inline-flex items-center text-white hover:text-white/60 mb-6 cursor-pointer bg-transparent p-2"
            onClick={() => window.location.href = '/auth/register'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Registration
          </button>
          
          <GlassCard className="w-full">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white">
                Privacy Policy
              </h1>
              <p className="mt-2 text-white/70">
                Last updated: {new Date().toLocaleDateString()}
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
                  <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
                  <p>We collect information you provide directly to us, such as when you create an account, schedule a therapy session, or contact us for support. This may include:</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>Name and email address</li>
                    <li>Health information relevant to therapy sessions</li>
                    <li>Session notes and transcripts (with your consent)</li>
                    <li>Payment information</li>
                    <li>Communication preferences</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
                  <p>We use the information we collect to:</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Schedule and manage therapy sessions</li>
                    <li>Process payments and send transaction confirmations</li>
                    <li>Send you technical notices and support messages</li>
                    <li>Respond to your comments and questions</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">3. Information Sharing and Disclosure</h2>
                  <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>With our AI therapist system for the purpose of providing therapy services</li>
                    <li>With service providers who assist in our operations (under strict confidentiality agreements)</li>
                    <li>If required by law or to respond to legal process</li>
                    <li>To protect the rights and safety of our users or others</li>
                    <li>With your explicit consent</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">4. Data Security</h2>
                  <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>SSL/TLS encryption for data in transit</li>
                    <li>Encrypted storage for sensitive information</li>
                    <li>Regular security audits and updates</li>
                    <li>Access controls and authentication procedures</li>
                    <li>HIPAA-compliant infrastructure for health information</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">5. HIPAA Compliance</h2>
                  <p>We are committed to protecting your health information in accordance with the Health Insurance Portability and Accountability Act (HIPAA). This includes:</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>Maintaining the confidentiality of your protected health information (PHI)</li>
                    <li>Using PHI only for treatment, payment, and healthcare operations</li>
                    <li>Implementing physical and technical safeguards</li>
                    <li>Training our staff on HIPAA requirements</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights and Choices</h2>
                  <p>You have the following rights regarding your personal information:</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>Access and receive a copy of your personal information</li>
                    <li>Update or correct inaccurate information</li>
                    <li>Request deletion of your personal information</li>
                    <li>Opt-out of marketing communications</li>
                    <li>Withdraw consent for data processing</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">7. Session Recordings and Transcripts</h2>
                  <p>If you consent to session recording or transcription:</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>Recordings are stored securely and encrypted</li>
                    <li>Access is limited to you and your therapist</li>
                    <li>You can request deletion at any time</li>
                    <li>Transcripts are processed using secure AI services</li>
                    <li>No recordings are shared without your explicit consent</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">8. Cookies and Analytics</h2>
                  <p>We use cookies and similar technologies to:</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>Remember your preferences and settings</li>
                    <li>Authenticate your login</li>
                    <li>Analyze usage patterns to improve our services</li>
                    <li>Provide personalized content</li>
                  </ul>
                  <p className="mt-2">You can control cookie settings through your browser preferences.</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">9. Children's Privacy</h2>
                  <p>Our services are not intended for children under 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
                  <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">11. Contact Us</h2>
                  <p>If you have any questions about this Privacy Policy, please contact us at:</p>
                  <ul className="list-none ml-4 mt-2">
                    <li>Email: privacy@therapyai.us</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">12. Data Protection Officer</h2>
                  <p>For privacy-related inquiries, you may also contact our Data Protection Officer at:</p>
                  <ul className="list-none ml-4 mt-2">
                    <li>Email: dpo@therapyai.us</li>
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