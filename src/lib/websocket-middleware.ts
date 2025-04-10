/**
 * Middleware to capture the Next.js server instance for WebSocket usage
 * This allows us to attach a WebSocket server to the running HTTP server
 */

import { Server } from 'http';

/**
 * Store the server instance in the global scope for WebSocket setup
 */
export function captureServerInstance(server: Server) {
  (globalThis as any).__nextServerInstance = server;
  console.log('Captured Next.js server instance for WebSocket setup');
}

/**
 * Get the server instance from the global scope
 */
export function getServerInstance(): Server | undefined {
  return (globalThis as any).__nextServerInstance;
}