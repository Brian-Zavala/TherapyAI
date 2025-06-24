// src/components/dashboard/DashboardMetricsTest.tsx
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import EnhancedCommunicationMetrics from "./EnhancedCommunicationMetrics";
import MetricContainer from "./MetricContainer";
import { RealTimeMetricProvider } from "./RealTimeMetricProvider";
import { DashboardErrorBoundary } from "./DashboardErrorBoundary";

// ========================================
// TEST DATA GENERATOR
// ========================================

const generateTestMetrics = (scenario: string) => {
  const scenarios = {
    empty: [],
    single: [{
      id: 'test-1',
      name: 'Active Listening',
      value: 75,
      confidence: 80,
      source: 'session' as const,
      timestamp: new Date().toISOString()
    }],
    improving: [
      { id: 'test-1', name: 'Active Listening', value: 85, previousValue: 70, trend: 'up' as const, confidence: 90, source: 'session' as const, timestamp: new Date().toISOString() },
      { id: 'test-2', name: 'Expressing Needs', value: 80, previousValue: 65, trend: 'up' as const, confidence: 85, source: 'session' as const, timestamp: new Date().toISOString() },
      { id: 'test-3', name: 'Conflict Resolution', value: 70, previousValue: 60, trend: 'up' as const, confidence: 75, source: 'assessment' as const, timestamp: new Date().toISOString() },
      { id: 'test-4', name: 'Emotional Support', value: 90, previousValue: 88, trend: 'stable' as const, confidence: 95, source: 'session' as const, timestamp: new Date().toISOString() }
    ],
    declining: [
      { id: 'test-1', name: 'Active Listening', value: 60, previousValue: 75, trend: 'down' as const, confidence: 70, source: 'session' as const, timestamp: new Date().toISOString() },
      { id: 'test-2', name: 'Expressing Needs', value: 55, previousValue: 70, trend: 'down' as const, confidence: 65, source: 'session' as const, timestamp: new Date().toISOString() },
      { id: 'test-3', name: 'Conflict Resolution', value: 45, previousValue: 60, trend: 'down' as const, confidence: 60, source: 'assessment' as const, timestamp: new Date().toISOString() },
      { id: 'test-4', name: 'Emotional Support', value: 50, previousValue: 55, trend: 'down' as const, confidence: 55, source: 'session' as const, timestamp: new Date().toISOString() }
    ],
    lowConfidence: [
      { id: 'test-1', name: 'Active Listening', value: 70, confidence: 30, source: 'calculated' as const, timestamp: new Date().toISOString() },
      { id: 'test-2', name: 'Expressing Needs', value: 65, confidence: 25, source: 'calculated' as const, timestamp: new Date().toISOString() },
      { id: 'test-3', name: 'Conflict Resolution', value: 60, confidence: 20, source: 'calculated' as const, timestamp: new Date().toISOString() },
      { id: 'test-4', name: 'Emotional Support', value: 75, confidence: 35, source: 'calculated' as const, timestamp: new Date().toISOString() }
    ],
    highPerformance: [
      { id: 'test-1', name: 'Active Listening', value: 95, previousValue: 92, trend: 'up' as const, confidence: 98, source: 'session' as const, timestamp: new Date().toISOString() },
      { id: 'test-2', name: 'Expressing Needs', value: 92, previousValue: 90, trend: 'stable' as const, confidence: 95, source: 'session' as const, timestamp: new Date().toISOString() },
      { id: 'test-3', name: 'Conflict Resolution', value: 88, previousValue: 85, trend: 'up' as const, confidence: 90, source: 'assessment' as const, timestamp: new Date().toISOString() },
      { id: 'test-4', name: 'Emotional Support', value: 96, previousValue: 94, trend: 'up' as const, confidence: 99, source: 'session' as const, timestamp: new Date().toISOString() }
    ]
  };

  return scenarios[scenario as keyof typeof scenarios] || scenarios.improving;
};

// ========================================
// TEST COMPONENT
// ========================================

export default function DashboardMetricsTest() {
  const [testScenario, setTestScenario] = useState('improving');
  const [errorMode, setErrorMode] = useState<string | null>(null);
  const [latency, setLatency] = useState(0);

  // Mock fetch function for testing
  const mockFetch = async (url: string) => {
    // Simulate network latency
    if (latency > 0) {
      await new Promise(resolve => setTimeout(resolve, latency));
    }

    // Simulate errors
    if (errorMode === 'network') {
      throw new Error('Network request failed');
    }
    if (errorMode === '500') {
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' })
      };
    }
    if (errorMode === '401') {
      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Please sign in' })
      };
    }

    // Return test data
    const data = generateTestMetrics(testScenario);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        metrics: data,
        metadata: {
          totalSessions: data.length * 3,
          averageConfidence: data.reduce((sum, m) => sum + m.confidence, 0) / data.length,
          lastUpdated: new Date().toISOString(),
          dataQuality: data.length === 0 ? 'low' : data[0].confidence > 80 ? 'high' : 'medium',
          suggestions: testScenario === 'declining' ? ['Focus on improving communication'] : []
        }
      })
    };
  };

  // Override global fetch for testing
  React.useEffect(() => {
    const originalFetch = window.fetch;
    // @ts-ignore
    window.fetch = mockFetch;
    return () => {
      window.fetch = originalFetch;
    };
  }, [testScenario, errorMode, latency]);

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Test Controls */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <h1 className="text-2xl font-bold text-white mb-6">Dashboard Metrics Test Suite</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Scenario Selector */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Test Scenario
              </label>
              <select
                value={testScenario}
                onChange={(e) => setTestScenario(e.target.value)}
                className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white"
              >
                <option value="empty">No Data</option>
                <option value="single">Single Metric</option>
                <option value="improving">Improving Trends</option>
                <option value="declining">Declining Trends</option>
                <option value="lowConfidence">Low Confidence</option>
                <option value="highPerformance">High Performance</option>
              </select>
            </div>

            {/* Error Mode */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Error Simulation
              </label>
              <select
                value={errorMode || 'none'}
                onChange={(e) => setErrorMode(e.target.value === 'none' ? null : e.target.value)}
                className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white"
              >
                <option value="none">No Error</option>
                <option value="network">Network Error</option>
                <option value="500">Server Error (500)</option>
                <option value="401">Unauthorized (401)</option>
              </select>
            </div>

            {/* Latency Simulation */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Network Latency (ms)
              </label>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={latency}
                onChange={(e) => setLatency(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-white/60 text-sm mt-1">
                {latency}ms
              </div>
            </div>
          </div>
        </motion.div>

        {/* Test Cases */}
        <div className="space-y-8">
          {/* Test Case 1: Basic Metric Container */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Test Case 1: Basic Metric Container</h2>
            <MetricContainer
              title="Test Metrics"
              description="Testing basic functionality"
              fetchUrl="/api/test/metrics"
              refreshInterval={0} // Disable auto-refresh for testing
            >
              {({ metrics, loading, error, retry }) => (
                <div className="space-y-4">
                  {loading && <div className="text-white/60">Loading...</div>}
                  {error && (
                    <div className="text-red-400">
                      Error: {error}
                      <button onClick={retry} className="ml-2 underline">Retry</button>
                    </div>
                  )}
                  {metrics.map(m => (
                    <div key={m.id} className="text-white">
                      {m.name}: {m.value}
                    </div>
                  ))}
                </div>
              )}
            </MetricContainer>
          </section>

          {/* Test Case 2: Real-time Provider */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Test Case 2: Real-time Updates</h2>
            <RealTimeMetricProvider userId="test-user">
              <DashboardErrorBoundary componentName="RealTimeTest">
                <MetricContainer
                  title="Real-time Metrics"
                  description="Testing real-time functionality"
                  fetchUrl="/api/test/metrics"
                  enableRealTime={true}
                  refreshInterval={5000}
                >
                  {({ metrics, loading, error }) => (
                    <div className="grid grid-cols-2 gap-4">
                      {metrics.map(m => (
                        <div key={m.id} className="p-3 bg-white/5 rounded-lg">
                          <div className="text-sm text-white/70">{m.name}</div>
                          <div className="text-xl font-bold text-white">{m.value}%</div>
                          {m.trend && (
                            <div className={`text-sm ${m.trend === 'up' ? 'text-green-400' : m.trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                              {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
                              {m.previousValue && ` from ${m.previousValue}%`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </MetricContainer>
              </DashboardErrorBoundary>
            </RealTimeMetricProvider>
          </section>

          {/* Test Case 3: Enhanced Communication Metrics */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Test Case 3: Enhanced Component</h2>
            <RealTimeMetricProvider userId="test-user">
              <EnhancedCommunicationMetrics />
            </RealTimeMetricProvider>
          </section>

          {/* Test Case 4: Error Boundary Testing */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Test Case 4: Error Boundaries</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DashboardErrorBoundary 
                componentName="ErrorTest1" 
                level="component"
                showErrorDetails={true}
              >
                <button
                  onClick={() => { throw new Error('Test error thrown!') }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Throw Error
                </button>
              </DashboardErrorBoundary>

              <DashboardErrorBoundary 
                componentName="ErrorTest2" 
                level="section"
                fallback={(error, _, reset) => (
                  <div className="p-4 bg-yellow-500/20 rounded-lg">
                    <p className="text-yellow-300">Custom error UI: {error.message}</p>
                    <button onClick={reset} className="text-yellow-400 underline">Reset</button>
                  </div>
                )}
              >
                <button
                  onClick={() => { throw new Error('Another test error!') }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  Throw Custom Error
                </button>
              </DashboardErrorBoundary>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}