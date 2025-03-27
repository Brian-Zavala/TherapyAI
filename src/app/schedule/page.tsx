// app/schedule/page.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useRouter } from 'next/navigation';

export default function SchedulePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [theme, setTheme] = useState<string>('AI Therapy Session');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Redirect if not authenticated
  if (authStatus === 'unauthenticated') {
    router.push('/api/auth/signin?callbackUrl=/schedule');
    return null;
  }

  if (authStatus === 'loading') {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          duration,
          theme,
          notes
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        router.push('/dashboard?scheduled=success');
      } else {
        throw new Error(data.error || 'Failed to schedule session');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while scheduling your session');
      console.error('Error scheduling session:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Schedule a Therapy Session</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="max-w-md mx-auto">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select Date and Time
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={setSelectedDate}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="MMMM d, yyyy h:mm aa"
            className="w-full p-2 border rounded"
            minDate={new Date()}
            placeholderText="Click to select date and time"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Session Duration (minutes)
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full p-2 border rounded"
          >
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Session Theme
          </label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="E.g., Communication, Trust, Conflict Resolution"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Session Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border rounded"
            rows={4}
            placeholder="Add any additional information about what you'd like to discuss..."
          />
        </div>
        
        <button
          type="submit"
          disabled={!selectedDate || loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded disabled:bg-indigo-300"
        >
          {loading ? 'Scheduling...' : 'Schedule Session'}
        </button>
      </form>
    </div>
  );
}