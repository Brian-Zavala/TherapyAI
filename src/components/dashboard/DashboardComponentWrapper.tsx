// src/components/dashboard/DashboardComponentWrapper.tsx
"use client";

import React from 'react';
import dynamic from 'next/dynamic';

// All legacy components have been removed, only unified versions remain
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

// Wrapper components now only return unified versions
export function TherapyInsightsWrapper() {
  return <ComprehensiveTherapyInsightsUnified />;
}

export function CommunicationMetricsWrapper() {
  return <CommunicationMetricsUnified />;
}

export function RelationshipProgressWrapper() {
  return <RelationshipProgressUnified />;
}

// Export a hook to check if unified dashboard is enabled
export function useUnifiedDashboard() {
  return true; // Always true since legacy components are removed
}

// Component to show which version is being used (for debugging)
export function DashboardVersionIndicator() {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-4 left-4 bg-background/80 backdrop-blur-sm border rounded px-2 py-1 text-xs text-muted-foreground">
      Dashboard: Unified
    </div>
  );
}