// WebSocket middleware for real-time metrics
import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as url from 'url';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import type { IncrementalMetrics } from './real-time-metrics';

// Store active WebSocket connections by user ID and session ID
const userConnections = new Map<string, Set<WebSocket & { sessionId?: string; userId?: string }>>();
const sessionConnections = new Map<string, Set<WebSocket & { userId?: string }>>();

export interface MetricsWebSocketServer {
  handleUpgrade: (request: IncomingMessage, socket: any, head: Buffer) => void;
  broadcastMetricsUpdate: (userId: string, sessionId: string, metrics: IncrementalMetrics) => void;
  broadcastSessionUpdate: (userId: string, sessionId: string, status: string, data?: any) => void;
  getConnectionCount: (userId: string) => number;
  cleanup: () => void;
}

export function createMetricsWebSocketServer(): MetricsWebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket & { sessionId?: string; userId?: string }, request: IncomingMessage & { userId?: string }) => {
    const userId = request.userId;
    if (!userId) {
      console.error('🚫 WebSocket connection rejected: No user ID');
      ws.close(1008, 'User not authenticated');
      return;
    }

    ws.userId = userId;
    console.log(`🔌 METRICS WebSocket connected for user: ${userId}`);

    // Add connection to user's connection set
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(ws);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connection_established',
      userId: userId,
      timestamp: new Date().toISOString()
    }));

    // Handle client messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📨 METRICS WebSocket message from ${userId}:`, message.type);

        switch (message.type) {
          case 'subscribe_session':
            // Client wants to subscribe to specific session updates
            const sessionId = message.sessionId;
            if (sessionId) {
              ws.sessionId = sessionId;
              
              // Add to session-specific connections
              if (!sessionConnections.has(sessionId)) {
                sessionConnections.set(sessionId, new Set());
              }
              sessionConnections.get(sessionId)!.add(ws);
              
              ws.send(JSON.stringify({
                type: 'subscription_confirmed',
                sessionId: sessionId,
                timestamp: new Date().toISOString()
              }));
              
              console.log(`🎯 User ${userId} subscribed to session ${sessionId} metrics`);
            }
            break;

          case 'unsubscribe_session':
            if (ws.sessionId) {
              const sessionWs = sessionConnections.get(ws.sessionId);
              if (sessionWs) {
                sessionWs.delete(ws);
                if (sessionWs.size === 0) {
                  sessionConnections.delete(ws.sessionId);
                }
              }
              ws.sessionId = undefined;
              
              ws.send(JSON.stringify({
                type: 'unsubscription_confirmed',
                timestamp: new Date().toISOString()
              }));
            }
            break;

          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;

          default:
            console.warn(`🤷 Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      console.log(`🔌 METRICS WebSocket disconnected for user: ${userId} (code: ${code})`);
      
      // Remove from user connections
      const userWs = userConnections.get(userId);
      if (userWs) {
        userWs.delete(ws);
        if (userWs.size === 0) {
          userConnections.delete(userId);
        }
      }
      
      // Remove from session connections
      if (ws.sessionId) {
        const sessionWs = sessionConnections.get(ws.sessionId);
        if (sessionWs) {
          sessionWs.delete(ws);
          if (sessionWs.size === 0) {
            sessionConnections.delete(ws.sessionId);
          }
        }
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`🚨 METRICS WebSocket error for user ${userId}:`, error);
    });
  });

  // Handle HTTP upgrade to WebSocket
  const handleUpgrade = async (request: IncomingMessage, socket: any, head: Buffer) => {
    try {
      const pathname = url.parse(request.url || '').pathname;
      
      // Only handle metrics WebSocket upgrades
      if (pathname !== '/api/ws/metrics') {
        return;
      }

      // Extract session from request for authentication
      // Note: In a real implementation, you'd need to properly extract the session
      // from cookies or authentication headers
      const userId = await authenticateWebSocketRequest(request);
      
      if (!userId) {
        console.error('🚫 WebSocket upgrade rejected: Authentication failed');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // Perform the upgrade
      wss.handleUpgrade(request, socket, head, (ws) => {
        // Add userId to request for connection handler
        (request as any).userId = userId;
        wss.emit('connection', ws, request);
      });
    } catch (error) {
      console.error('Error handling WebSocket upgrade:', error);
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  };

  // Broadcast metrics update to connected clients
  const broadcastMetricsUpdate = (userId: string, sessionId: string, metrics: IncrementalMetrics) => {
    const message = {
      type: 'metrics_update',
      sessionId,
      metrics,
      timestamp: new Date().toISOString()
    };

    const messageString = JSON.stringify(message);
    let successCount = 0;
    let errorCount = 0;

    // Send to all connections for this user
    const userWs = userConnections.get(userId);
    if (userWs) {
      userWs.forEach((ws) => {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(messageString);
            successCount++;
          } else {
            userWs.delete(ws);
            errorCount++;
          }
        } catch (error) {
          console.error(`Error sending metrics to WebSocket:`, error);
          userWs.delete(ws);
          errorCount++;
        }
      });
    }

    // Also send to session-specific connections
    const sessionWs = sessionConnections.get(sessionId);
    if (sessionWs) {
      sessionWs.forEach((ws) => {
        try {
          if (ws.readyState === WebSocket.OPEN && ws.userId !== userId) {
            // Send to other users connected to this session (e.g., partners)
            ws.send(messageString);
            successCount++;
          }
        } catch (error) {
          console.error(`Error sending metrics to session WebSocket:`, error);
          sessionWs.delete(ws);
          errorCount++;
        }
      });
    }

    if (successCount > 0) {
      console.log(`📊 METRICS BROADCAST: Sent to ${successCount} connections for session ${sessionId}`);
    }
  };

  // Broadcast session status updates
  const broadcastSessionUpdate = (userId: string, sessionId: string, status: string, data?: any) => {
    const message = {
      type: 'session_update',
      sessionId,
      status,
      data,
      timestamp: new Date().toISOString()
    };

    const messageString = JSON.stringify(message);

    // Send to user connections
    const userWs = userConnections.get(userId);
    if (userWs) {
      userWs.forEach((ws) => {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(messageString);
          }
        } catch (error) {
          console.error(`Error sending session update:`, error);
          userWs.delete(ws);
        }
      });
    }

    // Send to session connections
    const sessionWs = sessionConnections.get(sessionId);
    if (sessionWs) {
      sessionWs.forEach((ws) => {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(messageString);
          }
        } catch (error) {
          console.error(`Error sending session update:`, error);
          sessionWs.delete(ws);
        }
      });
    }

    console.log(`📱 SESSION UPDATE: ${status} for session ${sessionId}`);
  };

  // Get connection count for a user
  const getConnectionCount = (userId: string): number => {
    return userConnections.get(userId)?.size || 0;
  };

  // Cleanup all connections
  const cleanup = () => {
    userConnections.forEach((connections, userId) => {
      connections.forEach(ws => {
        try {
          ws.close();
        } catch (error) {
          console.error('Error closing WebSocket:', error);
        }
      });
    });
    userConnections.clear();
    sessionConnections.clear();
    console.log('🧹 CLEANUP: All WebSocket connections closed');
  };

  return {
    handleUpgrade,
    broadcastMetricsUpdate,
    broadcastSessionUpdate,
    getConnectionCount,
    cleanup
  };
}

// Authenticate WebSocket requests
async function authenticateWebSocketRequest(request: IncomingMessage): Promise<string | null> {
  try {
    // Extract cookies from request
    const cookies = request.headers.cookie;
    if (!cookies) {
      return null;
    }

    // Create a mock request object for NextAuth
    const mockReq = {
      headers: request.headers,
      cookies: parseCookies(cookies)
    } as any;

    // Create a mock response object
    const mockRes = {
      getHeader: () => null,
      setCookie: () => {},
      setHeader: () => {}
    } as any;

    const session = await getServerSession(mockReq, mockRes, authOptions);
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error authenticating WebSocket request:', error);
    return null;
  }
}

// Parse cookies from cookie header
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

// Global instance
let globalMetricsWss: MetricsWebSocketServer | null = null;

export function getMetricsWebSocketServer(): MetricsWebSocketServer {
  if (!globalMetricsWss) {
    globalMetricsWss = createMetricsWebSocketServer();
  }
  return globalMetricsWss;
}