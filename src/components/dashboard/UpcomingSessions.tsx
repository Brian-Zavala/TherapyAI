// components/UpcomingSessions.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

type Session = {
  id: string;
  date: string;
  duration: number;
  theme: string;
  notes?: string;
  status: string;
};

export default function UpcomingSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions/upcoming');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch sessions');
      }
      
      const data = await response.json();
      setSessions(data);
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      setError(err.message || 'An error occurred while fetching sessions');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSession(sessionId: string) {
    if (!confirm('Are you sure you want to cancel this session?')) {
      return;
    }
    
    try {
      setCancelling(sessionId);
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'cancelled'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel session');
      }
      
      // Refresh the sessions list
      fetchSessions();
      
    } catch (err: any) {
      console.error('Error cancelling session:', err);
      alert(`Failed to cancel session: ${err.message}`);
    } finally {
      setCancelling(null);
    }
  }

  if (loading) {
    return <div className="animate-pulse h-24 bg-gray-100 rounded-lg"></div>;
  }

  if (error) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Upcoming Sessions</h2>
        <div className="text-red-500 mb-4">Error: {error}</div>
        <Link 
          href="/schedule" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm"
        >
          Schedule New Session
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Upcoming Sessions</h2>
        <Link 
          href="/schedule" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm"
        >
          Schedule New
        </Link>
      </div>

      {sessions.length === 0 ? (
        <p className="text-gray-600 py-4">
          No upcoming sessions. Start your therapy journey today!
        </p>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const sessionDate = new Date(session.date);
            const isCancelling = cancelling === session.id;
            
            return (
              <div key={session.id} className="border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{session.theme}</h3>
                    <p className="text-sm text-gray-600">
                      {format(sessionDate, 'MMMM d, yyyy')} at {format(sessionDate, 'h:mm a')}
                    </p>
                    <p className="text-sm text-gray-600">{session.duration} minutes</p>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/dashboard/therapy?sessionId=${session.id}`}
                      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-3 py-1 rounded text-sm"
                    >
                      Start Session
                    </Link>
                    <button
                      onClick={() => handleCancelSession(session.id)}
                      disabled={isCancelling}
                      className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm disabled:opacity-50"
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </div>
                </div>
                {session.notes && (
                  <p className="text-sm mt-2 text-gray-600">{session.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}