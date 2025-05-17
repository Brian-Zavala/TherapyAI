'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useRouter } from 'next/navigation';
import { CalendarIcon, Clock, MessageSquare, Bookmark, Mail, Phone } from 'lucide-react';

export default function SchedulePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [theme, setTheme] = useState<string>('AI Therapy Session');
  const [notes, setNotes] = useState<string>('');
  const [notificationPrefs] = useState<string>('email'); // Removed state setter, always use email
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  // Fetch user profile on mount
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          setUserProfile(data);
          // No longer setting notification preferences from user profile
        })
        .catch(error => console.error('Error fetching profile:', error));
    }
  }, [authStatus]);

  // Redirect if not authenticated
  if (authStatus === 'unauthenticated') {
    router.push('/api/auth/signin?callbackUrl=/schedule');
    return null;
  }

  if (authStatus === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-gray-300 mb-4"></div>
          <div className="h-4 w-32 bg-gray-300 rounded"></div>
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
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Scheduled!</h2>
          <p className="text-gray-600 mb-6">Your therapy session has been successfully scheduled. Redirecting to dashboard...</p>
          <div className="animate-pulse h-1 bg-gray-200 rounded-full w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100/80 via-purple-100/70 to-white/40 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="md:flex">
           {/* Left Column - Illustration and Info */}
    <div className="bg-gradient-to-br from-blue-900 to-green-900 !text-white md:w-2/5 p-8 flex flex-col justify-between">
      <div>
        <h2 className="text-3xl font-bold mb-6 text-white">Schedule Your Therapy Session</h2>
        <p className="mb-6 opacity-28 !text-white">Take a step towards better mental wellness by scheduling your personalized therapy session.</p>
        
        <div className="space-y-4 mt-8">
          <div className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 mt-1 mr-3">
              <CalendarIcon className="h-6 w-6 !text-gray-300" />
            </div>
            <div>
              <h3 className="font-medium text-white">Flexible Scheduling</h3>
              <p className="text-sm opacity-28 !text-white">Choose a time that works best for your schedule</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 mt-1 mr-3">
              <Clock className="h-6 w-6 text-gray-300" />
            </div>
            <div>
              <h3 className="font-medium text-white">Multiple Duration Options</h3>
              <p className="text-sm opacity-28 !text-white">Select from 30, 60, or 28-minute sessions</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 mt-1 mr-3">
              <MessageSquare className="h-6 w-6 text-gray-300" />
            </div>
            <div>
              <h3 className="font-medium text-white">Personalized Experience</h3>
              <p className="text-sm opacity-28 !text-white">Add notes to help customize your therapy experience</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="hidden md:block mt-8">
        <p className="text-sm  !text-white">Need assistance? Contact support@coupletherapy.com</p>
      </div>
    </div>
            {/* Right Column - Form */}
            <div className="md:w-3/5 p-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Enter Session Details</h3>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-gray-500 focus:border-gray-500"
                      minDate={new Date()}
                      placeholderText="Click to select date and time"
                      required
                      id="date"
                    />
                    <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                    Session Duration
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[30, 60, 90].map((mins) => (
                      <div key={mins}>
                        <button
                          type="button"
                          onClick={() => setDuration(mins)}
                          className={`w-full py-2 px-3 border ${
                            duration === mins 
                              ? 'bg-gray-50 border-gray-500 text-gray-700' 
                              : 'border-gray-300 text-gray-500'
                          } rounded-md flex justify-center items-center focus:outline-none focus:ring-2 focus:ring-gray-500`}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{mins} min</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">
                    Session Theme
                  </label>
                  <div className="relative">
                    <select
                      id="theme"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-gray-500 focus:border-gray-500 appearance-none"
                    >
                      <option value="AI Therapy Session">AI Therapy Session</option>
                      <option value="Communication Skills">Communication Skills</option>
                      <option value="Conflict Resolution">Conflict Resolution</option>
                      <option value="Rebuilding Trust">Rebuilding Trust</option>
                      <option value="Emotional Intimacy">Emotional Intimacy</option>
                      <option value="Life Transitions">Life Transitions</option>
                    </select>
                    <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
                      <Bookmark className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Session Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any specific topics or concerns you'd like to address during your session..."
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-gray-500 focus:border-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Reminders
                  </label>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    <p className="text-gray-700">
                      You'll receive an email reminder 24 hours before your session
                    </p>
                  </div>
                </div>
                
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!selectedDate || loading}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
                  </button>
                </div>
              </form>
              
              <div className="mt-6">
                <p className="text-xs text-gray-500">
                  * You can reschedule or cancel your session up to 24 hours before the scheduled time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}