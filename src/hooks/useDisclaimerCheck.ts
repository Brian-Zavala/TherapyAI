"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
  const [disclaimerStatus, setDisclaimerStatus] = useState<DisclaimerStatus>({
    hasAccepted: false,
    acceptedVersion: null,
    acceptedDate: null,
    needsUpdate: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    async function checkDisclaimerStatus() {
      if (status === 'loading') return;
      
      if (!session?.user?.id) {
        setDisclaimerStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        logger.info('Checking disclaimer status', { userId: session.user.id });
        
        // Fetch user's disclaimer acceptance status
        const response = await fetch('/api/user/disclaimer-status');
        
        if (!response.ok) {
          throw new Error('Failed to fetch disclaimer status');
        }

        const data = await response.json();
        
        const status: DisclaimerStatus = {
          hasAccepted: data.hasAccepted || false,
          acceptedVersion: data.acceptedVersion || null,
          acceptedDate: data.acceptedDate ? new Date(data.acceptedDate) : null,
          needsUpdate: data.hasAccepted && data.acceptedVersion !== DISCLAIMER_VERSION,
          isLoading: false,
          error: null
        };

        setDisclaimerStatus(status);

        // Show disclaimer if not accepted or needs update
        if (!status.hasAccepted || status.needsUpdate) {
          setShowDisclaimer(true);
        }

      } catch (error) {
        logger.error('Failed to check disclaimer status', { 
          error: error instanceof Error ? error.message : error 
        });
        
        setDisclaimerStatus(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to check disclaimer status'
        }));
        
        // Show disclaimer on error to be safe
        setShowDisclaimer(true);
      }
    }

    checkDisclaimerStatus();
  }, [session?.user?.id, status]);

  const acceptDisclaimer = async () => {
    if (!session?.user?.id) {
      logger.error('Cannot accept disclaimer without session');
      return false;
    }

    try {
      logger.info('Accepting disclaimer', { userId: session.user.id });
      
      const response = await fetch('/api/user/accept-disclaimer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: DISCLAIMER_VERSION
        })
      });

      const data = await response.json();
      
      // Check if migration is needed
      if (data.migrationNeeded) {
        logger.warn('Database migration needed for disclaimer feature');
        // Still hide modal to let user continue
        setShowDisclaimer(false);
        alert('Note: Your acceptance could not be saved. The disclaimer may appear again on your next visit.');
        return false;
      }

      if (!response.ok) {
        throw new Error('Failed to accept disclaimer');
      }
      
      // Update local state
      setDisclaimerStatus({
        hasAccepted: true,
        acceptedVersion: DISCLAIMER_VERSION,
        acceptedDate: new Date(),
        needsUpdate: false,
        isLoading: false,
        error: null
      });
      
      setShowDisclaimer(false);
      
      logger.info('Disclaimer accepted successfully', { userId: session.user.id });
      return true;

    } catch (error) {
      logger.error('Failed to accept disclaimer', { 
        userId: session.user.id,
        error: error instanceof Error ? error.message : error 
      });
      
      setDisclaimerStatus(prev => ({
        ...prev,
        error: 'Failed to save disclaimer acceptance'
      }));
      
      return false;
    }
  };

  const declineDisclaimer = () => {
    logger.info('User declined disclaimer', { userId: session?.user?.id });
    // For now, just hide the modal - in production, might redirect or show warning
    setShowDisclaimer(false);
  };

  return {
    showDisclaimer,
    disclaimerStatus,
    acceptDisclaimer,
    declineDisclaimer,
    isLoading: status === 'loading' || disclaimerStatus.isLoading,
    currentVersion: DISCLAIMER_VERSION
  };
}