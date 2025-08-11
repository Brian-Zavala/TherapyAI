'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CreditData {
  credits: {
    available: number;
    total: number;
    used: number;
    bonus: number;
    isUnlimited: boolean;
    percentageUsed: number;
    planType: string;
    maxSessionDuration: number;
  };
  billing: {
    periodStart: string | null;
    periodEnd: string | null;
    daysRemaining: number | null;
  };
  usage: {
    totalMinutesUsed: number;
    sessionCount: number;
    averageSessionLength: number;
  };
}

async function fetchCredits(): Promise<CreditData> {
  const response = await fetch('/api/credits');
  if (!response.ok) {
    throw new Error('Failed to fetch credits');
  }
  return response.json();
}

export function CreditDisplay({ className }: { className?: string }) {
  const [showDetails, setShowDetails] = useState(false);
  
  const { data: creditData, isLoading, error } = useQuery({
    queryKey: ['credits'],
    queryFn: fetchCredits,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  if (isLoading) {
    return (
      <div className={cn('credit-display animate-pulse', className)}>
        <div className="h-6 bg-gray-200 rounded w-32"></div>
      </div>
    );
  }

  if (error || !creditData) {
    return null;
  }

  const { credits, billing, usage } = creditData;
  const isLow = credits.percentageUsed > 80;
  const isCritical = credits.percentageUsed > 90;

  if (credits.isUnlimited) {
    return (
      <div className={cn('credit-display', className)}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Plan:</span>
          <span className="text-sm font-semibold text-primary">Unlimited</span>
          <span className="text-xs text-gray-500">∞ minutes</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('credit-display space-y-2', className)}>
      {/* Main credit bar */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">
            Session Credits
          </span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>
        
        <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'absolute left-0 top-0 h-full transition-all duration-500',
              isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'
            )}
            style={{ width: `${Math.min(100, credits.percentageUsed)}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-800">
              {credits.available} / {credits.total} minutes
            </span>
          </div>
        </div>

        {/* Warning messages */}
        {isCritical && (
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Credits running low! Consider upgrading your plan.
          </p>
        )}
        {isLow && !isCritical && (
          <p className="text-xs text-yellow-600 mt-1">
            📊 {100 - credits.percentageUsed}% credits remaining
          </p>
        )}
      </div>

      {/* Detailed view */}
      {showDetails && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-500">Plan Type:</span>
              <span className="ml-1 font-medium capitalize">{credits.planType}</span>
            </div>
            <div>
              <span className="text-gray-500">Max Session:</span>
              <span className="ml-1 font-medium">{credits.maxSessionDuration} min</span>
            </div>
            <div>
              <span className="text-gray-500">Used This Month:</span>
              <span className="ml-1 font-medium">{usage.totalMinutesUsed} min</span>
            </div>
            <div>
              <span className="text-gray-500">Sessions:</span>
              <span className="ml-1 font-medium">{usage.sessionCount}</span>
            </div>
            {credits.bonus > 0 && (
              <div>
                <span className="text-gray-500">Bonus Credits:</span>
                <span className="ml-1 font-medium text-green-600">+{credits.bonus} min</span>
              </div>
            )}
            {billing.daysRemaining && (
              <div>
                <span className="text-gray-500">Resets in:</span>
                <span className="ml-1 font-medium">{billing.daysRemaining} days</span>
              </div>
            )}
          </div>

          {usage.averageSessionLength > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <span className="text-gray-500">Avg Session:</span>
              <span className="ml-1 font-medium">{usage.averageSessionLength} minutes</span>
            </div>
          )}
        </div>
      )}

      {/* Upgrade prompt */}
      {isLow && (
        <div className="flex items-center justify-between bg-yellow-50 rounded-lg p-2">
          <span className="text-xs text-yellow-800">
            Need more minutes?
          </span>
          <a
            href="/pricing"
            className="text-xs font-medium text-yellow-900 hover:text-yellow-700 underline"
          >
            Upgrade Plan →
          </a>
        </div>
      )}
    </div>
  );
}

// Compact version for header/navbar
export function CreditBadge({ className }: { className?: string }) {
  const { data: creditData, isLoading } = useQuery({
    queryKey: ['credits'],
    queryFn: fetchCredits,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  if (isLoading || !creditData) {
    return null;
  }

  const { credits } = creditData;
  
  if (credits.isUnlimited) {
    return (
      <div className={cn('text-xs font-medium text-gray-600', className)}>
        ∞
      </div>
    );
  }

  const isLow = credits.percentageUsed > 80;
  const isCritical = credits.percentageUsed > 90;

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        isCritical ? 'bg-red-100 text-red-700' :
        isLow ? 'bg-yellow-100 text-yellow-700' :
        'bg-green-100 text-green-700',
        className
      )}
    >
      <span>{credits.available}m</span>
      {(isLow || isCritical) && <span>⚠️</span>}
    </div>
  );
}