// Phase 3: React Query API Hooks
// Ultra-optimized data fetching with automatic caching

import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { queryOptions } from '@/providers/ReactQueryProvider';

// Types
interface DashboardMetrics {
  weeklyStreak: number;
  totalSessions: number;
  communicationScore: number;
  relationshipHealth: number;
  recentInsights: Array<{
    id: string;
    type: 'strength' | 'improvement' | 'warning';
    message: string;
    date: string;
  }>;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  preferences: Record<string, any>;
}

interface Session {
  id: string;
  userId: string;
  partnerId?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'active' | 'completed' | 'abandoned';
  type: string;
  notes?: string;
  transcript?: string;
}

// Dashboard Hooks
export function useDashboardMetrics(options?: { realtime?: boolean }) {
  return useQuery<DashboardMetrics>({
    queryKey: ['dashboard', 'metrics', options?.realtime],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/metrics/v2');
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to fetch metrics');
      }
      return res.json();
    },
    ...queryOptions.metrics,
    refetchInterval: options?.realtime ? 5000 : false,
  });
}

// User Profile Hooks
export function useProfile() {
  const queryClient = useQueryClient();
  
  const profileQuery = useQuery<UserProfile>({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const res = await fetch('/api/user/profile');
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    ...queryOptions.user,
  });

  const updateProfile = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'profile'] });
      const previousProfile = queryClient.getQueryData(['user', 'profile']);
      
      queryClient.setQueryData(['user', 'profile'], (old: UserProfile | undefined) => ({
        ...old!,
        ...newData,
      }));
      
      return { previousProfile };
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(['user', 'profile'], context?.previousProfile);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
  };
}

// Session Hooks
export function useSessionData(sessionId?: string) {
  return useQuery<Session>({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Session not found');
      return res.json();
    },
    ...queryOptions.session,
    enabled: !!sessionId,
  });
}

export function useActiveSessions() {
  return useQuery<Session[]>({
    queryKey: ['sessions', 'active'],
    queryFn: async () => {
      const res = await fetch('/api/sessions/active');
      if (!res.ok) throw new Error('Failed to fetch active sessions');
      return res.json();
    },
    ...queryOptions.realtime,
  });
}

export function useSessionHistory() {
  return useInfiniteQuery({
    queryKey: ['sessions', 'history'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/sessions/history?page=${pageParam}&limit=10`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    initialPageParam: 0,
    ...queryOptions.session,
  });
}

// Session Mutations
export function useCreateSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { duration: number; type: string }) => {
      const res = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create session');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
    },
  });
}

export function useEndSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, notes }: { sessionId: string; notes?: string }) => {
      const res = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Failed to end session');
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Update specific session
      queryClient.setQueryData(['session', variables.sessionId], data);
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: ['sessions', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
    },
  });
}

// Notification Hooks - DEPRECATED: Use @/hooks/useNotifications instead
// These are kept for backward compatibility but should not be used in new code
/*
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=50');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Disable automatic polling - use real-time updates instead
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      
      const previousNotifications = queryClient.getQueryData(['notifications']);
      
      queryClient.setQueryData(['notifications'], (old: any) => ({
        ...old,
        items: old.items.map((n: any) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, old.unreadCount - 1),
      }));
      
      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      queryClient.setQueryData(['notifications'], context?.previousNotifications);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
*/

// Assessment Hooks
export function useAssessment(assessmentId?: string) {
  return useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => {
      const res = await fetch(`/api/assessments/${assessmentId}`);
      if (!res.ok) throw new Error('Assessment not found');
      return res.json();
    },
    enabled: !!assessmentId,
    ...queryOptions.static, // Assessments don't change often
  });
}

export function useSaveAssessment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/dashboard/save-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save assessment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
    },
  });
}

// Prefetch helpers for server components
export async function prefetchDashboard() {
  const queryClient = useQueryClient();
  
  return queryClient.prefetchQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/metrics/v2');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// Utility hooks
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return {
    invalidateDashboard: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    invalidateSessions: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}