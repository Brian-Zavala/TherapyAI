'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Define testimonials data
  const testimonials = [
    { id: 1, quote: "TherapyAI helped us communicate better...", author: "Sarah & Michael", delay: 0.2, side: 'left' },
    { id: 2, quote: "Our family dynamics improved tremendously...", author: "The Anderson Family", delay: 0.3, side: 'left' },
    { id: 3, quote: "24/7 access to therapy has been a lifesaver...", author: "Roberto & Elena", delay: 0.4, side: 'left' },
    { id: 4, quote: "As a single parent, the individual therapy...", author: "Melissa R.", delay: 0.2, side: 'right' },
    { id: 5, quote: "I was skeptical about AI therapy...", author: "James T.", delay: 0.3, side: 'right' },
    { id: 6, quote: "The personalized guidance helped us navigate...", author: "Emily & David", delay: 0.4, side: 'right' },
  ];

  const leftTestimonials = testimonials.filter(t => t.side === 'left');
  const rightTestimonials = testimonials.filter(t => t.side === 'right');

  return (
    // Main container: Uses Flexbox for columns, centers items vertically, adds padding, ensures minimum height, defines gap for spacing
    <div className="flex flex-col lg:flex-row items-center lg:items-start lg:justify-center min-h-[90vh] bg-gradient-to-b from-indigo-50 to-purple-50 px-4 py-10 lg:px-8 lg:py-16 lg:gap-x-12 xl:gap-x-16">
        {/* Column 1: Left Testimonials (Hidden below lg breakpoint) */}
        {/* Takes specific width on lg screens, uses flex-col for vertical layout */}
        <div className="hidden lg:flex lg:flex-col lg:w-1/4 xl:w-1/5 space-y-6 mt-16"> {/* Added mt-16 to roughly align vertically with form card */}
           {leftTestimonials.map((testimonial) => (
             <motion.div
               key={testimonial.id}
               initial={{ opacity: 0, x: -30 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.5, delay: testimonial.delay }}
               className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md w-full max-w-[280px] self-end" // Align items to the right edge of the column
             >
               <div className="flex p-4">
                 {/* Avatar Placeholder */}
                 <div className="w-10 h-10 bg-gray-200 rounded-full relative overflow-hidden mr-3 flex-shrink-0">
                   <div className="absolute inset-0 backdrop-blur-xl bg-gradient-to-r from-indigo-400/30 to-purple-400/30"></div>
                 </div>
                 {/* Content */}
                 <div>
                   <div className="text-amber-500 text-xs mb-1">★★★★★</div>
                   <p className="text-gray-600 italic text-xs">"{testimonial.quote}"</p>
                   <p className="text-xs font-medium text-indigo-700 mt-1">- {testimonial.author}</p>
                 </div>
               </div>
             </motion.div>
           ))}
        </div>

        {/* Column 2: Center Login Form */}
        {/* Takes full width on small screens, specific width on lg screens. Max-width applied directly */}
        <div className="w-full max-w-md lg:w-2/5 xl:w-2/5 flex flex-col items-center mt-8 lg:mt-0"> {/* Adjusted width, remove lg:w-1/2 */}
            {/* Welcome Text */}
            <div className="text-center mb-8 w-full">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
                <p className="text-gray-600">Continue your journey toward a stronger relationship</p>
            </div>

            {/* Form Structure Container */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full" // Takes full width of its column
            >
                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Form Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-white rounded-xl shadow-lg p-8 border border-purple-100 w-full" // Ensure form card takes full width
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-gray-700 mb-2 font-medium">Email</label>
                            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" required placeholder="your.email@example.com" />
                        </div>
                        {/* Password Input */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label htmlFor="password" className="block text-gray-700 font-medium">Password</label>
                                <Link href="/auth/reset-password" className="text-sm text-purple-600 hover:text-purple-800 transition-colors">Forgot password?</Link>
                            </div>
                            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" required placeholder="••••••••" />
                        </div>
                        {/* Submit Button */}
                        <div className="pt-2">
                            <button type="submit" disabled={isLoading} className={`cursor-pointer w-full px-4 py-3 rounded-lg text-white font-medium shadow-md transform transition-all duration-200 ${isLoading ? 'bg-purple-400 cursor-wait' : 'bg-gradient-to-r from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-900 hover:shadow-lg active:scale-[0.98]'}`}>
                                {isLoading ? 'Logging in...' : 'Sign In'}
                            </button>
                        </div>
                    </form>
                    {/* Register Link */}
                    <div className="mt-8 text-center">
                        <p className="text-gray-600">New to our therapy platform?{' '} <Link href="/auth/register" className="text-purple-600 hover:text-purple-800 font-medium transition-colors">Create an account</Link></p>
                    </div>
                    {/* Quote inside form card */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-sm text-center text-gray-600">"A healthy relationship requires open communication and mutual understanding. We're here to support your journey."</p>
                    </div>
                </motion.div>
                {/* Privacy Text below form card */}
                <p className="text-center text-gray-500 text-xs mt-6">Your privacy and security are our top priorities. All communications are encrypted and confidential.</p>
            </motion.div>
        </div>

        {/* Column 3: Right Testimonials (Hidden below lg breakpoint) */}
        {/* Takes specific width on lg screens, uses flex-col for vertical layout */}
        <div className="hidden lg:flex lg:flex-col lg:w-1/4 xl:w-1/5 space-y-6 mt-16"> {/* Added mt-16 */}
            {rightTestimonials.map((testimonial) => (
                <motion.div
                    key={testimonial.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: testimonial.delay }}
                    className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md w-full max-w-[280px] self-start" // Align items to the left edge of the column
                >
                   <div className="flex p-4">
                       {/* Avatar Placeholder */}
                       <div className="w-10 h-10 bg-gray-200 rounded-full relative overflow-hidden mr-3 flex-shrink-0">
                          <div className="absolute inset-0 backdrop-blur-xl bg-gradient-to-r from-purple-400/30 to-indigo-400/30"></div>
                       </div>
                       {/* Content */}
                       <div>
                           <div className="text-amber-500 text-xs mb-1">★★★★★</div>
                           <p className="text-gray-600 italic text-xs">"{testimonial.quote}"</p>
                           <p className="text-xs font-medium text-indigo-700 mt-1">- {testimonial.author}</p>
                       </div>
                   </div>
                </motion.div>
            ))}
        </div>
    </div>
  );
}