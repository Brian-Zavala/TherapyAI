import { Readable, Transform, pipeline } from 'stream';
import { promisify } from 'util';
import type { TranscriptEntry } from '@prisma/client';

const pipelineAsync = promisify(pipeline);

export interface StreamMetrics {
  totalEntries: number;
  totalDuration: number;
  averageSentiment: number;
  speakerStats: Map<string, SpeakerMetrics>;
  emotionDistribution: Map<string, number>;
  processingTime: number;
  memoryUsage: number;
}

export interface SpeakerMetrics {
  wordCount: number;
  speakingTime: number;
  sentimentScore: number;
  emotionCounts: Map<string, number>;
}

export interface ChunkProcessorOptions {
  chunkSize?: number;
  onProgress?: (progress: number) => void;
  abortSignal?: AbortSignal;
}

export class TranscriptStreamProcessor {
  private readonly DEFAULT_CHUNK_SIZE = 100;
  
  /**
   * Process transcript entries in streaming chunks
   */
  async *processInChunks(
    entries: AsyncIterable<TranscriptEntry> | TranscriptEntry[],
    options: ChunkProcessorOptions = {}
  ): AsyncGenerator<TranscriptEntry[], void, unknown> {
    const chunkSize = options.chunkSize || this.DEFAULT_CHUNK_SIZE;
    let chunk: TranscriptEntry[] = [];
    let totalProcessed = 0;
    
    try {
      for await (const entry of entries) {
        if (options.abortSignal?.aborted) {
          throw new Error('Processing aborted');
        }
        
        chunk.push(entry);
        totalProcessed++;
        
        if (chunk.length >= chunkSize) {
          yield chunk;
          chunk = [];
          
          if (options.onProgress) {
            options.onProgress(totalProcessed);
          }
        }
      }
      
      // Yield remaining entries
      if (chunk.length > 0) {
        yield chunk;
      }
    } catch (error) {
      console.error('Error in chunk processing:', error);
      throw error;
    }
  }