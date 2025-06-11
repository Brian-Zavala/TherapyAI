/**
 * Fixed WebSocket server - uses different path to avoid API route conflict
 */
const { WebSocketServer, WebSocket } = require('ws');
const url = require('url');

// Store active WebSocket connections by user ID and session ID
const userConnections = new Map();
const sessionConnections = new Map();

// Create WebSocket server instance
let wss;

/**
 * Get or create the WebSocket server instance
 */
function getMetricsWebSocketServer() {
    if (!wss) {
        wss = new WebSocketServer({ 
            noServer: true,
            clientTracking: true,
            perMessageDeflate: {
                zlibDeflateOptions: {
                    chunkSize: 1024,
                    memLevel: 7,
                    level: 3
                },
                zlibInflateOptions: {
                    chunkSize: 10 * 1024
                },
                threshold: 1024
            }
        });

        // Set up connection handler
        wss.on('connection', handleConnection);

        // Start heartbeat interval
        startHeartbeat();
    }
    
    return wss;
}

/**
 * Handle new WebSocket connections
 */
function handleConnection(ws, request) {
    const userId = extractUserId(request);
    const sessionId = extractSessionId(request);
    
    console.log(`🔌 METRICS WebSocket connected for user: ${userId}`);
    
    // Initialize connection
    ws.userId = userId;
    ws.sessionId = sessionId;
    ws.isAlive = true;
    
    // Store connection references
    if (!userConnections.has(userId)) {
        userConnections.set(userId, new Map());
    }
    userConnections.get(userId).set(sessionId, ws);
    
    if (sessionId && sessionId !== 'unknown') {
        if (!sessionConnections.has(sessionId)) {
            sessionConnections.set(sessionId, new Set());
        }
        sessionConnections.get(sessionId).add(ws);
    }
    
    // Send connection success message
    sendMessage(ws, {
        type: 'connection',
        status: 'connected',
        timestamp: Date.now()
    });
    
    // Set up event handlers
    ws.on('message', (message) => handleMessage(ws, message));
    ws.on('pong', () => handlePong(ws));
    ws.on('close', (code, reason) => handleClose(ws, code, reason));
    ws.on('error', (error) => handleError(ws, error));
}

/**
 * Handle incoming messages
 */
function handleMessage(ws, message) {
    try {
        const data = JSON.parse(message.toString());
        console.log(`📨 Received from ${ws.userId}:`, data.type);
        
        switch (data.type) {
            case 'ping':
                sendMessage(ws, { type: 'pong', timestamp: Date.now() });
                break;
                
            case 'subscribe':
                // Subscribe to session updates
                if (data.sessionId) {
                    ws.sessionId = data.sessionId;
                    if (!sessionConnections.has(data.sessionId)) {
                        sessionConnections.set(data.sessionId, new Set());
                    }
                    sessionConnections.get(data.sessionId).add(ws);
                    sendMessage(ws, { 
                        type: 'subscribed', 
                        sessionId: data.sessionId,
                        timestamp: Date.now()
                    });
                }
                break;
                
            case 'metrics':
                // Broadcast metrics to all connections for this user
                broadcastToUser(ws.userId, {
                    type: 'metrics',
                    data: data.data,
                    timestamp: Date.now()
                });
                break;
                
            default:
                console.log(`Unknown message type from ${ws.userId}:`, data.type);
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendMessage(ws, {
            type: 'error',
            error: 'Invalid message format'
        });
    }
}

/**
 * Handle pong responses
 */
function handlePong(ws) {
    ws.isAlive = true;
}

/**
 * Handle connection close
 */
function handleClose(ws, code, reason) {
    console.log(`🔌 METRICS WebSocket disconnected for user: ${ws.userId} (code: ${code})`);
    
    // Remove from user connections
    const userSessions = userConnections.get(ws.userId);
    if (userSessions) {
        userSessions.delete(ws.sessionId);
        if (userSessions.size === 0) {
            userConnections.delete(ws.userId);
        }
    }
    
    // Remove from session connections
    if (ws.sessionId && sessionConnections.has(ws.sessionId)) {
        sessionConnections.get(ws.sessionId).delete(ws);
        if (sessionConnections.get(ws.sessionId).size === 0) {
            sessionConnections.delete(ws.sessionId);
        }
    }
}

/**
 * Handle connection errors
 */
function handleError(ws, error) {
    console.error(`WebSocket error for user ${ws.userId}:`, error);
}

/**
 * Send message to WebSocket client
 */
function sendMessage(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        try {
            ws.send(JSON.stringify(data));
        } catch (error) {
            console.error(`Failed to send message to ${ws.userId}:`, error);
        }
    }
}

/**
 * Broadcast message to all connections for a user
 */
function broadcastToUser(userId, data) {
    const userSessions = userConnections.get(userId);
    if (userSessions) {
        userSessions.forEach((ws) => {
            sendMessage(ws, data);
        });
    }
}

/**
 * Broadcast message to all connections for a session
 */
function broadcastToSession(sessionId, data) {
    const connections = sessionConnections.get(sessionId);
    if (connections) {
        connections.forEach((ws) => {
            sendMessage(ws, data);
        });
    }
}

/**
 * Broadcast metrics update (called from API routes)
 */
function broadcastMetricsUpdate(userId, sessionId, metrics) {
    const data = {
        type: 'metrics_update',
        sessionId,
        metrics,
        timestamp: Date.now()
    };
    
    // Broadcast to user and session
    broadcastToUser(userId, data);
    if (sessionId) {
        broadcastToSession(sessionId, data);
    }
}

/**
 * Broadcast session update (called from API routes)
 */
function broadcastSessionUpdate(userId, sessionId, status, sessionData) {
    const data = {
        type: 'session_update',
        sessionId,
        status,
        data: sessionData,
        timestamp: Date.now()
    };
    
    // Broadcast to user and session
    broadcastToUser(userId, data);
    if (sessionId) {
        broadcastToSession(sessionId, data);
    }
}

/**
 * Start heartbeat interval
 */
function startHeartbeat() {
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                console.log(`💔 Terminating dead connection for user: ${ws.userId}`);
                return ws.terminate();
            }
            
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000); // 30 seconds

    // Clear interval on server close
    wss.on('close', () => {
        clearInterval(interval);
    });
}

/**
 * Extract user ID from request
 */
function extractUserId(request) {
    try {
        const { query } = url.parse(request.url, true);
        if (query.userId) return query.userId;
        if (request.headers['x-user-id']) return request.headers['x-user-id'];
        return 'dev-user';
    } catch (error) {
        return 'unknown';
    }
}

/**
 * Extract session ID from request
 */
function extractSessionId(request) {
    try {
        const { query } = url.parse(request.url, true);
        if (query.sessionId) return query.sessionId;
        if (request.headers['x-session-id']) return request.headers['x-session-id'];
        return 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

/**
 * Handle WebSocket upgrade requests
 * IMPORTANT: Changed to /ws/realtime/metrics to avoid API route conflict
 */
function handleUpgrade(request, socket, head) {
    const { pathname } = url.parse(request.url);
    
    // Use a different path to avoid conflict with API routes
    if (pathname !== '/ws/realtime/metrics') {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
    }
    
    console.log('🔄 Handling WebSocket upgrade for metrics endpoint');
    
    // Ensure WebSocket server is initialized
    const wsServer = getMetricsWebSocketServer();
    
    wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit('connection', ws, request);
    });
}

// Export functions
module.exports = {
    getMetricsWebSocketServer,
    handleUpgrade,
    broadcastMetricsUpdate,
    broadcastSessionUpdate,
    userConnections,
    sessionConnections
};