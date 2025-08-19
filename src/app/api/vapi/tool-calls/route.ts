// VAPI Tool Calls Handler for Real-time Therapeutic Tracking
import { NextRequest, NextResponse } from 'next/server';
import { vapiContextManager } from '@/lib/vapi-context-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // VAPI tool call structure
    const {
      message,
      call,
      tool
    } = body;

    // Extract session information from call metadata or message
    const sessionId = call?.metadata?.sessionId || message?.metadata?.sessionId;
    const userId = call?.metadata?.userId || message?.metadata?.userId;

    if (!sessionId || !userId) {
      console.error('Missing sessionId or userId in VAPI tool call:', { sessionId, userId });
      return NextResponse.json({
        error: 'Missing session or user identification'
      }, { status: 400 });
    }

    if (!tool || !tool.function) {
      return NextResponse.json({
        error: 'Invalid tool call format'
      }, { status: 400 });
    }

    const { name: toolName, arguments: toolArguments } = tool.function;
    let parsedArguments;

    try {
      parsedArguments = typeof toolArguments === 'string' 
        ? JSON.parse(toolArguments) 
        : toolArguments;
    } catch (error) {
      console.error('Error parsing tool arguments:', error);
      return NextResponse.json({
        error: 'Invalid tool arguments format'
      }, { status: 400 });
    }

    console.log(`VAPI Tool Call: ${toolName}`, {
      sessionId,
      userId,
      arguments: parsedArguments
    });

    // Process the tool call
    const result = await vapiContextManager.processToolCall(
      sessionId,
      userId,
      toolName,
      parsedArguments
    );

    // Return response in VAPI format
    return NextResponse.json({
      result: result.message,
      success: result.success,
      // Additional metadata for VAPI
      timestamp: new Date().toISOString(),
      toolName,
      sessionId
    });

  } catch (error) {
    console.error('Error processing VAPI tool call:', error);
    
    return NextResponse.json({
      result: "I've noted that important moment in our session. Let's continue our conversation.",
      success: true, // Return success to avoid disrupting the conversation
      error: 'Internal processing error'
    }, { status: 200 }); // Return 200 to keep VAPI conversation flowing
  }
}

// GET endpoint for testing tool call functionality
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const test = searchParams.get('test');

  if (test === 'tools') {
    // Return available tools for testing
    const testTools = [
      {
        name: 'track_breakthrough_moment',
        description: 'Track therapeutic breakthroughs in real-time',
        testPayload: {
          type: 'insight',
          description: 'Client realized connection between childhood and current patterns',
          intensity: 0.8,
          context: 'Discussion about family relationships'
        }
      },
      {
        name: 'track_emotional_state',
        description: 'Track emotional shifts during session',
        testPayload: {
          emotions: [
            {
              type: 'sadness',
              intensity: 0.6,
              description: 'Visible tears when discussing loss'
            }
          ],
          overall_valence: -0.3,
          context: 'Processing grief about relationship ending'
        }
      },
      {
        name: 'identify_recurring_theme',
        description: 'Identify themes connecting to previous sessions',
        testPayload: {
          theme: 'fear of abandonment',
          connection_to_past: 'Same pattern discussed 2 weeks ago',
          significance: 0.7
        }
      }
    ];

    return NextResponse.json({
      message: 'VAPI Tool Calls API is operational',
      availableTools: testTools,
      endpoint: '/api/vapi/tool-calls',
      method: 'POST'
    });
  }

  return NextResponse.json({
    message: 'VAPI Tool Calls Handler',
    status: 'operational',
    usage: 'POST requests with VAPI tool call format'
  });
}