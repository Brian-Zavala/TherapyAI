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

  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await fetch('/api/sessions?status=scheduled');
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        const data = await response.json();
        setSessions(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-24 bg-gray-100 rounded-lg"></div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
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
                  <Link
                    href={`/dashboard/therapy?sessionId=${session.id}`}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-3 py-1 rounded text-sm"
                  >
                    Start Session
                  </Link>
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