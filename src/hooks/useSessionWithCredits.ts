'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CreditStatus {
  available: number;
  total: number;
  used: number;
  isUnlimited: boolean;
  planType: string;
  maxSessionDuration: number;
}

interface SessionCreationResult {
  sessionId: string;
  creditsReserved: number;
  maxDuration: number;
  vapiConfig?: any;
}

interface CreditValidation {
  canStart: boolean;
  availableMinutes: number;
  requiredMinutes: number;
  suggestedDuration?: number;
  reason?: string;
}

// Fetch user's credit status
async function fetchCredits(): Promise<CreditStatus> {
  const response = await fetch('/api/credits');
  if (!response.ok) {
    throw new Error('Failed to fetch credits');
  }
  return response.json();
}

// Create session with credit validation
async function createSessionWithCredits(params: {
  therapyType: string;
  requestedDuration?: number;
}): Promise<SessionCreationResult> {
  const response = await fetch('/api/sessions/create-with-credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create session');
  }
  
  return response.json();
}

// Check credit status during session
async function checkSessionCredits(sessionId: string) {
  const response = await fetch(`/api/sessions/${sessionId}/credit-status`);
  if (!response.ok) {
    throw new Error('Failed to check credit status');
  }
  return response.json();
}

export function useSessionWithCredits() {
  const router = useRouter();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [creditWarnings, setCreditWarnings] = useState<string[]>([]);

  // Query for credit status
  const {
    data: credits,
    isLoading: creditsLoading,
    error: creditsError,
    refetch: refetchCredits,
  } = useQuery({
    queryKey: ['credits'],
    queryFn: fetchCredits,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });

  // Real-time credit status for active session
  const {
    data: sessionCredits,
    refetch: refetchSessionCredits,
  } = useQuery({
    queryKey: ['session-credits', activeSessionId],
    queryFn: () => activeSessionId ? checkSessionCredits(activeSessionId) : null,
    enabled: !!activeSessionId,
    refetchInterval: 10000, // Check every 10 seconds during session
  });

  // Validate if user can start a session
  const validateCredits = useCallback((
    therapyType: string,
    requestedDuration?: number
  ): CreditValidation => {
    if (!credits) {
      return {
        canStart: false,
        availableMinutes: 0,
        requiredMinutes: requestedDuration || 15,
        reason: 'Loading credit information...',
      };
    }

    // Determine session duration based on therapy type
    const defaultDurations: Record<string, number> = {
      individual: 20,
      couples: 25,
      family: 30,
    };
    
    const requiredMinutes = requestedDuration || defaultDurations[therapyType] || 15;
    const availableMinutes = credits.available;

    // Check if user has unlimited plan
    if (credits.isUnlimited) {
      return {
        canStart: true,
        availableMinutes: credits.maxSessionDuration,
        requiredMinutes,
        suggestedDuration: Math.min(requiredMinutes, credits.maxSessionDuration),
      };
    }

    // Check if user has sufficient credits
    if (availableMinutes >= requiredMinutes) {
      return {
        canStart: true,
        availableMinutes,
        requiredMinutes,
        suggestedDuration: requiredMinutes,
      };
    }

    // Check if partial session is possible
    if (availableMinutes >= 5) {
      return {
        canStart: true,
        availableMinutes,
        requiredMinutes,
        suggestedDuration: availableMinutes,
        reason: `You have ${availableMinutes} minutes available. Starting partial session.`,
      };
    }

    // Insufficient credits
    return {
      canStart: false,
      availableMinutes,
      requiredMinutes,
      reason: 'Insufficient credits. Please upgrade your plan.',
    };
  }, [credits]);

  // Create session with credit reservation
  const createSession = useCallback(async (
    therapyType: string,
    requestedDuration?: number
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
    try {
      setIsCreatingSession(true);

      // Validate credits first
      const validation = validateCredits(therapyType, requestedDuration);
      
      if (!validation.canStart) {
        toast.error(validation.reason || 'Cannot start session');
        return { success: false, error: validation.reason };
      }

      // Show warning if using partial session
      if (validation.suggestedDuration && validation.suggestedDuration < (requestedDuration || 0)) {
        toast.warning(
          `Starting ${validation.suggestedDuration} minute session (${validation.availableMinutes} minutes available)`
        );
      }

      // Create session with credits
      const result = await createSessionWithCredits({
        therapyType,
        requestedDuration: validation.suggestedDuration,
      });

      setActiveSessionId(result.sessionId);
      
      toast.success(
        `Session started! ${result.creditsReserved} minutes reserved.`
      );

      // Navigate to session page
      router.push(`/dashboard/session/${result.sessionId}`);

      return { success: true, sessionId: result.sessionId };
    } catch (error) {
      console.error('Failed to create session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsCreatingSession(false);
    }
  }, [validateCredits, router]);

  // Monitor credit usage during session
  useEffect(() => {
    if (!sessionCredits) return;

    // Check for warnings
    const warnings = sessionCredits.warnings || [];
    
    if (warnings.length > 0) {
      setCreditWarnings(warnings.map((w: any) => w.message));
      
      // Show critical warnings as toasts
      const criticalWarning = warnings.find((w: any) => w.level === 'critical');
      if (criticalWarning) {
        toast.warning(criticalWarning.message, {
          duration: 10000,
          important: true,
        });
      }
    }

    // Check if session is about to end
    if (sessionCredits.creditsRemaining <= 2) {
      toast.error(
        `Session ending in ${sessionCredits.creditsRemaining} minutes!`,
        { duration: 0, important: true }
      );
    }
  }, [sessionCredits]);

  // Recovery check on mount
  useEffect(() => {
    const checkForRecovery = async () => {
      try {
        const response = await fetch('/api/sessions/check-recovery');
        const data = await response.json();
        
        if (data.hasActiveSession) {
          setActiveSessionId(data.sessionId);
          
          if (data.canRecover) {
            toast.info(
              `Recovered session with ${data.creditsRemaining} minutes remaining`,
              { duration: 5000 }
            );
          }
        }
      } catch (error) {
        console.error('Recovery check failed:', error);
      }
    };

    checkForRecovery();
  }, []);

  return {
    // Credit information
    credits,
    creditsLoading,
    creditsError,
    refetchCredits,
    
    // Session creation
    validateCredits,
    createSession,
    isCreatingSession,
    
    // Active session tracking
    activeSessionId,
    sessionCredits,
    creditWarnings,
    
    // Utilities
    canStartSession: (therapyType: string, duration?: number) => 
      validateCredits(therapyType, duration).canStart,
    getRemainingCredits: () => credits?.available || 0,
    isUnlimited: () => credits?.isUnlimited || false,
  };
}

// Hook for credit display component
export function useCreditDisplay() {
  const {
    data: creditData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['credits'],
    queryFn: fetchCredits,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  const getWarningLevel = useCallback(() => {
    if (!creditData || creditData.isUnlimited) return null;
    
    const percentageUsed = (creditData.used / creditData.total) * 100;
    
    if (percentageUsed >= 90) return 'critical';
    if (percentageUsed >= 80) return 'warning';
    return null;
  }, [creditData]);

  return {
    credits: creditData,
    isLoading,
    error,
    warningLevel: getWarningLevel(),
    percentageUsed: creditData 
      ? Math.round((creditData.used / creditData.total) * 100)
      : 0,
  };
}