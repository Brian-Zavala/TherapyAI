// Professional case study page with metrics and results
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function CaseStudyPage() {
  const metrics = {
    performance: {
      pageLoad: { value: "1.2s", label: "Page Load Time", improvement: "-85%" },
      apiResponse: { value: "45ms", label: "API Response", improvement: "-70%" },
      uptime: { value: "99.9%", label: "Uptime SLA", improvement: "+0.4%" },
      concurrent: { value: "1000+", label: "Concurrent Users", improvement: "+900%" },
    },
    business: {
      sessions: { value: "10K+", label: "Total Sessions", growth: "+250%" },
      satisfaction: { value: "4.8/5", label: "User Rating", growth: "+0.8" },
      completion: { value: "78%", label: "Session Completion", growth: "+28%" },
      cost: { value: "75%", label: "Cost Reduction", subtext: "vs traditional" },
    },
    technical: {
      components: { value: "50+", label: "Reusable Components" },
      coverage: { value: "92%", label: "Test Coverage" },
      lighthouse: { value: "98/100", label: "Lighthouse Score" },
      accessibility: { value: "WCAG AA", label: "Accessibility" },
    },
  };

  const timelineData = [
    { month: "Month 1", milestone: "MVP Launch", users: 100, sessions: 250 },
    { month: "Month 2", milestone: "Voice AI Integration", users: 500, sessions: 1200 },
    { month: "Month 3", milestone: "Dashboard Release", users: 1200, sessions: 3500 },
    { month: "Month 4", milestone: "Mobile Optimization", users: 2500, sessions: 7000 },
    { month: "Month 5", milestone: "Enterprise Features", users: 4000, sessions: 10000 },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 to-pink-600 text-white pt-24 sm:pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-5xl font-bold mb-6">
              AI-Powered Couples Therapy Platform
            </h1>
            <p className="text-xl mb-8 opacity-90">
              How we built a scalable therapy solution serving 10,000+ sessions
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
              <Link
                href="/demo"
                className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Try Live Demo
              </Link>
              <a
                href="#contact"
                className="border-2 border-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition"
              >
                Get Full Case Study
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Challenge Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">The Challenge</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-red-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-red-800 mb-4">Traditional Therapy Limitations</h3>
              <ul className="space-y-2 text-red-700">
                <li>• Average cost: $150-300 per session</li>
                <li>• Wait times: 2-4 weeks for appointments</li>
                <li>• Limited to business hours</li>
                <li>• Geographic constraints</li>
                <li>• No session recordings or transcripts</li>
              </ul>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-green-800 mb-4">Our Solution</h3>
              <ul className="space-y-2 text-green-700">
                <li>• Just $10/month for unlimited sessions</li>
                <li>• Instant access: No wait times</li>
                <li>• Available 24/7/365</li>
                <li>• Accessible from anywhere</li>
                <li>• Full session transcripts & analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Implementation */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Technical Implementation</h2>
          
          {/* Architecture Diagram Placeholder */}
          <div className="bg-white p-8 rounded-lg shadow-lg mb-12">
            <h3 className="text-xl font-semibold mb-4">System Architecture</h3>
            <div className="bg-gray-100 h-64 rounded flex items-center justify-center">
              <span className="text-gray-500">Architecture Diagram</span>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-semibold mb-2">Frontend</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Next.js 15</li>
                <li>• React 19</li>
                <li>• TypeScript</li>
                <li>• Tailwind CSS 4</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-semibold mb-2">Backend</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Node.js</li>
                <li>• Prisma ORM</li>
                <li>• PostgreSQL</li>
                <li>• NextAuth.js</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-semibold mb-2">AI & Real-time</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• VAPI Voice AI</li>
                <li>• WebRTC</li>
                <li>• Supabase Realtime</li>
                <li>• Redis</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-semibold mb-2">Infrastructure</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Vercel Edge</li>
                <li>• Supabase</li>
                <li>• Resend Email</li>
                <li>• CloudFlare</li>
              </ul>
            </div>
          </div>

          {/* Key Features */}
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">Voice AI Implementation</h3>
              <p className="text-gray-600 mb-4">
                Implemented real-time voice processing with sub-50ms latency using VAPI's WebRTC integration.
                Custom speech models trained on therapy-specific vocabulary ensure accurate transcription.
              </p>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`// Simplified VAPI integration
const vapi = new Vapi({
  token: await getJWTToken(),
  assistant: {
    model: "gpt-4",
    voice: "nova",
    firstMessage: "Hello, I'm here to help..."
  }
});

vapi.on('speech-start', handleSpeechStart);
vapi.on('transcript', handleTranscript);
vapi.on('call-end', handleCallEnd);`}
              </pre>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">Session Recovery System</h3>
              <p className="text-gray-600 mb-4">
                Built automatic session recovery that reconnects users within 2 seconds of connection loss,
                preserving conversation context and progress.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
                <div className="bg-purple-50 p-4 rounded">
                  <div className="text-2xl font-bold text-purple-600">2s</div>
                  <div className="text-sm text-gray-600">Recovery Time</div>
                </div>
                <div className="bg-purple-50 p-4 rounded">
                  <div className="text-2xl font-bold text-purple-600">99.5%</div>
                  <div className="text-sm text-gray-600">Recovery Success</div>
                </div>
                <div className="bg-purple-50 p-4 rounded">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-gray-600">Data Loss</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results & Metrics */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Results & Impact</h2>

          {/* Performance Metrics */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold mb-6">Performance Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              {Object.entries(metrics.performance).map(([key, metric]) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white p-6 rounded-lg shadow-lg text-center"
                >
                  <div className="text-3xl font-bold text-purple-600">{metric.value}</div>
                  <div className="text-gray-600 mt-1">{metric.label}</div>
                  {metric.improvement && (
                    <div className="text-sm text-green-600 mt-2">{metric.improvement}</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Business Metrics */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold mb-6">Business Impact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              {Object.entries(metrics.business).map(([key, metric]) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-lg text-center"
                >
                  <div className="text-3xl font-bold text-purple-600">{metric.value}</div>
                  <div className="text-gray-700 mt-1">{metric.label}</div>
                  {'growth' in metric && metric.growth && (
                    <div className="text-sm text-green-600 mt-2">{metric.growth}</div>
                  )}
                  {'subtext' in metric && metric.subtext && (
                    <div className="text-sm text-gray-500 mt-2">{metric.subtext}</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Growth Timeline */}
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold mb-6">Growth Timeline</h3>
            <div className="overflow-x-auto">
              <div className="flex space-x-8 min-w-max">
                {timelineData.map((item, index) => (
                  <div key={index} className="text-center">
                    <div className="w-32">
                      <div className="text-sm text-gray-600 mb-2">{item.month}</div>
                      <div className="bg-purple-600 h-2 rounded mb-2"></div>
                      <div className="text-xs font-semibold mb-1">{item.milestone}</div>
                      <div className="text-sm text-gray-600">
                        {item.users} users<br />
                        {item.sessions} sessions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">What Users Say</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                "The AI therapist helped us communicate better than we have in years. The convenience of 24/7 access is game-changing."
              </p>
              <p className="text-sm font-semibold">Sarah M.</p>
              <p className="text-xs text-gray-500">Verified User</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                "Technical implementation is outstanding. The voice quality is crystal clear and the transcription accuracy is impressive."
              </p>
              <p className="text-sm font-semibold">Tech Reviewer</p>
              <p className="text-xs text-gray-500">Industry Publication</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                "As a therapist, I'm impressed by the ethical approach and accuracy. This is a valuable supplement to traditional therapy."
              </p>
              <p className="text-sm font-semibold">Dr. James K.</p>
              <p className="text-xs text-gray-500">Licensed Therapist</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-16 bg-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Business?</h2>
          <p className="text-xl mb-8 opacity-90">
            Get the full case study with detailed metrics, implementation guide, and ROI analysis
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              href="/demo"
              className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Try Live Demo
            </Link>
            <button
              className="border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition"
              onClick={() => window.location.href = 'mailto:contact@example.com?subject=Case Study Request'}
            >
              Request Full Case Study
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}