import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import { TranscriptionService } from '@/lib/transcriptionService';
import FileLogger from '@/lib/fileLogger';

// Create a logger instance for the transcriber
const logger = new FileLogger();
let wss: WebSocketServer | null = null;

/**
 * This route handler initializes the WebSocket server for custom transcription
 * It's called once when the API route is first accessed
 */
export function GET(req: NextRequest) {
  // We can't directly return a WebSocket server from an API route,
  // so we setup the WSS with the server instance when this route is hit
  try {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Custom transcriber endpoint accessed in development mode');
      return new Response('WebSocket server not available in development preview', { status: 200 });
    }

    // In production environment with a real server
    if ((globalThis as any).__customTranscriberInitialized) {
      return new Response('Custom Transcriber WebSocket already initialized', { status: 200 });
    }

    logger.info('Initializing Custom Transcriber WebSocket server');
    setupWebSocketServer();

    (globalThis as any).__customTranscriberInitialized = true;
    return new Response('Custom Transcriber WebSocket initialized', { status: 200 });
  } catch (error) {
    logger.error('Error setting up WebSocket server', error);
    return new Response(`Failed to initialize WebSocket server: ${error}`, { status: 500 });
  }
}

/**
 * Setup the WebSocket server for custom transcription
 */
function setupWebSocketServer() {
  try {
    // Get the server instance from the environment
    const server = (globalThis as any).__nextServerInstance;
    
    if (!server) {
      logger.error('Server instance not found for WebSocket setup');
      return;
    }

    // Create configuration for the transcription service
    const config = {
      DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
    };

    // Initialize the WebSocket server
    wss = new WebSocketServer({ 
      server, 
      path: '/api/vapi/custom-transcriber',
      verifyClient: (info, cb) => {
        // Optional verification logic
        // Check for auth headers if needed
        const { req } = info;
        
        // If a secret is provided, validate it
        const vapiSecret = process.env.VAPI_TRANSCRIBER_SECRET;
        if (vapiSecret) {
          const headerSecret = req.headers['x-vapi-secret'];
          if (headerSecret !== vapiSecret) {
            logger.error('Invalid secret provided', { headerSecret });
            cb(false, 401, 'Unauthorized');
            return;
          }
        }
        
        cb(true);
      }
    });

    wss.on('connection', (ws) => {
      logger.logDetailed('INFO', 'New WebSocket client connected', 'WebSocketServer');
      
      // Create a new transcription service for each connection
      const transcriptionService = new TranscriptionService(config, logger);
      
      ws.on('message', (data, isBinary) => {
        if (!isBinary) {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'start') {
              logger.logDetailed('INFO', 'Received start message from Vapi', 'WebSocketServer', { 
                sampleRate: msg.sampleRate, 
                channels: msg.channels 
              });
            }
          } catch (err) {
            logger.error('JSON parse error', err);
          }
        } else {
          // Binary data - PCM audio
          transcriptionService.send(data);
        }
      });

      ws.on('close', () => {
        logger.logDetailed('INFO', 'WebSocket client disconnected', 'WebSocketServer');
        
        // Clean up the Deepgram connection when client disconnects
        if (transcriptionService.deepgramLive && 
            transcriptionService.deepgramLive.getReadyState() === 1) {
          transcriptionService.deepgramLive.finish();
        }
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', error);
      });

      // Forward transcription events to the Vapi client
      transcriptionService.on('transcription', (text, channel) => {
        const response = {
          type: 'transcriber-response',
          transcription: text,
          channel,
        };
        
        ws.send(JSON.stringify(response));
        
        logger.logDetailed('INFO', 'Sent transcription to Vapi', 'WebSocketServer', {
          channel,
          text,
        });
      });

      transcriptionService.on('transcriptionerror', (err) => {
        ws.send(JSON.stringify({ 
          type: 'error', 
          error: 'Transcription service error' 
        }));
        
        logger.error('Transcription service error', err);
      });
    });

    logger.info('WebSocket server initialized for custom transcription');
  } catch (error) {
    logger.error('Failed to setup WebSocket server', error);
  }
}

// Close the WebSocket server when the module is reloaded (dev only)
if (wss && process.env.NODE_ENV !== 'production') {
  logger.info('Closing existing WebSocket server');
  (wss as WebSocketServer).close();
  wss = null;
}