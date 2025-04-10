import { NextRequest, NextResponse } from 'next/server';

export function GET(req: NextRequest) {
  console.log('WebSocket endpoint requested (note: WebSockets need a custom server setup)');
  
  // For WebSockets to work, you need to use the custom server.js implementation
  return new Response(
    'WebSocket endpoint for custom transcriber. ' +
    'To use WebSockets, you need to run the app with the custom server.js using "npm start"',
    { status: 200 }
  );
}