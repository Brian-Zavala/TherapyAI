"use client";

import { useSession } from "next-auth/react";
import CreditDisplay from "@/components/credits/CreditDisplay";
import { useEffect } from "react";

export default function TestCreditsPage() {
  const { data: session, status } = useSession();
  
  useEffect(() => {
    console.log('[TestCreditsPage] Session status:', status);
    console.log('[TestCreditsPage] Session data:', session);
  }, [status, session]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">Credit Display Test Page</h1>
      
      <div className="mb-8 p-4 bg-gray-800 rounded">
        <h2 className="text-xl mb-2">Authentication Status:</h2>
        <p>Status: <span className="font-mono">{status}</span></p>
        <p>User ID: <span className="font-mono">{session?.user?.id || 'Not logged in'}</span></p>
        <p>Email: <span className="font-mono">{session?.user?.email || 'Not logged in'}</span></p>
      </div>
      
      <div className="mb-8 p-4 bg-gray-800 rounded">
        <h2 className="text-xl mb-2">Credit Display Component:</h2>
        <p className="text-sm text-gray-400 mb-4">
          The credit display should appear in the top-right corner if you're authenticated.
        </p>
        <p className="text-sm text-gray-400">
          Check the browser console (F12) for debug logs.
        </p>
      </div>
      
      {/* Credit Display Component */}
      <CreditDisplay />
      
      <div className="mt-8 p-4 bg-blue-900 rounded">
        <h3 className="text-lg mb-2">Troubleshooting:</h3>
        <ul className="list-disc list-inside text-sm">
          <li>Open browser console (F12) to see debug logs</li>
          <li>Look for [CreditDisplay] logs</li>
          <li>Check Network tab for /api/credits calls</li>
          <li>If not authenticated, go to <a href="/auth/login" className="underline">/auth/login</a></li>
        </ul>
      </div>
    </div>
  );
}