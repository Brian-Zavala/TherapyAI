#!/bin/bash

# Script to start the server and test WebSocket connection

echo "🚀 Starting Next.js server with fixed WebSocket support..."
echo "   This will use the websocket-server-fixed.js implementation"
echo ""

# Check if we should use HTTPS
if [ "$USE_HTTPS" = "true" ]; then
  echo "🔒 Using HTTPS mode"
  SERVER_CMD="npm run dev:https"
else
  echo "🔓 Using HTTP mode"
  SERVER_CMD="npm run dev:server"
fi

# Start the server in the background
$SERVER_CMD &
SERVER_PID=$!

echo "⏳ Waiting for server to start..."
sleep 6

# Run the WebSocket test
echo ""
echo "🧪 Running WebSocket connection test..."
node test-websocket-fixed.js

# Capture test result
TEST_RESULT=$?

# Kill the server
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

if [ $TEST_RESULT -eq 0 ]; then
  echo ""
  echo "✅ WebSocket tests passed! The 1006 error has been fixed."
  echo "   You can now start the server normally with: npm run dev:server"
else
  echo ""
  echo "❌ WebSocket tests failed!"
  echo "   Check the output above for error details"
fi

exit $TEST_RESULT