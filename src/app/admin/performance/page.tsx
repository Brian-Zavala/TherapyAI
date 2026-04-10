"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useSession } from '@/hooks/useClerkSession'
import { useRouter } from 'next/navigation';

interface PerformanceStats {
  performance: {
    summary: {
      count: number;
      avg: number;
      min: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
      slowCount: number;
    } | null;
    slowEndpoints: Array<{
      route: string;
      avgDuration: number;
      count: number;
    }>;
    timestamp: Date;
  };
  cache: {
    dashboard: {
      memorySize: number;
      redisHealthy: boolean;
    };
    session: {
      size: number;
      oldestExpiry: number | null;
    };
  };
  database: {
    connected: boolean;
    latency?: number;
    error?: string;
  };
  timestamp: string;
}

export default function PerformanceDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/performance/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch performance stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    fetchStats();
  }, [session, status, router]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const getHealthColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">Real-time performance metrics</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Database</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {stats.database.connected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-600">Connected</span>
                  {stats.database.latency && (
                    <span className="text-sm text-muted-foreground">
                      ({stats.database.latency}ms)
                    </span>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-600">Disconnected</span>
                </>
              )}
            </div>
            {stats.database.error && (
              <p className="text-sm text-red-600 mt-1">{stats.database.error}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Redis Cache</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {stats.cache.dashboard.redisHealthy ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-600">Healthy</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-yellow-600">Using Memory Cache</span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Memory: {stats.cache.dashboard.memorySize} items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session Cache</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span>{stats.cache.session.size} sessions cached</span>
            </div>
            {stats.cache.session.oldestExpiry && (
              <p className="text-sm text-muted-foreground mt-1">
                Oldest expires: {new Date(stats.cache.session.oldestExpiry).toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* API Performance Summary */}
      {stats.performance.summary && (
        <Card>
          <CardHeader>
            <CardTitle>API Performance Summary</CardTitle>
            <CardDescription>
              Based on {stats.performance.summary.count} requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Average</p>
                <p className={`text-2xl font-bold ${getHealthColor(stats.performance.summary.avg, { good: 200, warning: 500 })}`}>
                  {stats.performance.summary.avg}ms
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">P50 (Median)</p>
                <p className={`text-2xl font-bold ${getHealthColor(stats.performance.summary.p50, { good: 150, warning: 300 })}`}>
                  {stats.performance.summary.p50}ms
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">P95</p>
                <p className={`text-2xl font-bold ${getHealthColor(stats.performance.summary.p95, { good: 500, warning: 1000 })}`}>
                  {stats.performance.summary.p95}ms
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">P99</p>
                <p className={`text-2xl font-bold ${getHealthColor(stats.performance.summary.p99, { good: 1000, warning: 2000 })}`}>
                  {stats.performance.summary.p99}ms
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm">
                <span className="font-medium">Range:</span> {stats.performance.summary.min}ms - {stats.performance.summary.max}ms
              </p>
              <p className="text-sm mt-1">
                <span className="font-medium">Slow requests (&gt;1s):</span> {stats.performance.summary.slowCount}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slow Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Slowest Endpoints</CardTitle>
          <CardDescription>
            Endpoints with highest average response time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.performance.slowEndpoints.length === 0 ? (
              <p className="text-muted-foreground">No slow endpoints detected</p>
            ) : (
              stats.performance.slowEndpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-mono text-sm">{endpoint.route}</p>
                    <p className="text-xs text-muted-foreground">{endpoint.count} requests</p>
                  </div>
                  <p className={`font-bold ${getHealthColor(endpoint.avgDuration, { good: 200, warning: 500 })}`}>
                    {endpoint.avgDuration}ms
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(stats.timestamp).toLocaleString()}
      </div>
    </div>
  );
}