/**
 * Transcription service for custom Vapi transcriber
 * Supports Deepgram for speech recognition with channel detection
 */
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import EventEmitter from "events";
import FileLogger from "./fileLogger";

// Constants
const PUNCTUATION_TERMINATORS = [".", "!", "?"];
const MAX_RETRY_ATTEMPTS = 3;
const DEBOUNCE_DELAY_IN_SECS = 3;
const DEBOUNCE_DELAY = DEBOUNCE_DELAY_IN_SECS * 1000;

// Deepgram API key from environment variable
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "";

/**
 * TranscriptionService class for handling real-time speech transcription
 * with Deepgram integration and channel detection (speaker diarization)
 */
export class TranscriptionService extends EventEmitter {
  config: any;
  logger: any;
  flowLogger: any;
  deepgramClient: any;
  deepgramLive: any;
  finalResult: { customer: string; assistant: string };
  audioBuffer: any[];
  retryAttempts: number;
  lastTranscriptionTime: number;
  pcmBuffer: Buffer;

  constructor(config: any, logger: any) {
    super();
    this.config = config;
    this.logger = logger;
    this.flowLogger = FileLogger.createNamedLogger("transcriber-flow.log");

    if (!DEEPGRAM_API_KEY) {
      throw new Error("Missing Deepgram API Key");
    }

    this.deepgramClient = createClient(DEEPGRAM_API_KEY);

    this.logger.logDetailed("INFO", "Initializing Deepgram live connection", "TranscriptionService", {
      model: "nova-2",
      sample_rate: 16000,
      channels: 2,
    });

    // Initialize Deepgram connection with appropriate settings
    this.deepgramLive = this.deepgramClient.listen.live({
      encoding: "linear16",
      channels: 2,
      sample_rate: 16000,
      model: "nova-2",
      smart_format: true,
      interim_results: true,
      endpointing: 800,
      language: "en",
      multichannel: true,
    });

    // Initialize state
    this.finalResult = { customer: "", assistant: "" };
    this.audioBuffer = [];
    this.retryAttempts = 0;
    this.lastTranscriptionTime = Date.now();
    this.pcmBuffer = Buffer.alloc(0);

    // Set up Deepgram event listeners
    this.setupDeepgramListeners();
  }

  /**
   * Set up all required Deepgram event listeners
   */
  private setupDeepgramListeners() {
    this.deepgramLive.addListener(LiveTranscriptionEvents.Open, () => {
      this.logger.logDetailed("INFO", "Deepgram connection opened", "TranscriptionService");

      this.deepgramLive.on(LiveTranscriptionEvents.Close, () => {
        this.logger.logDetailed("INFO", "Deepgram connection closed", "TranscriptionService");
        this.emitTranscription();
        this.audioBuffer = [];
      });

      this.deepgramLive.on(LiveTranscriptionEvents.Metadata, (data: any) => {
        this.logger.logDetailed("DEBUG", "Deepgram metadata received", "TranscriptionService", data);
      });

      this.deepgramLive.on(LiveTranscriptionEvents.Transcript, (event: any) => {
        this.handleTranscript(event);
      });

      this.deepgramLive.on(LiveTranscriptionEvents.Error, (err: any) => {
        this.logger.logDetailed("ERROR", "Deepgram error received", "TranscriptionService", { error: err });
        this.emit("transcriptionerror", err);
      });
    });
  }

  /**
   * Send audio data to Deepgram for processing
   */
  send(payload: any) {
    if (payload instanceof Buffer) {
      this.pcmBuffer = this.pcmBuffer.length === 0 ? payload : Buffer.concat([this.pcmBuffer, payload]);
    } else {
      this.logger.warn("TranscriptionService: Received non-Buffer data chunk.");
    }

    if (this.deepgramLive.getReadyState() === 1 && this.pcmBuffer.length > 0) {
      this.sendBufferedData(this.pcmBuffer);
      this.pcmBuffer = Buffer.alloc(0);
    }
  }

  /**
   * Send buffered audio data to Deepgram with retry logic
   */
  private sendBufferedData(bufferedData: Buffer) {
    try {
      this.logger.logDetailed("INFO", "Sending buffered data to Deepgram", "TranscriptionService", {
        bytes: bufferedData.length,
      });

      this.deepgramLive.send(bufferedData);
      this.audioBuffer = [];
      this.retryAttempts = 0;
    } catch (error) {
      this.logger.logDetailed("ERROR", "Error sending buffered data", "TranscriptionService", { error });
      this.retryAttempts++;

      if (this.retryAttempts <= MAX_RETRY_ATTEMPTS) {
        setTimeout(() => {
          this.sendBufferedData(bufferedData);
        }, 1000);
      } else {
        this.logger.logDetailed("ERROR", "Max retry attempts reached, discarding data", "TranscriptionService");
        this.audioBuffer = [];
        this.retryAttempts = 0;
      }
    }
  }

  /**
   * Process transcript events from Deepgram
   */
  private handleTranscript(transcription: any) {
    if (!transcription.channel || !transcription.channel.alternatives?.[0]) {
      this.logger.logDetailed("WARN", "Invalid transcript format", "TranscriptionService", { transcription });
      return;
    }

    const text = transcription.channel.alternatives[0].transcript.trim();
    if (!text) return;

    const currentTime = Date.now();
    const channelIndex = transcription.channel_index ? transcription.channel_index[0] : 0;
    
    // Determine if this is customer or assistant based on channel index
    const channel = channelIndex === 0 ? "customer" : "assistant";

    this.logger.logDetailed("INFO", "Received transcript", "TranscriptionService", { 
      channel, 
      text,
      is_final: transcription.is_final || transcription.speech_final 
    });

    // Only append with a space if the buffer is not empty
    if (this.finalResult[channel]) {
      this.finalResult[channel] += ` ${text}`;
    } else {
      this.finalResult[channel] = text;
    }

    if (transcription.is_final || transcription.speech_final) {
      // For final transcriptions, emit immediately
      this.emitTranscription();
      
      // Clear the buffer after emitting the final transcript
      this.finalResult[channel] = "";
    } else {
      // For interim transcriptions, emit only after inactivity period
      if (currentTime - this.lastTranscriptionTime >= DEBOUNCE_DELAY) {
        this.logger.logDetailed(
          "INFO",
          `Emitting transcript after ${DEBOUNCE_DELAY_IN_SECS}s inactivity`,
          "TranscriptionService"
        );
        this.emitTranscription();
      }
    }

    this.lastTranscriptionTime = currentTime;
  }

  /**
   * Emit transcription events for both customer and assistant channels
   * with improved sentence handling and deduplication
   */
  private emitTranscription() {
    for (const chan of ["customer", "assistant"]) {
      const textBuffer = this.finalResult[chan].trim();
      
      if (!textBuffer) continue;
      
      // Process the text to create complete sentences when possible
      const cleanedText = textBuffer;
      
      // Check if we have at least one complete sentence (with punctuation at the end)
      const hasCompleteEndingRegex = /[.!?]\s*$/;
      const hasCompleteSentence = hasCompleteEndingRegex.test(cleanedText);
      
      // If we have complete sentences, emit the entire buffer
      if (hasCompleteSentence) {
        this.logger.logDetailed("INFO", "Emitting complete sentence", "TranscriptionService", {
          channel: chan,
          transcript: cleanedText,
        });
        
        this.emit("transcription", cleanedText, chan);
        this.finalResult[chan] = ""; // Clear buffer after emitting
      } 
      // For non-final incomplete sentences, only emit if the text is substantial (more than 4 words)
      else if (cleanedText.split(/\s+/).length > 4) {
        this.logger.logDetailed("INFO", "Emitting substantial fragment", "TranscriptionService", {
          channel: chan,
          transcript: cleanedText,
        });
        
        this.emit("transcription", cleanedText, chan);
        this.finalResult[chan] = ""; // Clear buffer after emitting
      }
      // For very short fragments, keep accumulating unless we've been explicitly told it's final
      else {
        this.logger.logDetailed("INFO", "Keeping short fragment in buffer", "TranscriptionService", {
          channel: chan,
          buffer: cleanedText,
        });
        // Keep the text in buffer - don't clear or emit
      }
    }
  }
}

export default TranscriptionService;