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
    <div className="flex min-h-[80vh] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10 bg-[length:400%_400%] bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 animate-gradient-xy overflow-hidden">
        {/* Add floating shapes */}
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-indigo-300/20 rounded-full blur-3xl animate-float-medium"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl animate-float-slow"></div>
      </div>
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
            whileHover={{ 
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02)",
              translateY: -4
            }}
            className="bg-white rounded-xl shadow-lg p-8 border border-purple-100 min-h-[400px] transition-all"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                  placeholder=" "
                />
                <label 
                  htmlFor="name" 
                  className="absolute text-gray-600 left-4 top-2 text-xs font-medium transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-purple-600"
                >
                  Your Name
                </label>
              </div>
              
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                  placeholder=" "
                />
                <label 
                  htmlFor="email" 
                  className="absolute text-gray-600 left-4 top-2 text-xs font-medium transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-purple-600"
                >
                  Email Address
                </label>
              </div>
              
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  minLength={8}
                  required
                  placeholder=" "
                />
                <label 
                  htmlFor="password" 
                  className="absolute text-gray-600 left-4 top-2 text-xs font-medium transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-purple-600"
                >
                  Password
                </label>
                {/* Password strength indicator */}
                <div className="mt-1.5 flex space-x-1">
                  <div className={`h-1 flex-1 rounded-full transition-colors ${password.length > 0 ? 'bg-red-400' : 'bg-gray-200'}`}></div>
                  <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 6 ? 'bg-yellow-400' : 'bg-gray-200'}`}></div>
                  <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 8 ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Must be at least 8 characters</p>
              </div>
              
              <div className="pt-2">
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`cursor-pointer w-full px-4 py-3 rounded-lg text-white font-medium shadow-md transform transition-all duration-200 ${
                    isLoading 
                      ? 'bg-purple-400 cursor-wait' 
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-900 hover:shadow-lg'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </span>
                  ) : 'Sign Up'}
                </motion.button>
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