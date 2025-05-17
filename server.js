/**
 * Custom server.js for Next.js with WebSocket support
 * This allows us to attach a WebSocket server to the HTTP server
 * for custom transcriber functionality
 */
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

// Set up environment variables from .env.local file
require('dotenv').config({ path: '.env.local' });

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Create a logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

console.log(`Starting Next.js server in ${dev ? 'development' : 'production'} mode on port ${port}`);

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url, true);
      
      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Important: Store the server instance globally for WebSocket setup
  // This allows the API route to access the server instance
  global.__nextServerInstance = server;

  // Touch the custom transcriber endpoint to initialize the WebSocket server
  if (!dev) {
    setTimeout(() => {
      console.log('Initializing custom transcriber WebSocket...');
      fetch(`http://localhost:${port}/api/vapi/custom-transcriber`).then(res => {
        console.log('Custom transcriber initialized:', res.status);
      }).catch(err => {
        console.error('Failed to initialize custom transcriber:', err);
      });
    }, 2000);
  }

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});