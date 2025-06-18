// Demo landing page with limitations and lead capture
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function DemoPage() {
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDemoStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Track demo signup
      await fetch("/api/demo/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, interest }),
      });

      // Store demo user info in session
      sessionStorage.setItem("demoUser", JSON.stringify({ email, startTime: Date.now() }));
      
      // Redirect to therapy session with demo mode
      router.push("/therapy?demo=true");
    } catch (error) {
      console.error("Demo signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl w-full"
      >
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Experience AI-Powered Couples Therapy
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Try our revolutionary therapy platform with a 5-minute interactive demo
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Demo Features */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">What You'll Experience</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Real-time voice conversation with AI therapist</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Live transcription and emotion analysis</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Interactive dashboard with session insights</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Sample progress tracking and analytics</span>
              </li>
            </ul>

            {/* Demo Limitations */}
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">Demo Limitations</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• 5-minute session limit</li>
                <li>• Simulated responses for privacy</li>
                <li>• No data persistence</li>
                <li>• Limited to preset scenarios</li>
              </ul>
            </div>
          </div>

          {/* Registration Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Start Your Demo</h2>
            <form onSubmit={handleDemoStart} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="interest" className="block text-sm font-medium text-gray-700 mb-1">
                  I'm interested in...
                </label>
                <select
                  id="interest"
                  required
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select an option</option>
                  <option value="personal">Personal use</option>
                  <option value="professional">Professional/Clinical use</option>
                  <option value="enterprise">Enterprise solution</option>
                  <option value="partnership">Partnership opportunity</option>
                  <option value="investment">Investment opportunity</option>
                  <option value="research">Research/Academic</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Starting Demo..." : "Start 5-Minute Demo"}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                No credit card required. We'll send you a follow-up email with more information.
              </p>
            </form>

            {/* Trust Indicators */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-around text-center">
                <div>
                  <div className="text-2xl font-bold text-purple-600">10K+</div>
                  <div className="text-sm text-gray-600">Demo Sessions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">4.8/5</div>
                  <div className="text-sm text-gray-600">User Rating</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">24/7</div>
                  <div className="text-sm text-gray-600">Available</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 mb-4">Trusted by leading organizations</p>
          <div className="flex items-center justify-center space-x-8 opacity-50">
            {/* Add your logo placeholders here */}
            <div className="w-24 h-12 bg-gray-300 rounded"></div>
            <div className="w-24 h-12 bg-gray-300 rounded"></div>
            <div className="w-24 h-12 bg-gray-300 rounded"></div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}