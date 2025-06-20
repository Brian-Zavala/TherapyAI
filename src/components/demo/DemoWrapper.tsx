// Wrapper component that adds demo UI elements when in demo mode
"use client";

import { useEffect, useState } from 'react';
import { isDemoMode, getDemoTimeRemaining, formatDemoTime } from '@/config/demo.config';
import { useRouter } from 'next/navigation';

interface DemoWrapperProps {
  children: React.ReactNode;
}

export function DemoWrapper({ children }: DemoWrapperProps) {
  const router = useRouter();
  const [startTime] = useState(Date.now());
  const [timeRemaining, setTimeRemaining] = useState(5 * 60 * 1000);

  useEffect(() => {
    if (!isDemoMode()) return;

    const interval = setInterval(() => {
      const remaining = getDemoTimeRemaining(startTime);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        router.push('/demo/ended');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, router]);

  if (!isDemoMode()) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Demo Banner */}
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black px-4 py-2 text-center z-50">
        <p className="text-sm font-medium">
          🎭 Demo Mode - {formatDemoTime(timeRemaining)} remaining
          <a href="/demo/upgrade" className="ml-4 underline font-semibold">
            Unlock Full Version
          </a>
        </p>
      </div>

      {/* Main Content with padding for banner */}
      <div className="pt-10">
        {children}
      </div>

      {/* Demo Limitations Tooltip */}
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-40">
        <h3 className="font-semibold text-sm mb-2">Demo Limitations</h3>
        <ul className="text-xs space-y-1 text-gray-600">
          <li>• 5-minute session limit</li>
          <li>• Simulated AI responses</li>
          <li>• No data saved</li>
          <li>• Limited features</li>
        </ul>
      </div>
    </div>
  );
}