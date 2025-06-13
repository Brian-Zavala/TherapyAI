/**
 * Custom server.js for Next.js 
 * This handles HTTPS in development mode
 * and initializes the custom transcriber
 */
const { createServer: createHttpServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

// Set up environment variables from .env file
require('dotenv').config({ path: '.env' });

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const useHttps = process.env.USE_HTTPS === 'true';
const app = next({ dev, quiet: false });
const handle = app.getRequestHandler();

// Create a logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

console.log(`Starting Next.js server in ${dev ? 'development' : 'production'} mode on port ${port} (${useHttps ? 'HTTPS' : 'HTTP'})`);

app.prepare().then(() => {
  let server;
  
  const requestHandler = async (req, res) => {
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
  };

  // Create HTTPS server in development if USE_HTTPS is true
  if (useHttps && dev) {
    try {
      const httpsOptions = {
        key: fs.readFileSync('./localhost+3-key.pem'),
        cert: fs.readFileSync('./localhost+3.pem'),
      };
      server = createHttpsServer(httpsOptions, requestHandler);
      console.log('Using HTTPS with local certificates');
    } catch (err) {
      console.error('Failed to load SSL certificates:', err);
      console.log('Falling back to HTTP. Run "mkcert localhost 127.0.0.1 ::1" to generate certificates.');
      server = createHttpServer(requestHandler);
    }
  } else {
    server = createHttpServer(requestHandler);
  }

  // Important: Store the server instance globally for custom transcriber
  // This allows the API route to access the server instance
  global.__nextServerInstance = server;

  // Touch the custom transcriber endpoint to initialize the WebSocket server
  if (!dev) {
    setTimeout(() => {
      console.log('Initializing custom transcriber WebSocket...');
      const protocol = useHttps ? 'https' : 'http';
      fetch(`${protocol}://localhost:${port}/api/vapi/custom-transcriber`).then(res => {
        console.log('Custom transcriber initialized:', res.status);
      }).catch(err => {
        console.error('Failed to initialize custom transcriber:', err);
      });
    }, 2000);
  }

  server.listen(port, '0.0.0.0', (err) => {
    if (err) throw err;
    const protocol = useHttps && dev ? 'https' : 'http';
    console.log(`> Ready on ${protocol}://localhost:${port}`);
    if (useHttps && dev) {
      console.log(`> Also available on ${protocol}://127.0.0.1:${port} and ${protocol}://[::1]:${port}`);
    }
  });
});