// Factory pattern to return real or demo VAPI based on environment
import Vapi from '@vapi-ai/web';
import { DemoVapi } from './demo-vapi';
import { isDemoMode } from '@/config/demo.config';

export interface VapiInterface {
  start: (assistantId?: string) => Promise<any>;
  stop: () => void;
  on: (event: string, handler: Function) => void;
  removeAllListeners: () => void;
  send: (message: any) => void;
}

/**
 * Returns either a real VAPI instance or a mock demo instance
 * based on the current environment configuration
 */
export async function createVapiInstance(token?: string): Promise<VapiInterface> {
  if (isDemoMode()) {
    console.log('🎭 Demo mode enabled - using mock VAPI');
    return new DemoVapi();
  }

  if (!token) {
    throw new Error('VAPI token required in production mode');
  }

  console.log('🚀 Production mode - using real VAPI');
  return new Vapi(token) as VapiInterface;
}

// Export type for use in components
export type { VapiInterface as Vapi };