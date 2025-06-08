// test-websocket.js
// Simple test to verify WebSocket connection

const WebSocket = require('ws');

const testWebSocketConnection = () => {
  console.log('🧪 Testing WebSocket connection to metrics endpoint...');
  
  const ws = new WebSocket('ws://localhost:3000/api/ws/metrics');
  
  ws.on('open', () => {
    console.log('✅ WebSocket connected successfully!');
    
    // Send a test ping
    ws.send(JSON.stringify({
      type: 'ping',
      timestamp: new Date().toISOString()
    }));
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📨 Received message:', message);
    
    if (message.type === 'connection_established') {
      console.log('✅ Connection established with server');
      console.log('   User ID:', message.userId);
    } else if (message.type === 'pong') {
      console.log('✅ Received pong response');
      // Close connection after successful test
      ws.close(1000, 'Test complete');
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    console.error('   Make sure you are running: npm run dev:server');
  });
  
  ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket closed: ${code} (${reason})`);
    if (code === 1000) {
      console.log('✅ Test completed successfully!');
    } else {
      console.log('❌ Test failed - unexpected close code');
    }
    process.exit(code === 1000 ? 0 : 1);
  });
  
  // Timeout after 5 seconds
  setTimeout(() => {
    console.error('❌ Test timeout - no response from server');
    ws.close();
    process.exit(1);
  }, 5000);
};

// Run the test
testWebSocketConnection();