'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'

export default function Register() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')  // Use empty string instead of null
    setIsLoading(true)

    try {
      // Register the user
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),  // Use individual state variables instead of formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed')
      }
      
      // Automatically sign in the user after registration
      const signInResult = await signIn('credentials', {
        redirect: false,
        email: email,  // Use individual state variable
        password: password,  // Use individual state variable
      })

      if (signInResult?.error) {
        throw new Error(signInResult.error)
      }
      
      // Redirect to dashboard after registration - dashboard will handle profile setup
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] bg-gradient-to-b from-indigo-50 to-purple-50 overflow-hidden">
      {/* Left Side - Testimonials Column */}
      <div className="hidden lg:flex lg:flex-col lg:w-1/4 xl:w-1/5 justify-center items-end pr-8 space-y-4">
        {/* Testimonial 1 */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md max-w-[260px]"
        >
          <div className="flex p-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full relative overflow-hidden mr-3 flex-shrink-0">
              {/* Person silhouette with blur effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400">
                {/* Head shape */}
                <div className="absolute w-5 h-5 bg-gray-400 rounded-full top-1 left-1/2 transform -translate-x-1/2"></div>
                {/* Body shape */}
                <div className="absolute w-6 h-4 bg-gray-400 rounded-t-full bottom-0 left-1/2 transform -translate-x-1/2"></div>
              </div>
              <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-r from-indigo-400/30 to-purple-400/30"></div>
            </div>
            <div>
              <div className="text-amber-500 text-xs mb-1">★★★★★</div>
              <p className="text-gray-600 italic text-xs">
                "These AI sessions saved our marriage. We've learned new ways to connect emotionally."
              </p>
              <p className="text-xs font-medium text-indigo-700 mt-1">- Alex & Jordan</p>
            </div>
          </div>
        </motion.div>
        
        {/* Testimonial 2 */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md max-w-[260px]"
        >
          <div className="flex p-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full relative overflow-hidden mr-3 flex-shrink-0">
              {/* Person silhouette with blur effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400">
                {/* Head shape */}
                <div className="absolute w-5 h-5 bg-gray-400 rounded-full top-1 left-1/2 transform -translate-x-1/2"></div>
                {/* Body shape */}
                <div className="absolute w-6 h-4 bg-gray-400 rounded-t-full bottom-0 left-1/2 transform -translate-x-1/2"></div>
              </div>
              <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-r from-indigo-400/30 to-purple-400/30"></div>
            </div>
            <div>
              <div className="text-amber-500 text-xs mb-1">★★★★★</div>
              <p className="text-gray-600 italic text-xs">
                "As a family of four, the therapy sessions helped us navigate complex family dynamics."
              </p>
              <p className="text-xs font-medium text-indigo-700 mt-1">- The Martinez Family</p>
            </div>
          </div>
        </motion.div>
        
        {/* Testimonial 3 */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md max-w-[260px]"
        >
          <div className="flex p-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full relative overflow-hidden mr-3 flex-shrink-0">
              {/* Person silhouette with blur effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400">
                {/* Head shape */}
                <div className="absolute w-5 h-5 bg-gray-400 rounded-full top-1 left-1/2 transform -translate-x-1/2"></div>
                {/* Body shape */}
                <div className="absolute w-6 h-4 bg-gray-400 rounded-t-full bottom-0 left-1/2 transform -translate-x-1/2"></div>
              </div>
              <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-r from-indigo-400/30 to-purple-400/30"></div>
            </div>
            <div>
              <div className="text-amber-500 text-xs mb-1">★★★★★</div>
              <p className="text-gray-600 italic text-xs">
                "The availability of therapy 24/7 made such a difference for my depression."
              </p>
              <p className="text-xs font-medium text-indigo-700 mt-1">- Thomas K.</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Center Column - Registration Form */}
      <div className="w-full lg:w-2/4 xl:w-3/5 px-4 flex flex-col items-center justify-center py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Your Account</h1>
          <p className="text-gray-600">
            Begin your journey toward better relationships
          </p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm"
            >
              {error}
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-8 border border-purple-100 min-h-[400px]"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-gray-700 mb-2 font-medium">Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-gray-700 mb-2 font-medium">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-gray-700 mb-2 font-medium">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  minLength={8}
                  required
                  placeholder="Create a password (8+ characters)"
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
              </div>
              
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`cursor-pointer w-full px-4 py-3 rounded-lg text-white font-medium shadow-md transform transition-all duration-200 ${
                    isLoading 
                      ? 'bg-purple-400 cursor-wait' 
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-900 hover:shadow-lg active:scale-[0.98]'
                  }`}
                >
                  {isLoading ? 'Creating account...' : 'Sign Up'}
                </button>
              </div>
            </form>
            
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-purple-600 hover:text-purple-800 font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-center text-gray-600">
                "Our AI-powered therapy sessions are designed to help you build healthier, more fulfilling relationships."
              </p>
            </div>
          </motion.div>
          
          <p className="text-center text-gray-500 text-xs mt-6">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>

      {/* Right Side - Testimonials Column */}
      <div className="hidden lg:flex lg:flex-col lg:w-1/4 xl:w-1/5 justify-center items-start pl-8 space-y-4">
        {/* Testimonial 4 */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md max-w-[260px]"
        >
          <div className="flex p-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full relative overflow-hidden mr-3 flex-shrink-0">
              {/* Person silhouette with blur effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400">
                {/* Head shape */}
                <div className="absolute w-5 h-5 bg-gray-400 rounded-full top-1 left-1/2 transform -translate-x-1/2"></div>
                {/* Body shape */}
                <div className="absolute w-6 h-4 bg-gray-400 rounded-t-full bottom-0 left-1/2 transform -translate-x-1/2"></div>
              </div>
              <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-r from-purple-400/30 to-indigo-400/30"></div>
            </div>
            <div>
              <div className="text-amber-500 text-xs mb-1">★★★★★</div>
              <p className="text-gray-600 italic text-xs">
                "The personalized exercises helped us reconnect emotionally after years of drifting apart."
              </p>
              <p className="text-xs font-medium text-indigo-700 mt-1">- Lisa & Mark</p>
            </div>
          </div>
        </motion.div>
        
        {/* Testimonial 5 */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md max-w-[260px]"
        >
          <div className="flex p-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full relative overflow-hidden mr-3 flex-shrink-0">
              {/* Person silhouette with blur effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400">
                {/* Head shape */}
                <div className="absolute w-5 h-5 bg-gray-400 rounded-full top-1 left-1/2 transform -translate-x-1/2"></div>
                {/* Body shape */}
                <div className="absolute w-6 h-4 bg-gray-400 rounded-t-full bottom-0 left-1/2 transform -translate-x-1/2"></div>
              </div>
              <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-r from-purple-400/30 to-indigo-400/30"></div>
            </div>
            <div>
              <div className="text-amber-500 text-xs mb-1">★★★★★</div>
              <p className="text-gray-600 italic text-xs">
                "We were hesitant about online therapy, but the AI guidance transformed our relationship."
              </p>
              <p className="text-xs font-medium text-indigo-700 mt-1">- Emily & David</p>
            </div>
          </div>
        </motion.div>
        
        {/* Testimonial 6 */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md max-w-[260px]"
        >
          <div className="flex p-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full relative overflow-hidden mr-3 flex-shrink-0">
              {/* Person silhouette with blur effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400">
                {/* Head shape */}
                <div className="absolute w-5 h-5 bg-gray-400 rounded-full top-1 left-1/2 transform -translate-x-1/2"></div>
                {/* Body shape */}
                <div className="absolute w-6 h-4 bg-gray-400 rounded-t-full bottom-0 left-1/2 transform -translate-x-1/2"></div>
              </div>
              <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-r from-purple-400/30 to-indigo-400/30"></div>
            </div>
            <div>
              <div className="text-amber-500 text-xs mb-1">★★★★★</div>
              <p className="text-gray-600 italic text-xs">
                "The tools provided helped me manage my anxiety and become more present in my relationships."
              </p>
              <p className="text-xs font-medium text-indigo-700 mt-1">- Nina C.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}