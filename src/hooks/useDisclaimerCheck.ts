"use client";

import { useState, useCallback } from 'react';
import { useSession } from '@/hooks/useClerkSession'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger';

const DISCLAIMER_VERSION = '1.0.0'; // Current disclaimer version

interface DisclaimerStatus {
  hasAccepted: boolean;
  acceptedVersion: string | null;
  acceptedDate: Date | null;
  needsUpdate: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useDisclaimerCheck() {
  const { data: session, status } = useSession();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const { data: disclaimerStatus, isLoading: queryLoading } = useQuery({
    queryKey: ['disclaimerStatus', userId],
    queryFn: async (): Promise<DisclaimerStatus> => {
      logger.info('Checking disclaimer status', { userId });

      const response = await fetch('/api/user/disclaimer-status');
      if (!response.ok) throw new Error('Failed to fetch disclaimer status');

      const data = await response.json();

      const result: DisclaimerStatus = {
        hasAccepted: data.hasAccepted || false,
        acceptedVersion: data.acceptedVersion || null,
        acceptedDate: data.acceptedDate ? new Date(data.acceptedDate) : null,
        needsUpdate: data.hasAccepted && data.acceptedVersion !== DISCLAIMER_VERSION,
        isLoading: false,
        error: null
      };

      // Show disclaimer if not accepted or needs update
      if (!result.hasAccepted || result.needsUpdate) {
        setShowDisclaimer(true);
      }

      return result;
    },
    enabled: status !== 'loading' && !!userId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    meta: {
      onError: () => {
        // Show disclaimer on error to be safe
        setShowDisclaimer(true);
      }
    }
  });

  const resolvedStatus: DisclaimerStatus = disclaimerStatus ?? {
    hasAccepted: false,
    acceptedVersion: null,
    acceptedDate: null,
    needsUpdate: false,
    isLoading: queryLoading,
    error: null
  };

  const acceptDisclaimer = useCallback(async () => {
    if (!userId) {
      logger.error('Cannot accept disclaimer without session');
      return false;
    }

    try {
      logger.info('Accepting disclaimer', { userId });

      const response = await fetch('/api/user/accept-disclaimer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: DISCLAIMER_VERSION })
      });

      const data = await response.json();

      if (data.migrationNeeded) {
        logger.warn('Database migration needed for disclaimer feature');
        setShowDisclaimer(false);
        alert('Note: Your acceptance could not be saved. The disclaimer may appear again on your next visit.');
        return false;
      }

      if (!response.ok) throw new Error('Failed to accept disclaimer');

      // Update cache directly instead of refetching
      queryClient.setQueryData(['disclaimerStatus', userId], {
        hasAccepted: true,
        acceptedVersion: DISCLAIMER_VERSION,
        acceptedDate: new Date(),
        needsUpdate: false,
        isLoading: false,
        error: null
      });

      setShowDisclaimer(false);
      logger.info('Disclaimer accepted successfully', { userId });
      return true;

    } catch (error) {
      logger.error('Failed to accept disclaimer', {
        userId,
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }, [userId, queryClient]);

  const declineDisclaimer = useCallback(() => {
    logger.info('User declined disclaimer', { userId });
    setShowDisclaimer(false);
  }, [userId]);

  return {
    showDisclaimer,
    disclaimerStatus: resolvedStatus,
    acceptDisclaimer,
    declineDisclaimer,
    isLoading: status === 'loading' || queryLoading,
    currentVersion: DISCLAIMER_VERSION
  };
}
