#!/usr/bin/env node

/**
 * Test WebSocket connection stability
 * This script tests the WebSocket server connection handling
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3000/api/ws/metrics';
const TEST_DURATION = 30000; // 30 seconds
const CONNECTION_COUNT = 3; // Number of simultaneous connections to test

console.log('🧪 WebSocket Connection Test');
console.log(`📍 URL: ${WS_URL}`);
console.log(`⏱️  Duration: ${TEST_DURATION / 1000}s`);
console.log(`🔗 Connections: ${CONNECTION_COUNT}`);
console.log('');

const connections = [];
const stats = {
  connected: 0,
  disconnected: 0,
  errors: 0,
  messages: 0,
  reconnects: 0
};

function createConnection(id) {
  console.log(`[${id}] 🔌 Creating connection...`);
  
  const ws = new WebSocket(WS_URL);
  const connection = {
    id,
    ws,
    connected: false,
    startTime: Date.now(),
    messageCount: 0,
    reconnectCount: 0
  };
  
  ws.on('open', () => {
    connection.connected = true;
    connection.connectTime = Date.now();
    stats.connected++;
    console.log(`[${id}] ✅ Connected (took ${connection.connectTime - connection.startTime}ms)`);
    
    // Send initial ping
    ws.send(JSON.stringify({
      type: 'ping',
      timestamp: Date.now()
    }));
    
    // Subscribe to a test session
    ws.send(JSON.stringify({
      type: 'subscribe_session',
      sessionId: `test-session-${id}`
    }));
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      connection.messageCount++;
      stats.messages++;
      console.log(`[${id}] 📨 Received: ${message.type}`);
    } catch (error) {
      console.error(`[${id}] ❌ Failed to parse message:`, error.message);
    }
  });
  
  ws.on('close', (code, reason) => {
    connection.connected = false;
    stats.disconnected++;
    const duration = Date.now() - connection.connectTime;
    console.log(`[${id}] 🔌 Disconnected - Code: ${code}, Reason: ${reason || 'None'}, Duration: ${Math.round(duration / 1000)}s`);
    
    // Attempt reconnection if test is still running
    if (Date.now() - connection.startTime < TEST_DURATION) {
      connection.reconnectCount++;
      stats.reconnects++;
      console.log(`[${id}] 🔄 Reconnecting (attempt ${connection.reconnectCount})...`);
      setTimeout(() => {
        connections[id - 1] = createConnection(id);
      }, 1000);
    }
  });
  
  ws.on('error', (error) => {
    stats.errors++;
    console.error(`[${id}] ❌ Error:`, error.message);
  });
  
  // Send periodic pings
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      }));
    }
  }, 10000); // Every 10 seconds
  
  // Clean up interval on close
  ws.on('close', () => {
    clearInterval(pingInterval);
  });
  
  return connection;
}

// Create test connections
console.log('🚀 Starting test connections...\n');
for (let i = 1; i <= CONNECTION_COUNT; i++) {
  connections.push(createConnection(i));
  // Stagger connections slightly
  if (i < CONNECTION_COUNT) {
    setTimeout(() => {}, 100);
  }
}

// Run test for specified duration
setTimeout(() => {
  console.log('\n📊 Test Complete - Final Statistics:');
  console.log('================================');
  console.log(`✅ Total Connections: ${stats.connected}`);
  console.log(`❌ Total Disconnections: ${stats.disconnected}`);
  console.log(`🔄 Total Reconnects: ${stats.reconnects}`);
  console.log(`📨 Total Messages: ${stats.messages}`);
  console.log(`⚠️  Total Errors: ${stats.errors}`);
  console.log('================================\n');
  
  // Close all connections
  console.log('🧹 Cleaning up connections...');
  connections.forEach(conn => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.close(1000, 'Test complete');
    }
  });
  
  // Exit after cleanup
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}, TEST_DURATION);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⛔ Test interrupted, closing connections...');
  connections.forEach(conn => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.close(1000, 'Test interrupted');
    }
  });
  process.exit(0);
});

console.log('🏃 Test running...\n');