'use client'

import { useState, useEffect } from 'react' // Import useEffect
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion' // Import AnimatePresence

// Define testimonials data outside the component for clarity
const allTestimonials = [
    // Assign explicit side and ensure unique IDs
    { id: 't1', quote: "TherapyAI helped us communicate better and resolve conflicts effectively.", author: "Sarah & Michael", side: 'left' },
    { id: 't2', quote: "Our family dynamics improved tremendously after just a few sessions.", author: "The Anderson Family", side: 'left' },
    { id: 't3', quote: "24/7 access to therapy has been a lifesaver during stressful times.", author: "Roberto & Elena", side: 'left' },
    { id: 't4', quote: "As a single parent, the individual therapy sessions have been invaluable.", author: "Melissa R.", side: 'right' },
    { id: 't5', quote: "I was skeptical about AI therapy, but it's been incredibly helpful for my anxiety.", author: "James T.", side: 'right' },
    { id: 't6', quote: "The personalized guidance helped us navigate a challenging period.", author: "Emily & David", side: 'right' },
    { id: 't7', quote: "Learning new communication tools made a huge difference for us.", author: "Chloe & Ben", side: 'left' }, // Added more
    { id: 't8', quote: "It's convenient and surprisingly insightful. Highly recommend.", author: "Marcus G.", side: 'right' }, // Added more
];

const leftTestData = allTestimonials.filter(t => t.side === 'left');
const rightTestData = allTestimonials.filter(t => t.side === 'right');

// --- Animation Variants ---
const testimonialVariants = {
  initial: { opacity: 0, y: 30 }, // Start slightly below and faded out
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }, // Fade in and slide up
  exit: { opacity: 0, y: -30, transition: { duration: 0.4, ease: "easeIn" } }, // Fade out and slide up
};


export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // State for testimonial indices - one index per slot
  const [leftIndices, setLeftIndices] = useState([0, 1, 2].slice(0, leftTestData.length)); // Start with first 3 (or fewer)
  const [rightIndices, setRightIndices] = useState([0, 1, 2].slice(0, rightTestData.length));

  const numLeftSlots = 3; // How many testimonials to show on the left
  const numRightSlots = 3; // How many testimonials to show on the right

  // Effect to cycle testimonials
  useEffect(() => {
    // Only run the interval on the client and potentially only on larger screens
    if (typeof window === 'undefined') return;

    const intervalId = setInterval(() => {
      setLeftIndices(prevIndices => {
        return prevIndices.map((_, i) => (prevIndices[i] + numLeftSlots) % leftTestData.length);
      });
      setRightIndices(prevIndices => {
        return prevIndices.map((_, i) => (prevIndices[i] + numRightSlots) % rightTestData.length);
      });
    }, 5000); // Change testimonial every 5 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array means this runs once on mount


  const handleSubmit = async (e: React.FormEvent) => {
    // ... (handleSubmit logic remains the same)
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


  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start lg:justify-center min-h-[90vh] relative px-4 py-10 lg:px-8 lg:py-16 lg:gap-x-12 xl:gap-x-16 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10 bg-[length:400%_400%] bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 animate-gradient-xy overflow-hidden">
        {/* Add floating shapes */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-300/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-float-medium"></div>
      </div>

        {/* Column 1: Left Testimonials */}
        {/* Increased vertical spacing with space-y-8 */}
        <div className="hidden lg:flex lg:flex-col lg:w-1/4 xl:w-1/5 space-y-8 mt-16">
          {leftIndices.map((dataIndex, slotIndex) => {
             // Get the actual testimonial data based on the cycling index
             const testimonial = leftTestData[dataIndex];
             if (!testimonial) return null; // Handle cases with fewer testimonials than slots

             return (
                <motion.div
                  key={testimonial.id} // *** IMPORTANT: Key must be stable for the data item ***
                  variants={testimonialVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md w-full max-w-[280px] self-end"
                  // Layout prop helps smooth animation
                  layout
                >
                  <div className="flex p-4 min-h-[100px]"> {/* Added min-height */}
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
                      <p className="text-gray-600 italic text-xs">"{testimonial.quote}"</p>
                      <p className="text-xs font-medium text-indigo-700 mt-1">- {testimonial.author}</p>
                    </div>
                  </div>
                </motion.div>
             )
           })}
        </div>

        {/* Column 2: Center Login Form (remains largely the same) */}
        <div className="w-full max-w-md lg:w-2/5 xl:w-2/5 flex flex-col items-center mt-8 lg:mt-0 z-10"> {/* Add z-index if needed */}
            {/* Welcome Text */}
            <div className="text-center mb-8 w-full">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
                <p className="text-gray-600">Continue your journey toward a stronger relationship</p>
            </div>
            {/* Form Structure Container */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full">
                {error && ( <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm"> {error} </motion.div> )}
                {/* Form Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.5, delay: 0.1 }} 
                  whileHover={{ 
                    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02)",
                    translateY: -4
                  }}
                  className="bg-white rounded-xl shadow-lg p-8 border border-purple-100 w-full transition-all">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
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
                              Email
                            </label>
                        </div>
                        {/* Password */}
                        <div>
                            <div className="flex justify-between mb-2"> <label htmlFor="password" className="block text-gray-700 font-medium">Password</label> <Link href="/auth/reset-password" className="text-sm text-purple-600 hover:text-purple-800 transition-colors">Forgot password?</Link> </div>
                            <div className="relative">
                              <input 
                                type="password" 
                                id="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                                required 
                                placeholder=" " 
                                minLength={8}
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
                            </div>
                        </div>
                        {/* Submit */}
                        <div className="pt-2">
                          <motion.button 
                            type="submit" 
                            disabled={isLoading} 
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className={`cursor-pointer w-full px-4 py-3 rounded-lg text-white font-medium shadow-md transform transition-all duration-200 ${isLoading ? 'bg-purple-400 cursor-wait' : 'bg-gradient-to-r from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-900 hover:shadow-lg'}`}
                          > 
                            {isLoading ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Logging in...
                              </span>
                            ) : 'Sign In'} 
                          </motion.button> 
                        </div>
                    </form>
                    {/* Register Link */}
                    <div className="mt-8 text-center"> <p className="text-gray-600">New to our therapy platform?{' '} <Link href="/auth/register" className="text-purple-600 hover:text-purple-800 font-medium transition-colors">Create an account</Link> </p> </div>
                    {/* Quote */}
                    <div className="mt-6 pt-6 border-t border-gray-100"> <p className="text-sm text-center text-gray-600">"A healthy relationship requires open communication and mutual understanding. We're here to support your journey."</p> </div>
                </motion.div>
                {/* Privacy Text */}
                <p className="text-center text-gray-500 text-xs mt-6">Your privacy and security are our top priorities. All communications are encrypted and confidential.</p>
            </motion.div>
        </div>

        {/* Column 3: Right Testimonials */}
        {/* Increased vertical spacing with space-y-8 */}
        <div className="hidden lg:flex lg:flex-col lg:w-1/4 xl:w-1/5 space-y-8 mt-16">
           {rightIndices.map((dataIndex, slotIndex) => {
             const testimonial = rightTestData[dataIndex];
             if (!testimonial) return null;

             return (
                <motion.div
                  key={testimonial.id} // *** IMPORTANT: Key must be stable for the data item ***
                  variants={testimonialVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md w-full max-w-[280px] self-start"
                  layout
                >
                  <div className="flex p-4 min-h-[100px]"> {/* Added min-height */}
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
                      <p className="text-gray-600 italic text-xs">"{testimonial.quote}"</p>
                      <p className="text-xs font-medium text-indigo-700 mt-1">- {testimonial.author}</p>
                    </div>
                  </div>
                </motion.div>
             )
           })}
        </div>
    </div>
  );
}