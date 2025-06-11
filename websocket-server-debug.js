/**
 * Enhanced WebSocket server with comprehensive debugging
 */
const { WebSocketServer, WebSocket } = require('ws');
const url = require('url');

// Store active WebSocket connections
const userConnections = new Map();
const connectionStats = new Map();

// Create WebSocket server instance
let wss;

// Debug helper
function debugLog(level, message, data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`, data || '');
}

/**
 * Get or create the WebSocket server instance
 */
function getMetricsWebSocketServer() {
    if (!wss) {
        debugLog('INFO', 'Creating new WebSocket server instance');
        
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

        // Server-level error handling
        wss.on('error', (error) => {
            debugLog('ERROR', 'WebSocket server error:', error);
        });

        // Connection handler
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
    const connectionId = `${userId}-${Date.now()}`;
    
    debugLog('INFO', `New connection attempt - User: ${userId}, Session: ${sessionId}, ID: ${connectionId}`);
    
    // Initialize connection tracking
    ws.userId = userId;
    ws.sessionId = sessionId;
    ws.connectionId = connectionId;
    ws.isAlive = true;
    ws.lastActivity = Date.now();
    
    // Store connection
    if (!userConnections.has(userId)) {
        userConnections.set(userId, new Map());
    }
    userConnections.get(userId).set(sessionId, ws);
    
    // Track connection stats
    connectionStats.set(connectionId, {
        userId,
        sessionId,
        connectedAt: Date.now(),
        messageCount: 0,
        bytesReceived: 0,
        bytesSent: 0
    });
    
    debugLog('SUCCESS', `WebSocket connected - User: ${userId}, Active connections: ${wss.clients.size}`);
    
    // Send initial connection success message
    sendMessage(ws, {
        type: 'connection',
        status: 'connected',
        connectionId,
        timestamp: Date.now()
    });
    
    // Set up event handlers
    ws.on('message', (message) => handleMessage(ws, message));
    ws.on('pong', () => handlePong(ws));
    ws.on('close', (code, reason) => handleClose(ws, code, reason));
    ws.on('error', (error) => handleError(ws, error));
    
    // Set connection timeout (2 minutes of inactivity)
    ws.connectionTimeout = setTimeout(() => {
        debugLog('WARN', `Connection timeout - User: ${userId}, Session: ${sessionId}`);
        ws.close(1001, 'Connection timeout');
    }, 120000);
}

/**
 * Handle incoming messages
 */
function handleMessage(ws, message) {
    const { userId, sessionId, connectionId } = ws;
    
    try {
        // Update activity timestamp
        ws.lastActivity = Date.now();
        clearTimeout(ws.connectionTimeout);
        ws.connectionTimeout = setTimeout(() => {
            ws.close(1001, 'Connection timeout');
        }, 120000);
        
        // Update stats
        const stats = connectionStats.get(connectionId);
        if (stats) {
            stats.messageCount++;
            stats.bytesReceived += message.length;
        }
        
        // Parse message
        let data;
        try {
            data = JSON.parse(message.toString());
        } catch (e) {
            debugLog('ERROR', `Invalid JSON from ${userId}:`, message.toString());
            sendMessage(ws, {
                type: 'error',
                error: 'Invalid message format'
            });
            return;
        }
        
        debugLog('DEBUG', `Message from ${userId}:`, data);
        
        // Handle different message types
        switch (data.type) {
            case 'ping':
                sendMessage(ws, { type: 'pong', timestamp: Date.now() });
                break;
                
            case 'metrics':
                // Broadcast metrics to all user's connections
                broadcastToUser(userId, {
                    type: 'metrics',
                    data: data.data,
                    timestamp: Date.now()
                });
                break;
                
            default:
                debugLog('WARN', `Unknown message type from ${userId}:`, data.type);
        }
        
    } catch (error) {
        debugLog('ERROR', `Error handling message from ${userId}:`, error);
        sendMessage(ws, {
            type: 'error',
            error: 'Message processing failed'
        });
    }
}

/**
 * Handle pong responses
 */
function handlePong(ws) {
    ws.isAlive = true;
    debugLog('DEBUG', `Pong received from ${ws.userId}`);
}

/**
 * Handle connection close
 */
function handleClose(ws, code, reason) {
    const { userId, sessionId, connectionId } = ws;
    
    debugLog('INFO', `Connection closed - User: ${userId}, Code: ${code}, Reason: ${reason || 'No reason'}`);
    
    // Clear timeout
    if (ws.connectionTimeout) {
        clearTimeout(ws.connectionTimeout);
    }
    
    // Remove from active connections
    const userSessions = userConnections.get(userId);
    if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
            userConnections.delete(userId);
        }
    }
    
    // Log final stats
    const stats = connectionStats.get(connectionId);
    if (stats) {
        const duration = Date.now() - stats.connectedAt;
        debugLog('INFO', `Connection stats - User: ${userId}, Duration: ${duration}ms, Messages: ${stats.messageCount}`);
        connectionStats.delete(connectionId);
    }
}

/**
 * Handle connection errors
 */
function handleError(ws, error) {
    const { userId, sessionId } = ws;
    debugLog('ERROR', `WebSocket error - User: ${userId}, Session: ${sessionId}`, error);
    
    // Don't close the connection here, let the close event handle cleanup
}

/**
 * Send message to WebSocket client
 */
function sendMessage(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        try {
            const message = JSON.stringify(data);
            ws.send(message);
            
            // Update stats
            const stats = connectionStats.get(ws.connectionId);
            if (stats) {
                stats.bytesSent += message.length;
            }
            
            debugLog('DEBUG', `Sent message to ${ws.userId}:`, data);
        } catch (error) {
            debugLog('ERROR', `Failed to send message to ${ws.userId}:`, error);
        }
    } else {
        debugLog('WARN', `Cannot send message to ${ws.userId} - ReadyState: ${ws.readyState}`);
    }
}

/**
 * Broadcast message to all connections for a user
 */
function broadcastToUser(userId, data) {
    const userSessions = userConnections.get(userId);
    if (userSessions) {
        let successCount = 0;
        userSessions.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                sendMessage(ws, data);
                successCount++;
            }
        });
        debugLog('DEBUG', `Broadcast to ${userId} - Sent to ${successCount}/${userSessions.size} connections`);
    }
}

/**
 * Start heartbeat interval
 */
function startHeartbeat() {
    const interval = setInterval(() => {
        debugLog('DEBUG', `Running heartbeat check - Active connections: ${wss.clients.size}`);
        
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                debugLog('WARN', `Terminating dead connection - User: ${ws.userId}`);
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
        // Try to get from query parameters
        const { query } = url.parse(request.url, true);
        if (query.userId) return query.userId;
        
        // Try to get from headers
        if (request.headers['x-user-id']) return request.headers['x-user-id'];
        
        // Default to 'dev-user' for development
        return 'dev-user';
    } catch (error) {
        debugLog('ERROR', 'Failed to extract user ID:', error);
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
        return `session-${Date.now()}`;
    } catch (error) {
        debugLog('ERROR', 'Failed to extract session ID:', error);
        return 'unknown-session';
    }
}

/**
 * Handle WebSocket upgrade requests
 */
function handleUpgrade(request, socket, head) {
    debugLog('INFO', 'Handling WebSocket upgrade request:', {
        url: request.url,
        headers: request.headers
    });
    
    // Verify the path
    const { pathname } = url.parse(request.url);
    if (pathname !== '/api/ws/metrics') {
        debugLog('WARN', `Invalid WebSocket path: ${pathname}`);
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
    }
    
    // Handle the upgrade
    wss.handleUpgrade(request, socket, head, (ws) => {
        debugLog('SUCCESS', 'WebSocket upgrade completed');
        wss.emit('connection', ws, request);
    });
}

// Export functions
module.exports = {
    getMetricsWebSocketServer,
    handleUpgrade,
    userConnections,
    connectionStats
};

// Handle process termination
process.on('SIGTERM', () => {
    debugLog('INFO', 'SIGTERM received, closing WebSocket server...');
    wss.clients.forEach((ws) => {
        ws.close(1001, 'Server shutting down');
    });
    wss.close();
});

process.on('SIGINT', () => {
    debugLog('INFO', 'SIGINT received, closing WebSocket server...');
    wss.clients.forEach((ws) => {
        ws.close(1001, 'Server shutting down');
    });
    wss.close();
});