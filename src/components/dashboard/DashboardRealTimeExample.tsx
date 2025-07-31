/**
 * Dashboard Real-Time Example
 * Demonstrates how all real-time components work together
 * This is an example implementation showing 100% real VAPI data integration
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CommunicationMetricsRealTime } from './CommunicationMetricsRealTime';
import { RelationshipProgressRealTime } from './RelationshipProgressRealTime';
import { AIInsightsCard } from './AIInsightsCard';
import { UnifiedMetricCard } from './UnifiedMetricCard';
import { useVAPIRealTimeMetrics } from '@/hooks/useVAPIRealTimeMetrics';
import { useActiveSession } from '@/hooks/useActiveSession';
import { 
  Activity, 
  Brain, 
  Heart, 
  Users,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import '@/styles/dashboard-modern.css';

export function DashboardRealTimeExample() {
  const { activeSessionId, hasActiveSession } = useActiveSession();
  
  // Get real-time metrics for the active session
  const {
    metrics,
    derivedMetrics,
    isConnected,
    lastUpdate,
    transcriptBuffer
  } = useVAPIRealTimeMetrics({
    sessionId: activeSessionId,
    therapyType: 'couple'
  });

  // Calculate real-time session stats
  const sessionStats = React.useMemo(() => {
    if (!metrics || !transcriptBuffer.length) {
      return {
        duration: 0,
        exchanges: 0,
        sentiment: 0,
        engagementRate: 0
      };
    }

    const startTime = transcriptBuffer[0]?.timestamp 
      ? new Date(transcriptBuffer[0].timestamp).getTime() 
      : Date.now();
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    const exchanges = transcriptBuffer.length;
    const avgSentiment = transcriptBuffer
      .map(t => t.sentiment || 0)
      .reduce((a, b) => a + b, 0) / exchanges;
    
    const recentExchanges = transcriptBuffer.filter(t => 
      Date.now() - new Date(t.timestamp).getTime() < 60000
    ).length;
    const engagementRate = Math.min(100, (recentExchanges / 10) * 100);

    return {
      duration,
      exchanges,
      sentiment: avgSentiment,
      engagementRate
    };
  }, [metrics, transcriptBuffer]);

  return (
    <div className="dashboard-modern">
      <div className="dashboard-container">
        {/* Header with Connection Status */}
        <div className="dashboard-header mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="heading-responsive font-bold">Real-Time Dashboard</h1>
              <p className="text-muted-foreground text-sm">
                Live therapy session metrics powered by VAPI
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {isConnected ? (
                <Badge className="realtime-indicator">
                  <Wifi className="w-3 h-3 mr-1" />
                  <span className="realtime-dot" />
                  Connected
                </Badge>
              ) : (
                <Badge className="realtime-indicator offline">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Disconnected
                </Badge>
              )}
              
              {lastUpdate && (
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(lastUpdate).toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Session Overview Cards */}
          <motion.div 
            className="dashboard-grid-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <UnifiedMetricCard
              title="Session Duration"
              value={`${Math.floor(sessionStats.duration / 60)}:${(sessionStats.duration % 60).toString().padStart(2, '0')}`}
              icon={Clock}
              iconColor="bg-blue-500"
              gradientFrom="#3b82f6"
              gradientTo="#2563eb"
              size="medium"
              isRealTime={true}
              lastUpdate={lastUpdate}
            />
          </motion.div>

          <motion.div 
            className="dashboard-grid-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <UnifiedMetricCard
              title="Total Exchanges"
              value={sessionStats.exchanges}
              icon={Users}
              iconColor="bg-green-500"
              gradientFrom="#10b981"
              gradientTo="#059669"
              size="medium"
              isRealTime={true}
              lastUpdate={lastUpdate}
              trend={sessionStats.exchanges > 10 ? 'up' : 'neutral'}
            />
          </motion.div>

          <motion.div 
            className="dashboard-grid-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <UnifiedMetricCard
              title="Engagement Rate"
              value={Math.round(sessionStats.engagementRate)}
              unit="%"
              icon={Activity}
              iconColor="bg-purple-500"
              gradientFrom="#8b5cf6"
              gradientTo="#7c3aed"
              size="medium"
              isRealTime={true}
              lastUpdate={lastUpdate}
              showProgress={true}
              progressMax={100}
            />
          </motion.div>

          <motion.div 
            className="dashboard-grid-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <UnifiedMetricCard
              title="Sentiment Score"
              value={Math.round((sessionStats.sentiment + 1) * 50)}
              unit="%"
              icon={Heart}
              iconColor="bg-pink-500"
              gradientFrom="#ec4899"
              gradientTo="#db2777"
              size="medium"
              isRealTime={true}
              lastUpdate={lastUpdate}
              trend={sessionStats.sentiment > 0 ? 'up' : sessionStats.sentiment < 0 ? 'down' : 'neutral'}
            />
          </motion.div>

          {/* Communication Metrics - Full Width */}
          <motion.div 
            className="dashboard-grid-span-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <CommunicationMetricsRealTime 
              therapyType="couple"
              showLiveIndicator={true}
            />
          </motion.div>

          {/* Relationship Progress */}
          <motion.div 
            className="dashboard-grid-span-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <RelationshipProgressRealTime 
              therapyType="couple"
            />
          </motion.div>

          {/* AI Insights */}
          <motion.div 
            className="dashboard-grid-span-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <AIInsightsCard />
          </motion.div>

          {/* Real-Time Activity Feed */}
          <motion.div 
            className="dashboard-grid-span-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="metric-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Activity Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transcriptBuffer.slice(-5).reverse().map((transcript, index) => (
                    <motion.div
                      key={`${transcript.timestamp}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="activity-feed-item"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{transcript.speaker}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(transcript.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {transcript.text.substring(0, 100)}...
                      </p>
                      {transcript.sentiment !== undefined && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs">Sentiment:</span>
                          <div className={`w-2 h-2 rounded-full ${
                            transcript.sentiment > 0.3 ? 'bg-green-500' :
                            transcript.sentiment < -0.3 ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`} />
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {transcriptBuffer.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No activity yet. Start speaking to see real-time updates.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Mobile-Optimized Bottom Navigation */}
        <div className="show-mobile-only fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <div className="flex items-center justify-around">
            <button className="flex flex-col items-center gap-1 p-2">
              <Brain className="w-5 h-5" />
              <span className="text-xs">Insights</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-2">
              <Activity className="w-5 h-5" />
              <span className="text-xs">Metrics</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-2">
              <Heart className="w-5 h-5" />
              <span className="text-xs">Progress</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs">Trends</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Additional styles for this component */
const styles = `
.dashboard-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--dashboard-border-color);
}

.activity-feed-item {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
  border: 1px solid var(--dashboard-border-color);
  transition: all 0.2s;
}

.activity-feed-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--dashboard-border-active);
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .dashboard-grid {
    gap: 0.75rem;
  }
  
  .dashboard-grid > * {
    grid-column: span 12 !important;
  }
  
  .activity-feed-item {
    padding: 0.5rem;
  }
}
`;