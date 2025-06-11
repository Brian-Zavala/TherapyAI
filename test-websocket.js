/**
 * Enhanced WebSocket server with comprehensive debugging
 */

const { WebSocketServer, WebSocket } = require("ws");
const url = require("url");

// Store active WebSocket connections by user ID and session ID
const userConnections = new Map();
const sessionConnections = new Map();

// Configuration
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 120000; // 2 minutes

// Debug flag
const DEBUG = true;

function debugLog(...args) {
  if (DEBUG) {
    console.log("[WS DEBUG]", new Date().toISOString(), ...args);
  }
}

function createMetricsWebSocketServer() {
  debugLog("Creating WebSocket server instance");

  const wss = new WebSocketServer({
    noServer: true,
    clientTracking: true,
    // Simplified options to rule out compression issues
    perMessageDeflate: false,
    maxPayload: 10 * 1024 * 1024, // 10MB max payload
  });

  // Track server creation
  debugLog("WebSocket server created");

  // Heartbeat interval reference
  let heartbeatInterval = null;

  // Start heartbeat mechanism
  function startHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    heartbeatInterval = setInterval(() => {
      debugLog(`Heartbeat check - ${wss.clients.size} clients connected`);

      wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          debugLog(`💔 Terminating inactive connection for user: ${ws.userId}`);
          return ws.terminate();
        }

        ws.isAlive = false;
        try {
          ws.ping((err) => {
            if (err) {
              debugLog(`Ping error for ${ws.userId}:`, err.message);
            }
          });
        } catch (error) {
          debugLog(`Ping exception for ${ws.userId}:`, error.message);
        }
      });
    }, HEARTBEAT_INTERVAL);
  }

  // Start heartbeat when server is created
  startHeartbeat();
  debugLog("Heartbeat mechanism started");

  // Add error handler to the WebSocket server itself
  wss.on("error", (error) => {
    console.error("WebSocket Server Error:", error);
  });

  // Handle WebSocket connections
  wss.on("connection", (ws, request) => {
    debugLog("New WebSocket connection event fired");

    // Initialize connection properties
    ws.isAlive = true;
    ws.connectionTime = Date.now();
    ws.lastActivity = Date.now();

    // For now, skip authentication in development
    const userId = "dev-user"; // TODO: Extract from authentication
    ws.userId = userId;

    console.log(`🔌 METRICS WebSocket connected for user: ${userId}`);
    console.log(`🔍 Active connections: ${wss.clients.size}`);
    debugLog(
      `Connection state: readyState=${ws.readyState}, protocol=${ws.protocol}`
    );

    // Set up pong handler for heartbeat
    ws.on("pong", () => {
      debugLog(`Pong received from ${userId}`);
      ws.isAlive = true;
      ws.lastPong = Date.now();
    });

    // Add error handler immediately
    ws.on("error", (error) => {
      console.error(
        `🚨 METRICS WebSocket error for user ${userId}:`,
        error.message
      );
      console.error(`🚨 Error code: ${error.code}`);
      debugLog(
        `Error details: ${JSON.stringify({
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          address: error.address,
        })}`
      );

      // Don't log full stack trace for common errors
      if (error.code !== "ECONNRESET" && error.code !== "EPIPE") {
        console.error(`🚨 Error stack:`, error.stack);
      }
    });

    // Add connection to user's connection set
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(ws);
    debugLog(
      `User ${userId} now has ${userConnections.get(userId).size} connections`
    );

    // Send connection confirmation with error handling
    const sendConnectionConfirmation = () => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          const message = JSON.stringify({
            type: "connection_established",
            userId: userId,
            timestamp: new Date().toISOString(),
            heartbeatInterval: HEARTBEAT_INTERVAL,
          });

          ws.send(message, (err) => {
            if (err) {
              console.error("Error sending connection confirmation:", err);
            } else {
              debugLog("Connection confirmation sent successfully");
            }
          });
        } else {
          debugLog(`Cannot send confirmation - readyState is ${ws.readyState}`);
        }
      } catch (error) {
        console.error(`Error sending connection confirmation:`, error);
      }
    };

    // Send confirmation immediately if connection is open
    if (ws.readyState === WebSocket.OPEN) {
      sendConnectionConfirmation();
    } else {
      // Wait for connection to be fully open
      ws.once("open", () => {
        debugLog("WebSocket opened after connection event");
        sendConnectionConfirmation();
      });
    }

    // Handle client messages
    ws.on("message", (data, isBinary) => {
      debugLog(`Message received from ${userId}, binary: ${isBinary}`);

      try {
        const message = JSON.parse(data.toString());
        console.log(
          `📨 METRICS WebSocket message from ${userId}:`,
          message.type
        );

        // Update activity timestamp
        ws.lastActivity = Date.now();

        switch (message.type) {
          case "subscribe_session":
            const sessionId = message.sessionId;
            if (sessionId) {
              ws.sessionId = sessionId;

              // Add to session-specific connections
              if (!sessionConnections.has(sessionId)) {
                sessionConnections.set(sessionId, new Set());
              }
              sessionConnections.get(sessionId).add(ws);

              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: "subscription_confirmed",
                    sessionId: sessionId,
                    timestamp: new Date().toISOString(),
                  })
                );
              }

              console.log(
                `🎯 User ${userId} subscribed to session ${sessionId} metrics`
              );
            }
            break;

          case "ping":
            // Client-initiated ping
            ws.isAlive = true;
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "pong",
                  timestamp: new Date().toISOString(),
                })
              );
            }
            break;

          case "unsubscribe_session":
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
        console.error("Error parsing WebSocket message:", error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid message format",
              error: error.message,
              timestamp: new Date().toISOString(),
            })
          );
        }
      }
    });

    // Handle connection close
    ws.on("close", (code, reason) => {
      const connectionDuration = Date.now() - ws.connectionTime;
      console.log(`🔌 METRICS WebSocket disconnected for user: ${userId}`);
      console.log(
        `   Code: ${code}, Reason: ${reason ? reason.toString() : "No reason provided"}`
      );
      console.log(
        `   Connection duration: ${Math.round(connectionDuration / 1000)}s`
      );
      debugLog(`   Last activity: ${new Date(ws.lastActivity).toISOString()}`);
      debugLog(`   Was alive: ${ws.isAlive}`);

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

    // Set connection timeout
    let connectionTimeoutId = null;

    const resetConnectionTimeout = () => {
      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId);
      }

      connectionTimeoutId = setTimeout(() => {
        const inactiveTime = Date.now() - ws.lastActivity;
        if (
          ws.readyState === WebSocket.OPEN &&
          inactiveTime > CONNECTION_TIMEOUT
        ) {
          console.log(
            `⏱️ Closing inactive connection for user: ${userId} (inactive for ${Math.round(inactiveTime / 1000)}s)`
          );
          ws.close(1000, "Connection timeout - no activity");
        }
      }, CONNECTION_TIMEOUT);
    };

    // Reset timeout on any activity
    ws.on("message", resetConnectionTimeout);
    ws.on("pong", resetConnectionTimeout);
    resetConnectionTimeout();

    // Clear timeout on close
    ws.on("close", () => {
      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId);
      }
    });
  });

  // Handle HTTP upgrade to WebSocket
  const handleUpgrade = (request, socket, head) => {
    debugLog("handleUpgrade called");

    try {
      const pathname = url.parse(request.url || "").pathname;
      debugLog(`Upgrade request for path: ${pathname}`);

      // Only handle metrics WebSocket upgrades
      if (pathname !== "/api/ws/metrics") {
        debugLog(`Rejecting upgrade for path: ${pathname}`);
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      console.log("🔄 Handling WebSocket upgrade for metrics endpoint");

      // Add socket error handler to prevent crashes
      socket.on("error", (error) => {
        console.error("Socket error during upgrade:", error.message);
        debugLog("Socket error details:", error);
      });

      // Add timeout for upgrade process
      const upgradeTimeout = setTimeout(() => {
        debugLog("Upgrade timeout - destroying socket");
        socket.destroy();
      }, 5000);

      // Perform the upgrade
      wss.handleUpgrade(request, socket, head, (ws) => {
        clearTimeout(upgradeTimeout);
        debugLog("Upgrade successful, emitting connection event");

        // Emit connection event
        wss.emit("connection", ws, request);
      });
    } catch (error) {
      console.error("Error handling WebSocket upgrade:", error);
      debugLog("Upgrade error stack:", error.stack);

      try {
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      } catch (writeError) {
        console.error("Error writing error response:", writeError);
      }
    }
  };

  // The rest of the broadcast functions remain the same...
  const broadcastMetricsUpdate = (userId, sessionId, metrics) => {
    const message = {
      type: "metrics_update",
      sessionId,
      metrics,
      timestamp: new Date().toISOString(),
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
      deadConnections.forEach((ws) => userWs.delete(ws));
    }

    if (successCount > 0) {
      console.log(
        `📊 METRICS BROADCAST: Sent to ${successCount} connections for session ${sessionId}`
      );
    } else {
      console.log(
        `📊 METRICS BROADCAST: No active connections for user ${userId}`
      );
    }

    if (errorCount > 0) {
      console.log(`📊 METRICS BROADCAST: ${errorCount} failed sends`);
    }
  };

  const broadcastSessionUpdate = (userId, sessionId, status, data) => {
    const message = {
      type: "session_update",
      sessionId,
      status,
      data,
      timestamp: new Date().toISOString(),
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
      deadConnections.forEach((ws) => userWs.delete(ws));
    }

    console.log(
      `📱 SESSION UPDATE: ${status} for session ${sessionId} (sent to ${successCount} connections)`
    );
  };

  // Cleanup function
  const cleanup = () => {
    debugLog("Cleanup initiated");

    // Stop heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    // Close all connections gracefully
    wss.clients.forEach((ws) => {
      ws.close(1001, "Server shutting down");
    });

    userConnections.clear();
    sessionConnections.clear();

    console.log("🧹 CLEANUP: All WebSocket connections closed");
  };

  return {
    handleUpgrade,
    broadcastMetricsUpdate,
    broadcastSessionUpdate,
    getConnectionCount: (userId) => userConnections.get(userId)?.size || 0,
    getTotalConnections: () => wss.clients.size,
    cleanup,
  };
}

// Global instance
let globalMetricsWss = null;

function getMetricsWebSocketServer() {
  if (!globalMetricsWss) {
    console.log("Creating new global WebSocket server instance");
    globalMetricsWss = createMetricsWebSocketServer();
  }
  return globalMetricsWss;
}

// Handle process termination
process.on("SIGTERM", () => {
  console.log("SIGTERM received, cleaning up WebSocket connections...");
  if (globalMetricsWss) {
    globalMetricsWss.cleanup();
  }
});

process.on("SIGINT", () => {
  console.log("SIGINT received, cleaning up WebSocket connections...");
  if (globalMetricsWss) {
    globalMetricsWss.cleanup();
  }
});

module.exports = {
  getMetricsWebSocketServer,
};
