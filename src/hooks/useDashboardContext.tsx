// src/hooks/useDashboardContext.tsx
"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import type { DashboardData, UseDashboardDataResult } from '@/hooks/useDashboardDataUnified';

interface DashboardContextValue {
  dashboardData: UseDashboardDataResult;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ 
  children, 
  dashboardData 
}: { 
  children: ReactNode;
  dashboardData: UseDashboardDataResult;
}) {
  return (
    <DashboardContext.Provider value={{ dashboardData }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
}

// Specialized hooks that use context instead of creating new queries
export function useCommunicationMetricsFromContext() {
  const { dashboardData } = useDashboardContext();
  return {
    data: dashboardData.data?.communicationMetrics || null,
    isLoading: dashboardData.isLoading,
    isRefetching: dashboardData.isRefetching,
    error: dashboardData.error,
    loadingState: dashboardData.loadingState,
    refetch: dashboardData.refetch,
  };
}

export function useProgressDataFromContext() {
  const { dashboardData } = useDashboardContext();
  return {
    data: dashboardData.data?.progressData || null,
    isLoading: dashboardData.isLoading,
    isRefetching: dashboardData.isRefetching,
    error: dashboardData.error,
    loadingState: dashboardData.loadingState,
    refetch: dashboardData.refetch,
  };
}

export function useTherapyInsightsFromContext() {
  const { dashboardData } = useDashboardContext();
  return {
    data: dashboardData.data?.therapyInsights || null,
    isLoading: dashboardData.isLoading,
    isRefetching: dashboardData.isRefetching,
    error: dashboardData.error,
    loadingState: dashboardData.loadingState,
    refetch: dashboardData.refetch,
  };
}