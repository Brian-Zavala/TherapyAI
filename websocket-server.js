/**
 * JavaScript wrapper for WebSocket server to avoid TypeScript import issues
 * in server.js
 */

const { WebSocketServer, WebSocket } = require('ws');
const url = require('url');

// Store active WebSocket connections by user ID and session ID
const userConnections = new Map();
const sessionConnections = new Map();

function createMetricsWebSocketServer() {
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket connections
  wss.on('connection', (ws, request) => {
    // For now, skip authentication in development
    const userId = 'dev-user'; // TODO: Extract from authentication
    ws.userId = userId;
    
    console.log(`🔌 METRICS WebSocket connected for user: ${userId}`);
    console.log(`🔍 Request headers:`, request.headers);

    // Add connection to user's connection set
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(ws);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connection_established',
      userId: userId,
      timestamp: new Date().toISOString()
    }));

    // Handle client messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📨 METRICS WebSocket message from ${userId}:`, message.type);

        switch (message.type) {
          case 'subscribe_session':
            const sessionId = message.sessionId;
            if (sessionId) {
              ws.sessionId = sessionId;
              
              // Add to session-specific connections
              if (!sessionConnections.has(sessionId)) {
                sessionConnections.set(sessionId, new Set());
              }
              sessionConnections.get(sessionId).add(ws);
              
              ws.send(JSON.stringify({
                type: 'subscription_confirmed',
                sessionId: sessionId,
                timestamp: new Date().toISOString()
              }));
              
              console.log(`🎯 User ${userId} subscribed to session ${sessionId} metrics`);
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
    ws.on('close', (code) => {
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
      console.error(`🚨 Error stack:`, error.stack);
    });
  });

  // Handle HTTP upgrade to WebSocket
  const handleUpgrade = (request, socket, head) => {
    try {
      const pathname = url.parse(request.url || '').pathname;
      
      // Only handle metrics WebSocket upgrades
      if (pathname !== '/api/ws/metrics') {
        return;
      }

      console.log('🔄 Handling WebSocket upgrade for metrics endpoint');
      
      // Perform the upgrade
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch (error) {
      console.error('Error handling WebSocket upgrade:', error);
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  };

  // Broadcast metrics update to connected clients
  const broadcastMetricsUpdate = (userId, sessionId, metrics) => {
    const message = {
      type: 'metrics_update',
      sessionId,
      metrics,
      timestamp: new Date().toISOString()
    };

    const messageString = JSON.stringify(message);
    let successCount = 0;

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
          }
        } catch (error) {
          console.error(`Error sending metrics to WebSocket:`, error);
          userWs.delete(ws);
        }
      });
    }

    if (successCount > 0) {
      console.log(`📊 METRICS BROADCAST: Sent to ${successCount} connections for session ${sessionId}`);
    } else {
      console.log(`📊 METRICS BROADCAST: No active connections for user ${userId}`);
    }
  };

  // Broadcast session status updates
  const broadcastSessionUpdate = (userId, sessionId, status, data) => {
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

    console.log(`📱 SESSION UPDATE: ${status} for session ${sessionId}`);
  };

  return {
    handleUpgrade,
    broadcastMetricsUpdate,
    broadcastSessionUpdate,
    getConnectionCount: (userId) => userConnections.get(userId)?.size || 0,
    cleanup: () => {
      userConnections.clear();
      sessionConnections.clear();
      console.log('🧹 CLEANUP: All WebSocket connections closed');
    }
  };
}

// Global instance
let globalMetricsWss = null;

function getMetricsWebSocketServer() {
  if (!globalMetricsWss) {
    globalMetricsWss = createMetricsWebSocketServer();
  }
  return globalMetricsWss;
}

module.exports = {
  getMetricsWebSocketServer
};