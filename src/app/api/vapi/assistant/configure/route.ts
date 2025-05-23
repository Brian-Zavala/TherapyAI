import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateAssistant } from '@/lib/vapi-server';

/**
 * Server-side endpoint to configure assistant with enhanced settings
 * This avoids sending large payloads through the client
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { assistantId, configuration } = await req.json();
    
    if (!assistantId) {
      return NextResponse.json({ error: 'Assistant ID required' }, { status: 400 });
    }
    
    // Extract only the configuration fields that Vapi accepts for assistant updates
    // Based on the error, these fields are not valid: backchanneling, endCallFunctionEnabled, 
    // silenceDetectionEnabled, backgroundDenoisingEnabled, modelOutputModeration
    const vapiConfig: any = {};
    
    // Only include fields that Vapi accepts
    if (configuration.model) vapiConfig.model = configuration.model;
    if (configuration.voice) vapiConfig.voice = configuration.voice;
    if (configuration.transcriber) vapiConfig.transcriber = configuration.transcriber;
    if (configuration.firstMessage) vapiConfig.firstMessage = configuration.firstMessage;
    
    // Timing settings
    if (configuration.silenceTimeoutSeconds !== undefined) {
      vapiConfig.silenceTimeoutSeconds = configuration.silenceTimeoutSeconds;
    }
    if (configuration.responseDelaySeconds !== undefined) {
      vapiConfig.responseDelaySeconds = configuration.responseDelaySeconds;
    }
    if (configuration.llmRequestDelaySeconds !== undefined) {
      vapiConfig.llmRequestDelaySeconds = configuration.llmRequestDelaySeconds;
    }
    if (configuration.numWordsToInterruptAssistant !== undefined) {
      vapiConfig.numWordsToInterruptAssistant = configuration.numWordsToInterruptAssistant;
    }
    
    // Other valid settings
    if (configuration.hipaaEnabled !== undefined) {
      vapiConfig.hipaaEnabled = configuration.hipaaEnabled;
    }
    if (configuration.backgroundSound) {
      vapiConfig.backgroundSound = configuration.backgroundSound;
    }
    if (configuration.modelOutputInMessagesEnabled !== undefined) {
      vapiConfig.modelOutputInMessagesEnabled = configuration.modelOutputInMessagesEnabled;
    }
    
    // Update assistant configuration on Vapi's servers
    const updatedAssistant = await updateAssistant(assistantId, vapiConfig);
    
    console.log(`Successfully updated assistant ${assistantId} with enhanced configuration`);
    
    return NextResponse.json({ 
      success: true, 
      assistantId,
      message: 'Assistant configured successfully'
    });
  } catch (error) {
    console.error('Error configuring assistant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to configure assistant' },
      { status: 500 }
    );
  }
}