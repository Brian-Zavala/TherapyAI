import { NextRequest, NextResponse } from 'next/server';

/**
 * GET endpoint to retrieve transcriber configuration for Vapi
 */
export async function GET(req: NextRequest) {
  console.log('Deepgram transcriber config requested');
  
  try {
    // Check for API key from query parameter or environment
    const apiKey = req.nextUrl.searchParams.get('apiKey') || process.env.DEEPGRAM_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Missing Deepgram API key' 
      }, { status: 400 });
    }
    
    // Create and return the Deepgram config
    // This is a direct Deepgram configuration that Vapi can use
    const config = {
      provider: 'deepgram',
      apiKey: apiKey,
      language: "en",
      model: "nova-3",       // Deepgram's latest model
      tier: "enhanced",      // higher quality transcription
      features: {
        punctuate: true,     // add punctuation
        diarize: true,       // speaker identification 
        smart_format: true,  // format numbers, dates, etc.
        profanity_filter: false
      }
    };
    
    // Log with redacted API key for security
    console.log('Returning Deepgram transcriber config:', JSON.stringify({
      ...config,
      apiKey: 'REDACTED'
    }, null, 2));
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error generating transcriber config:', error);
    return NextResponse.json({ 
      error: 'Failed to generate transcriber configuration' 
    }, { status: 500 });
  }
}