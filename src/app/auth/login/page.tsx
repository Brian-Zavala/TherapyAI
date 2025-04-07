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
    <div className="flex flex-col lg:flex-row items-center lg:items-start lg:justify-center min-h-[90vh] bg-gradient-to-b from-indigo-50 to-purple-50 px-4 py-10 lg:px-8 lg:py-16 lg:gap-x-12 xl:gap-x-16 overflow-hidden"> {/* Added overflow-hidden */}

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
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white rounded-xl shadow-lg p-8 border border-purple-100 w-full">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-gray-700 mb-2 font-medium">Email</label>
                            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" required placeholder="your.email@example.com" />
                        </div>
                        {/* Password */}
                        <div>
                            <div className="flex justify-between mb-2"> <label htmlFor="password" className="block text-gray-700 font-medium">Password</label> <Link href="/auth/reset-password" className="text-sm text-purple-600 hover:text-purple-800 transition-colors">Forgot password?</Link> </div>
                            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" required placeholder="••••••••" />
                        </div>
                        {/* Submit */}
                        <div className="pt-2"> <button type="submit" disabled={isLoading} className={`cursor-pointer w-full px-4 py-3 rounded-lg text-white font-medium shadow-md transform transition-all duration-200 ${isLoading ? 'bg-purple-400 cursor-wait' : 'bg-gradient-to-r from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-900 hover:shadow-lg active:scale-[0.98]'}`}> {isLoading ? 'Logging in...' : 'Sign In'} </button> </div>
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