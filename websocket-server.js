/**
 * JavaScript wrapper for WebSocket server to avoid TypeScript import issues
 * in server.js
 */

const { WebSocketServer, WebSocket } = require('ws');
const url = require('url');

// Store active WebSocket connections by user ID and session ID
const userConnections = new Map();
const sessionConnections = new Map();

// Configuration
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 120000; // 2 minutes
const RECONNECT_DELAY = 1000; // 1 second

function createMetricsWebSocketServer() {
  const wss = new WebSocketServer({ 
    noServer: true,
    // Add proper WebSocket server options
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      concurrencyLimit: 10,
      threshold: 1024
    },
    maxPayload: 10 * 1024 * 1024 // 10MB max payload
  });

  // Heartbeat interval reference
  let heartbeatInterval = null;

  // Start heartbeat mechanism
  function startHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    heartbeatInterval = setInterval(() => {
      wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          console.log(`💔 Terminating inactive connection for user: ${ws.userId}`);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, HEARTBEAT_INTERVAL);
  }

  // Start heartbeat when server is created
  startHeartbeat();

  // Handle WebSocket connections
  wss.on('connection', (ws, request) => {
    // Initialize connection properties
    ws.isAlive = true;
    ws.connectionTime = Date.now();
    ws.lastActivity = Date.now(); // Set initial activity time
    
    // For now, skip authentication in development
    const userId = 'dev-user'; // TODO: Extract from authentication
    ws.userId = userId;
    
    console.log(`🔌 METRICS WebSocket connected for user: ${userId}`);
    console.log(`🔍 Active connections: ${wss.clients.size}`);

    // Set up inactivity timeout handling
    let inactivityTimeout = null;
    
    const resetInactivityTimeout = () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
      
      inactivityTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const inactivityDuration = Date.now() - ws.lastActivity;
          console.log(`⏱️ Closing inactive connection for user: ${userId} (inactive for ${Math.round(inactivityDuration / 1000)}s)`);
          ws.close(1000, 'Connection timeout - no activity');
        }
      }, CONNECTION_TIMEOUT);
    };
    
    // Start the inactivity timer
    resetInactivityTimeout();

    // Set up pong handler for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastPong = Date.now();
      ws.lastActivity = Date.now(); // Update activity on pong
      resetInactivityTimeout(); // Reset timeout on heartbeat
    });

    // Add connection to user's connection set
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(ws);

    // Send connection confirmation with error handling
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'connection_established',
          userId: userId,
          timestamp: new Date().toISOString(),
          heartbeatInterval: HEARTBEAT_INTERVAL
        }));
      }
    } catch (error) {
      console.error(`Error sending connection confirmation:`, error);
    }

    // Handle client messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📨 METRICS WebSocket message from ${userId}:`, message.type);

        // Update activity timestamp and reset timeout
        ws.lastActivity = Date.now();
        resetInactivityTimeout();

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
              
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'subscription_confirmed',
                  sessionId: sessionId,
                  timestamp: new Date().toISOString()
                }));
              }
              
              console.log(`🎯 User ${userId} subscribed to session ${sessionId} metrics`);
            }
            break;

          case 'ping':
            // Client-initiated ping
            ws.isAlive = true;
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString()
              }));
            }
            break;

          case 'unsubscribe_session':
            // Handle unsubscription
            if (ws.sessionId && sessionConnections.has(ws.sessionId)) {
              const sessionWs = sessionConnections.get(ws.sessionId);
              sessionWs.delete(ws);
              if (sessionWs.size === 0) {
                sessionConnections.delete(ws.sessionId);
              }
            }
            ws.sessionId = null;
            break;

          default:
            console.warn(`🤷 Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            error: error.message,
            timestamp: new Date().toISOString()
          }));
        }
      }
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      const connectionDuration = Date.now() - ws.connectionTime;
      console.log(`🔌 METRICS WebSocket disconnected for user: ${userId}`);
      console.log(`   Code: ${code}, Reason: ${reason || 'No reason provided'}`);
      console.log(`   Connection duration: ${Math.round(connectionDuration / 1000)}s`);
      
      // Clean up user connections
      const userWs = userConnections.get(userId);
      if (userWs) {
        userWs.delete(ws);
        if (userWs.size === 0) {
          userConnections.delete(userId);
        }
      }
      
      // Clean up session connections
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
      console.error(`🚨 METRICS WebSocket error for user ${userId}:`, error.message);
      console.error(`🚨 Error code: ${error.code}`);
      
      // Don't log full stack trace for common errors
      if (error.code !== 'ECONNRESET' && error.code !== 'EPIPE') {
        console.error(`🚨 Error stack:`, error.stack);
      }
    });

    // Clear timeout on close (inactivityTimeout is already defined above)
    ws.on('close', () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
      }
    });
  });

  // Handle HTTP upgrade to WebSocket
  const handleUpgrade = (request, socket, head) => {
    try {
      // Use URL constructor instead of deprecated url.parse
      const reqUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      const pathname = reqUrl.pathname;
      
      // Only handle metrics WebSocket upgrades
      if (pathname !== '/api/ws/metrics') {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      console.log('🔄 Handling WebSocket upgrade for metrics endpoint');
      
      // Add socket error handler to prevent crashes
      socket.on('error', (error) => {
        console.error('Socket error during upgrade:', error.message);
      });
      
      // Perform the upgrade
      wss.handleUpgrade(request, socket, head, (ws) => {
        console.log('✅ WebSocket upgrade successful for metrics endpoint');
        // Emit connection event
        wss.emit('connection', ws, request);
      });
    } catch (error) {
      console.error('Error handling WebSocket upgrade:', error);
      try {
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      } catch (writeError) {
        console.error('Error writing error response:', writeError);
      }
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
    let errorCount = 0;

    // Send to all connections for this user
    const userWs = userConnections.get(userId);
    if (userWs) {
      const deadConnections = [];
      
      userWs.forEach((ws) => {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(messageString);
            successCount++;
          } else {
            deadConnections.push(ws);
          }
        } catch (error) {
          console.error(`Error sending metrics to WebSocket:`, error.message);
          errorCount++;
          deadConnections.push(ws);
        }
      });

      // Clean up dead connections
      deadConnections.forEach(ws => userWs.delete(ws));
    }

    if (successCount > 0) {
      console.log(`📊 METRICS BROADCAST: Sent to ${successCount} connections for session ${sessionId}`);
    } else {
      console.log(`📊 METRICS BROADCAST: No active connections for user ${userId}`);
    }
    
    if (errorCount > 0) {
      console.log(`📊 METRICS BROADCAST: ${errorCount} failed sends`);
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
    let successCount = 0;

    // Send to user connections
    const userWs = userConnections.get(userId);
    if (userWs) {
      const deadConnections = [];
      
      userWs.forEach((ws) => {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(messageString);
            successCount++;
          } else {
            deadConnections.push(ws);
          }
        } catch (error) {
          console.error(`Error sending session update:`, error.message);
          deadConnections.push(ws);
        }
      });

      // Clean up dead connections
      deadConnections.forEach(ws => userWs.delete(ws));
    }

    console.log(`📱 SESSION UPDATE: ${status} for session ${sessionId} (sent to ${successCount} connections)`);
  };

  // Cleanup function
  const cleanup = () => {
    // Stop heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    // Close all connections gracefully
    wss.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });

    userConnections.clear();
    sessionConnections.clear();
    
    console.log('🧹 CLEANUP: All WebSocket connections closed');
  };

  return {
    handleUpgrade,
    broadcastMetricsUpdate,
    broadcastSessionUpdate,
    getConnectionCount: (userId) => userConnections.get(userId)?.size || 0,
    getTotalConnections: () => wss.clients.size,
    cleanup
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

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received, cleaning up WebSocket connections...');
  if (globalMetricsWss) {
    globalMetricsWss.cleanup();
  }
});

process.on('SIGINT', () => {
  console.log('SIGINT received, cleaning up WebSocket connections...');
  if (globalMetricsWss) {
    globalMetricsWss.cleanup();
  }
});

module.exports = {
  getMetricsWebSocketServer,
  get handleUpgrade() {
    return getMetricsWebSocketServer().handleUpgrade;
  }
};