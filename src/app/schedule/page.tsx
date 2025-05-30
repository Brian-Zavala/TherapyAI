'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useRouter } from 'next/navigation';
import { CalendarIcon, Clock, MessageSquare, Bookmark, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SchedulePage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [theme, setTheme] = useState<string>('AI Therapy Session');
  const [notes, setNotes] = useState<string>('');
  const [notificationPrefs] = useState<string>('email'); // Removed state setter, always use email
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  
  // Enable smooth scrolling for this page
  useEffect(() => {
    document.documentElement.classList.add('smooth-scroll');
    return () => {
      document.documentElement.classList.remove('smooth-scroll');
    };
  }, []);

  // Note: User profile fetching removed as it's not currently used

  // Redirect if not authenticated
  if (authStatus === 'unauthenticated') {
    router.push('/api/auth/signin?callbackUrl=/schedule');
    return null;
  }

  if (authStatus === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-white/20 mb-4"></div>
          <div className="h-4 w-32 bg-white/20 rounded"></div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      setError('Please select a date and time');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Submitting date:', selectedDate.toISOString());
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
          duration,
          theme,
          notes,
          notificationPrefs
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule session');
      }
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard?scheduled=success');
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'An error occurred while scheduling your session');
      console.error('Error scheduling session:', error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 flex justify-center items-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-6 flex justify-center"
          >
            <div className="h-16 w-16 bg-green-500/30 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Session Scheduled!</h2>
          <p className="text-white/70 mb-6">Your therapy session has been successfully scheduled. Redirecting to dashboard...</p>
          <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-green-500"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <style jsx global>{`
        .react-datepicker-wrapper {
          width: 100%;
        }
        .react-datepicker {
          background-color: rgba(17, 24, 39, 0.98) !important;
          border: 1px solid rgba(34, 197, 94, 0.3) !important;
          backdrop-filter: blur(16px);
          font-family: inherit;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
          border-radius: 12px;
        }
        .react-datepicker__header {
          background-color: rgba(17, 24, 39, 0.95) !important;
          border-bottom: 1px solid rgba(34, 197, 94, 0.2) !important;
          border-radius: 12px 12px 0 0;
          padding: 12px 0;
        }
        .react-datepicker__current-month {
          color: rgb(34, 197, 94) !important;
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 8px;
        }
        .react-datepicker__day-names {
          border-bottom: 1px solid rgba(34, 197, 94, 0.2);
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .react-datepicker__day-name {
          color: rgba(255, 255, 255, 0.7) !important;
          font-weight: 500;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .react-datepicker__month {
          padding: 8px;
        }
        .react-datepicker__day {
          color: rgba(255, 255, 255, 0.8) !important;
          border-radius: 8px;
          margin: 2px;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        .react-datepicker__day:hover {
          background-color: rgba(34, 197, 94, 0.2) !important;
          color: white !important;
          transform: scale(1.05);
        }
        .react-datepicker__day--selected {
          background-color: rgb(34, 197, 94) !important;
          color: white !important;
          font-weight: 600;
          box-shadow: 0 4px 8px rgba(34, 197, 94, 0.3);
        }
        .react-datepicker__day--today {
          background-color: rgba(34, 197, 94, 0.1) !important;
          color: rgb(34, 197, 94) !important;
          font-weight: 600;
        }
        .react-datepicker__day--disabled {
          color: rgba(255, 255, 255, 0.3) !important;
          cursor: not-allowed;
        }
        .react-datepicker__time-container {
          border-left: 1px solid rgba(34, 197, 94, 0.2) !important;
          background-color: rgba(17, 24, 39, 0.98);
        }
        .react-datepicker__time {
          background-color: rgba(17, 24, 39, 0.98) !important;
          border-radius: 0 12px 12px 0;
        }
        .react-datepicker__time-box {
          width: 100px;
        }
        .react-datepicker__time-list {
          scrollbar-width: thin;
          scrollbar-color: rgba(34, 197, 94, 0.5) transparent;
        }
        .react-datepicker__time-list::-webkit-scrollbar {
          width: 6px;
        }
        .react-datepicker__time-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .react-datepicker__time-list::-webkit-scrollbar-thumb {
          background: rgba(34, 197, 94, 0.5);
          border-radius: 3px;
        }
        .react-datepicker__time-list-item {
          color: white !important;
          padding: 8px 12px;
          border-radius: 6px;
          margin: 2px 8px;
          transition: all 0.2s ease;
          background: transparent !important;
        }
        .react-datepicker__time-list-item:hover {
          background-color: rgba(34, 197, 94, 0.2) !important;
          color: white !important;
        }
        .react-datepicker__time-list-item--selected {
          background-color: rgb(34, 197, 94) !important;
          color: white !important;
          font-weight: 600;
        }
        .react-datepicker__navigation {
          top: 15px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: rgba(34, 197, 94, 0.1);
          transition: all 0.2s ease;
        }
        .react-datepicker__navigation:hover {
          background-color: rgba(34, 197, 94, 0.2);
          transform: scale(1.1);
        }
        .react-datepicker__navigation-icon::before {
          border-color: rgba(34, 197, 94, 0.8) !important;
          border-width: 2px 2px 0 0;
          width: 7px;
          height: 7px;
        }
        .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
          border-color: rgb(34, 197, 94) !important;
        }
        
        /* Mobile Responsive Styles */
        @media (max-width: 640px) {
          .react-datepicker-with-time__time-box {
            display: block !important;
            width: 100% !important;
          }
          .react-datepicker--time-only .react-datepicker__time-container {
            border-left: none !important;
            margin-top: 10px;
            border-top: 1px solid rgba(34, 197, 94, 0.2) !important;
            border-radius: 12px;
          }
          .react-datepicker {
            font-size: 0.85rem !important;
            width: 90vw !important;
            max-width: 320px !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .react-datepicker__month-container {
            width: 100% !important;
          }
          .react-datepicker__time-container {
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid rgba(34, 197, 94, 0.2) !important;
            margin-top: 10px;
          }
          .react-datepicker__time {
            border-radius: 12px !important;
          }
          .react-datepicker__time-box {
            width: 100% !important;
          }
          .react-datepicker__header {
            padding: 10px 0;
          }
          .react-datepicker__current-month {
            font-size: 0.9rem !important;
            margin-bottom: 6px;
          }
          .react-datepicker__day-name {
            font-size: 0.7rem !important;
            width: 2rem !important;
            line-height: 2rem !important;
          }
          .react-datepicker__day {
            width: 2rem !important;
            line-height: 2rem !important;
            font-size: 0.8rem !important;
            margin: 2px;
          }
          .react-datepicker__month {
            padding: 6px;
          }
          .react-datepicker__time-list {
            height: 150px !important;
          }
          .react-datepicker__time-list-item {
            font-size: 0.8rem !important;
            padding: 6px 10px;
          }
          .react-datepicker__navigation {
            top: 12px;
            width: 22px;
            height: 22px;
          }
          .react-datepicker__navigation-icon::before {
            width: 6px;
            height: 6px;
          }
        }
        
        @media (max-width: 480px) {
          .react-datepicker {
            width: 85vw !important;
            max-width: 300px !important;
            font-size: 0.8rem !important;
          }
          .react-datepicker__day-name {
            width: 1.8rem !important;
            line-height: 1.8rem !important;
            font-size: 0.65rem !important;
          }
          .react-datepicker__day {
            width: 1.8rem !important;
            line-height: 1.8rem !important;
            font-size: 0.75rem !important;
          }
          .react-datepicker__time-list-item {
            font-size: 0.75rem !important;
          }
        }
        
        /* Overlay for mobile */
        @media (max-width: 640px) {
          .react-datepicker-popper {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background-color: rgba(0, 0, 0, 0.85) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 9999 !important;
            padding: 20px;
          }
          .react-datepicker__tab-loop {
            position: relative !important;
            margin: 0 !important;
          }
        }
        
        /* Desktop and tablet styles */
        @media (min-width: 641px) {
          .react-datepicker {
            display: flex !important;
          }
          .react-datepicker__month-container {
            display: inline-block !important;
          }
          .react-datepicker__time-container {
            display: inline-block !important;
          }
        }
      `}</style>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl overflow-hidden">
          <div className="lg:flex">
           {/* Left Column - Illustration and Info */}
    <div className="bg-gradient-to-br from-green-600/20 to-blue-600/20 backdrop-blur-md lg:w-2/5 p-6 sm:p-8 flex flex-col justify-between border-r border-white/10">
      <div>
        <motion.h2 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-white"
        >
          Schedule Your Therapy Session
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 text-white/70 text-sm sm:text-base"
        >
          Take a step towards better mental wellness by scheduling your personalized therapy session.
        </motion.p>
        
        <div className="space-y-4 mt-6 sm:mt-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-start"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-white">Flexible Scheduling</h3>
              <p className="text-sm text-white/60">Choose a time that works best for your schedule</p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-start"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-white">Multiple Duration Options</h3>
              <p className="text-sm text-white/60">Choose between 30 or 60-minute sessions</p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-start"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-white">Personalized Experience</h3>
              <p className="text-sm text-white/60">Add notes to help customize your therapy experience</p>
            </div>
          </motion.div>
        </div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="hidden sm:block mt-8"
      >
        <p className="text-sm text-white/60">Need assistance? Contact support@coupletherapy.com</p>
      </motion.div>
    </div>
            {/* Right Column - Form */}
            <div className="lg:w-3/5 p-6 sm:p-8">
              <motion.h3 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg sm:text-xl font-semibold text-white mb-6"
              >
                Enter Session Details
              </motion.h3>
              
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg backdrop-blur-sm"
                  >
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm">{error}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <label htmlFor="date" className="block text-sm font-medium text-white mb-2">
                    Select Date and Time *
                  </label>
                  <div className="relative">
                    <DatePicker
                      selected={selectedDate}
                      onChange={setSelectedDate}
                      showTimeSelect
                      timeFormat="h:mm aa"
                      timeIntervals={15}
                      dateFormat="MMMM d, yyyy h:mm aa"
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 backdrop-blur-sm"
                      minDate={new Date()}
                      placeholderText="Click to select date and time"
                      required
                      id="date"
                      popperClassName="datepicker-popper"
                      popperPlacement="bottom"
                      withPortal
                      showPopperArrow={false}
                      calendarClassName="custom-calendar"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <label htmlFor="duration" className="block text-sm font-medium text-white mb-2">
                    Session Duration
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {[30, 60].map((mins, index) => (
                      <motion.div 
                        key={mins}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                      >
                        <button
                          type="button"
                          onClick={() => setDuration(mins)}
                          className={`w-full py-3 px-3 border ${
                            duration === mins 
                              ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                              : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                          } rounded-lg flex justify-center items-center focus:outline-none focus:ring-2 focus:ring-green-500/50 backdrop-blur-sm transition-all duration-200 text-base`}
                        >
                          <Clock className="h-5 w-5 mr-2" />
                          <span>{mins} min</span>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <label htmlFor="theme" className="block text-sm font-medium text-white mb-2">
                    Session Theme
                  </label>
                  <div className="relative">
                    <select
                      id="theme"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 appearance-none backdrop-blur-sm"
                    >
                      <option value="AI Therapy Session" className="bg-gray-800">AI Therapy Session</option>
                      <option value="Communication Skills" className="bg-gray-800">Communication Skills</option>
                      <option value="Conflict Resolution" className="bg-gray-800">Conflict Resolution</option>
                      <option value="Rebuilding Trust" className="bg-gray-800">Rebuilding Trust</option>
                      <option value="Emotional Intimacy" className="bg-gray-800">Emotional Intimacy</option>
                      <option value="Life Transitions" className="bg-gray-800">Life Transitions</option>
                    </select>
                    <div className="absolute right-3 top-3 text-white/50 pointer-events-none">
                      <Bookmark className="h-5 w-5" />
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <label htmlFor="notes" className="block text-sm font-medium text-white mb-2">
                    Session Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any specific topics or concerns you'd like to address during your session..."
                    rows={4}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 backdrop-blur-sm resize-none"
                  />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <label className="block text-sm font-medium text-white mb-2">
                    Email Reminders
                  </label>
                  <div className="flex items-center bg-white/10 border border-white/20 rounded-lg p-3 backdrop-blur-sm">
                    <Mail className="h-4 w-4 mr-2 text-green-400" />
                    <p className="text-white/70 text-sm">
                      You'll receive an email reminder 24 hours before your session
                    </p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="pt-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <motion.button
                    type="submit"
                    disabled={!selectedDate || loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-full shadow-lg text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Scheduling...
                      </>
                    ) : (
                      'Schedule Session'
                    )}
                  </motion.button>
                </motion.div>
              </form>
              
              <motion.div 
                className="mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <p className="text-xs text-white/50">
                  * You can reschedule or cancel your session up to 24 hours before the scheduled time.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}