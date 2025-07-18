// src/components/dashboard/DashboardComponentWrapper.tsx
"use client";

import React from 'react';
import dynamic from 'next/dynamic';

// Feature flag - can be controlled via environment variable or user preference
const USE_UNIFIED_DASHBOARD = process.env.NEXT_PUBLIC_USE_UNIFIED_DASHBOARD === 'true';

// Legacy components (loaded dynamically to reduce bundle size)
const ComprehensiveTherapyInsights = dynamic(
  () => import("@/components/dashboard/ComprehensiveTherapyInsights").then(mod => ({ default: mod.ComprehensiveTherapyInsights })),
  { ssr: false }
);

const CommunicationMetrics = dynamic(
  () => import("@/components/dashboard/CommunicationMetrics"),
  { ssr: false }
);

const RelationshipProgressCard = dynamic(
  () => import("@/components/dashboard/RelationshipProgressCard"),
  { ssr: false }
);

// Unified components (new implementation)
const ComprehensiveTherapyInsightsUnified = dynamic(
  () => import("@/components/dashboard/ComprehensiveTherapyInsightsUnified").then(mod => ({ default: mod.ComprehensiveTherapyInsightsUnified })),
  { ssr: false }
);

const CommunicationMetricsUnified = dynamic(
  () => import("@/components/dashboard/CommunicationMetricsUnified").then(mod => ({ default: mod.CommunicationMetricsUnified })),
  { ssr: false }
);

const RelationshipProgressUnified = dynamic(
  () => import("@/components/dashboard/RelationshipProgressUnified").then(mod => ({ default: mod.RelationshipProgressUnified })),
  { ssr: false }
);

// Wrapper components that choose between legacy and unified versions
export function TherapyInsightsWrapper() {
  if (USE_UNIFIED_DASHBOARD) {
    return <ComprehensiveTherapyInsightsUnified />;
  }
  return <ComprehensiveTherapyInsights />;
}

export function CommunicationMetricsWrapper() {
  if (USE_UNIFIED_DASHBOARD) {
    return <CommunicationMetricsUnified />;
  }
  return <CommunicationMetrics />;
}

export function RelationshipProgressWrapper() {
  if (USE_UNIFIED_DASHBOARD) {
    return <RelationshipProgressUnified />;
  }
  return <RelationshipProgressCard />;
}

// Export a hook to check if unified dashboard is enabled
export function useUnifiedDashboard() {
  return USE_UNIFIED_DASHBOARD;
}

// Component to show which version is being used (for debugging)
export function DashboardVersionIndicator() {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-4 left-4 bg-background/80 backdrop-blur-sm border rounded px-2 py-1 text-xs text-muted-foreground">
      Dashboard: {USE_UNIFIED_DASHBOARD ? 'Unified' : 'Legacy'}
    </div>
  );
}