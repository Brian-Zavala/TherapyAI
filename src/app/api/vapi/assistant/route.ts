import { NextRequest, NextResponse } from 'next/server';
import { createAssistant, getAssistant, updateAssistant } from '@/lib/vapi-server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

/**
 * Endpoint to create a new Vapi assistant
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if this is a personalized assistant request (from query params)
    const { searchParams } = new URL(req.url);
    if (searchParams.get('personalized') === 'true') {
      // Handle personalized assistant configuration with conversation history
      const body = await req.json();
      const conversationHistory = body.conversationHistory || '';
      const _transcriptChunks = body.transcriptChunks || [];
      
      // Delegate to GET handler logic but with POST body data
      searchParams.set('conversationHistory', conversationHistory);
      
      // Create a new request with the conversation history in searchParams
      const modifiedUrl = new URL(req.url);
      modifiedUrl.searchParams.set('conversationHistory', conversationHistory);
      
      // Call the GET handler with modified URL
      const getRequest = new NextRequest(modifiedUrl, {
        method: 'GET',
        headers: req.headers
      });
      
      return GET(getRequest);
    }
    
    // Original POST logic for creating new assistants
    const config = await req.json();
    const assistant = await createAssistant(config);

    // Store assistant ID in the database
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        assistantId: assistant.id
      }
    });

    return NextResponse.json(assistant);
  } catch (error) {
    console.error('Error creating assistant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create assistant' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint to get assistant by ID or the user's default assistant
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get assistantId from query or from user profile
    const { searchParams } = new URL(req.url);
    let assistantId = searchParams.get('id');

    if (!assistantId) {
      // Get from user profile if not provided
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { 
          id: true,
          assistantId: true,
          name: true,
          age: true,
          partnerName: true,
          partnerAge: true,
          relationshipStatus: true,
          familyMember1: true,
          familyMember1Age: true,
          familyMember1Relation: true,
          familyMember2: true,
          familyMember2Age: true,
          familyMember2Relation: true,
          familyMember3: true,
          familyMember3Age: true,
          familyMember3Relation: true,
          familyMember4: true,
          familyMember4Age: true,
          familyMember4Relation: true,
          familyMember5: true,
          familyMember5Age: true,
          familyMember5Relation: true,
          familyMember6: true,
          familyMember6Age: true,
          familyMember6Relation: true,
          familyMember7: true,
          familyMember7Age: true,
          familyMember7Relation: true,
          pronouns: true,
          therapyType: true,
          currentConcerns: true,
          communicationStyle: true,
          sessionPreference: true,
          additionalNotes: true,
          onboardingCompleted: true
        }
      });
      
      assistantId = user?.assistantId || null;
      
      // If creating a personalized assistant is requested
      if (searchParams.get('personalized') === 'true' && user) {
        // Import the necessary functions
        const { getPersonalizedAssistantConfig } = await import('@/lib/vapi');
        
        // Skip session history fetching for speed - use basic session count instead
        let sessionHistory = "No previous sessions found.";
        let sessions: any[] = [];
        
        try {
          // Just get a simple count of completed sessions - much faster
          const sessionCount = await prisma.session.count({
            where: {
              userId: user.id,
              status: 'completed'
            }
          });
          
          if (sessionCount > 0) {
            // Get just the most recent session date without transcript entries
            const lastSession = await prisma.session.findFirst({
              where: {
                userId: user.id,
                status: 'completed'
              },
              orderBy: {
                date: 'desc'
              },
              select: {
                date: true,
                theme: true
              }
            });
            
            if (lastSession) {
              const lastDate = new Date(lastSession.date).toLocaleDateString();
              sessionHistory = `Client has ${sessionCount} previous sessions. Last session: ${lastDate}.${
                lastSession.theme ? ` Theme: ${lastSession.theme}.` : ""
              }`;
            }
          }
          
          // Create minimal sessions array for compatibility
          sessions = [{ length: sessionCount }];
        } catch (error) {
          console.error('Error fetching session count:', error);
          sessions = [];
        }
        
        // Get the therapy type from query params or user profile - prioritize user selection (FIXED)
        const queryTherapyType = searchParams.get('therapyType');
        const userStoredType = user.therapyType;
        // CRITICAL FIX: Query parameter (user's explicit selection) should take priority over stored preference
        const therapyType = queryTherapyType || userStoredType || 'couple';
        

        // Handle selected family members for family therapy sessions
        const selectedFamilyMembersParam = searchParams.get('selectedFamilyMembers');
        let selectedFamilyMembers: Array<{name: string, age: number, relation: string}> = [];
        
        if (selectedFamilyMembersParam) {
          try {
            selectedFamilyMembers = JSON.parse(decodeURIComponent(selectedFamilyMembersParam));
            console.log('Received selected family members for session:', selectedFamilyMembers);
          } catch (error) {
            console.error('Error parsing selected family members:', error);
          }
        }

        // Create a comprehensive user profile with all available data
        const userProfile = {
          id: user.id,
          name: user.name,
          userName: user.name,
          age: user.age,
          userAge: user.age,
          pronouns: user.pronouns,
          partnerName: user.partnerName,
          partnerAge: user.partnerAge,
          relationshipStatus: user.relationshipStatus,
          familyMember1: user.familyMember1,
          familyMember1Age: user.familyMember1Age,
          familyMember1Relation: (user as any).familyMember1Relation,
          familyMember2: user.familyMember2,
          familyMember2Age: user.familyMember2Age,
          familyMember2Relation: (user as any).familyMember2Relation,
          familyMember3: user.familyMember3,
          familyMember3Age: user.familyMember3Age,
          familyMember3Relation: (user as any).familyMember3Relation,
          familyMember4: user.familyMember4,
          familyMember4Age: user.familyMember4Age,
          familyMember4Relation: (user as any).familyMember4Relation,
          familyMember5: (user as any).familyMember5,
          familyMember5Age: (user as any).familyMember5Age,
          familyMember5Relation: (user as any).familyMember5Relation,
          familyMember6: (user as any).familyMember6,
          familyMember6Age: (user as any).familyMember6Age,
          familyMember6Relation: (user as any).familyMember6Relation,
          familyMember7: (user as any).familyMember7,
          familyMember7Age: (user as any).familyMember7Age,
          familyMember7Relation: (user as any).familyMember7Relation,
          therapyType: user.therapyType || searchParams.get('therapyType') || 'couple',
          currentConcerns: user.currentConcerns || [],
          communicationStyle: user.communicationStyle || 'balanced',
          sessionPreference: user.sessionPreference || 'flexible',
          additionalNotes: user.additionalNotes || '',
          sessionHistory: sessionHistory,
          // Additional context for enhanced personalization
          onboardingCompleted: user.onboardingCompleted,
          sessionsCompleted: sessions.length,
          lastSessionDate: sessions[0]?.date || null,
          // Add selected family members for this specific session
          selectedFamilyMembers: selectedFamilyMembers.length > 0 ? selectedFamilyMembers : undefined
        };
        
        // Get session duration and start time if provided
        const sessionDuration = searchParams.get('duration') ? parseInt(searchParams.get('duration')!) : 60;
        const sessionStartTime = searchParams.get('startTime') || new Date().toISOString();
        
        // Session options for timing configuration
        const sessionOptions = {
          duration: sessionDuration,
          startTime: sessionStartTime
        };
        
        // Create a personalized assistant config based on user profile with session timing
        const personalizedConfig = getPersonalizedAssistantConfig(userProfile, therapyType, sessionOptions);
        
        // Determine the appropriate assistant ID based on therapy type
        let assistantId;
        if (therapyType === 'couple') {
          assistantId = process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID;
        } else if (therapyType === 'solo') {
          assistantId = process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID;
        } else if (therapyType === 'family') {
          assistantId = process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID;
        } else {
          assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
        }
        
        // Add session-specific context if available
        const sessionContext = searchParams.get('sessionContext');
        if (sessionContext) {
          try {
            const contextData = JSON.parse(decodeURIComponent(sessionContext));
            personalizedConfig.variableValues = {
              ...personalizedConfig.variableValues,
              ...contextData
            };
          } catch (e) {
            console.error('Failed to parse session context:', e);
          }
        }
        
        // Handle conversation resumption context
        const isResuming = searchParams.get('resuming') === 'true';
        const conversationHistory = searchParams.get('conversationHistory');
        const sessionId = searchParams.get('sessionId');
        
        if (isResuming && conversationHistory) {
          try {
            const decodedHistory = decodeURIComponent(conversationHistory);
            console.log(`📚 Processing resume context for session ${sessionId}`);
            
            // Extract key topics from conversation history
            const conversationLines = decodedHistory.split('\n').filter(line => line.trim());
            const _therapistLines = conversationLines.filter(line => line.startsWith('THERAPIST:'));
            const userLines = conversationLines.filter(line => line.startsWith('USER:'));
            
            // Create a summary of topics discussed
            const topicsDiscussed = userLines.slice(-3).map(line => 
              line.replace('USER:', '').trim()
            ).filter(Boolean).join(', ');
            
            // Enhance the first message to acknowledge the pause
            personalizedConfig.firstMessage = `Welcome back, ${userProfile.userName || userProfile.name}. I see we were just discussing ${topicsDiscussed || 'your concerns'}. Let's continue where we left off. How are you feeling right now?`;
            
            // Add conversation context to variable values
            personalizedConfig.variableValues = {
              ...personalizedConfig.variableValues,
              previousConversation: decodedHistory,
              isResumedSession: 'true',
              lastTopics: topicsDiscussed || 'previous discussion',
              sessionResumed: new Date().toISOString()
            };
            
            // Update the system prompt to include conversation context
            if (personalizedConfig.model && personalizedConfig.model.messages) {
              const systemMessage = personalizedConfig.model.messages.find((msg: any) => msg.role === 'system');
              if (systemMessage) {
                systemMessage.content = `${systemMessage.content}\n\nIMPORTANT: This is a resumed session. The user paused and is now continuing. Previous conversation:\n${decodedHistory}\n\nAcknowledge that you're continuing the session naturally. Reference what was being discussed if relevant, but don't overly focus on the pause itself. Continue the therapeutic flow.`;
              }
            }
            
            console.log(`✅ Enhanced config for resumed session with ${conversationLines.length} conversation lines`);
          } catch (e) {
            console.error('Failed to process conversation history:', e);
          }
        }
        

        // Check if we should use inline configuration
        const useInlineConfig = process.env.NEXT_PUBLIC_USE_INLINE_ASSISTANT === 'true'
        
        if (useInlineConfig) {
          // Return the personalized config as inline configuration (no assistant ID)
          console.log(`🎭 Returning inline assistant configuration for ${therapyType} therapy`)
          
          // Clean the config for VAPI - only include valid CreateAssistantDto fields
          // First, handle function calling by moving functions to model.tools
          const modelWithTools = personalizedConfig.functions && personalizedConfig.functions.length > 0 
            ? {
                ...personalizedConfig.model,
                tools: personalizedConfig.functions
              }
            : personalizedConfig.model;
            
          // Ensure model has required provider field for VAPI schema compliance
          if (modelWithTools && !modelWithTools.provider) {
            // Detect provider from model name
            if (modelWithTools.model && modelWithTools.model.startsWith('claude-')) {
              modelWithTools.provider = 'anthropic';
            } else if (modelWithTools.model && (modelWithTools.model.startsWith('gpt-') || modelWithTools.model.startsWith('o1-'))) {
              modelWithTools.provider = 'openai';
            }
          }
          
          // Ensure voice has required provider field
          if (personalizedConfig.voice && !personalizedConfig.voice.provider) {
            // Detect voice provider from voiceId or other properties
            if (personalizedConfig.voice.voiceId) {
              personalizedConfig.voice.provider = '11labs'; // Default to 11labs if not specified
            }
          }
          
          // Ensure transcriber has required provider field  
          if (personalizedConfig.transcriber && !personalizedConfig.transcriber.provider) {
            personalizedConfig.transcriber.provider = 'deepgram'; // Default to deepgram if not specified
          }
            
          const cleanConfig = {
            // Core VAPI configuration - these are the only valid fields per VAPI schema
            model: modelWithTools,
            voice: personalizedConfig.voice,
            transcriber: personalizedConfig.transcriber,
            firstMessage: personalizedConfig.firstMessage,
            
            // Valid VAPI session settings only
            maxDurationSeconds: personalizedConfig.maxDurationSeconds,
            silenceTimeoutSeconds: personalizedConfig.silenceTimeoutSeconds,
            backgroundSound: personalizedConfig.backgroundSound || "off",
            modelOutputInMessagesEnabled: personalizedConfig.modelOutputInMessagesEnabled || false,
            
            // Client messages configuration  
            clientMessages: Array.isArray(personalizedConfig.clientMessages) 
              ? personalizedConfig.clientMessages 
              : ["transcript", "model-output", "hang", "function-call-result", "tool-calls", "tool-calls-result", "speech-update", "conversation-update"]
            
            // Removed all non-VAPI fields that were causing 400 errors:
            // - variableValues (not in VAPI schema)
            // - metadata (not in VAPI schema)  
            // - recordingEnabled (not in VAPI schema)
            // - hipaaEnabled (not in VAPI schema)
            // - responseDelaySeconds (not in VAPI schema)
            // - llmRequestDelaySeconds (not in VAPI schema)  
            // - numWordsToInterruptAssistant (not in VAPI schema)
            // - functions (moved to model.tools instead)
            // - backgroundDenoisingEnabled (not in VAPI schema)
          };
          
          // Debug logging for VAPI configuration validation
          console.log('🔍 VAPI Configuration Debug:', {
            modelProvider: cleanConfig.model?.provider,
            modelName: cleanConfig.model?.model,
            voiceProvider: cleanConfig.voice?.provider,
            voiceId: cleanConfig.voice?.voiceId,
            transcriberProvider: cleanConfig.transcriber?.provider,
            hasFirstMessage: !!cleanConfig.firstMessage,
            maxDuration: cleanConfig.maxDurationSeconds,
            toolsCount: cleanConfig.model?.tools?.length || 0,
            clientMessagesCount: cleanConfig.clientMessages?.length || 0
          });
          
          // Validate configuration before sending to client
          const { validateVapiInlineConfig, logVapiValidationResult } = await import('@/lib/vapi-config-validator');
          const validationResult = validateVapiInlineConfig(cleanConfig);
          logVapiValidationResult(validationResult);
          
          if (!validationResult.isValid) {
            console.error('❌ VAPI configuration validation failed, returning error');
            return NextResponse.json(
              { 
                error: 'Invalid VAPI configuration', 
                validationErrors: validationResult.errors 
              }, 
              { status: 400 }
            );
          }
          
          return NextResponse.json(cleanConfig);
        } else {
          // Return the personalized config with assistant ID
          return NextResponse.json({
            id: assistantId,
            ...personalizedConfig,
            personalized: true,
            userProfile: userProfile,
            // Include important metadata for the client
            metadata: {
              ...personalizedConfig.metadata,
              assistantVersion: '2.0',
              enhancedPersonalization: true,
              onboardingData: userProfile.onboardingCompleted,
              sessionCount: userProfile.sessionsCompleted,
              configType: 'assistant-id'
            }
          });
        }
      }
    }

    if (!assistantId) {
      return NextResponse.json({ error: 'No assistant ID found' }, { status: 404 });
    }

    const assistant = await getAssistant(assistantId);
    return NextResponse.json(assistant);
  } catch (error) {
    console.error('Error getting assistant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get assistant' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint to update an existing assistant
 */
export async function PUT(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let assistantId = searchParams.get('id');

    if (!assistantId) {
      // Get from user profile if not provided
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { assistantId: true }
      });
      
      assistantId = user?.assistantId || null;
    }

    if (!assistantId) {
      return NextResponse.json({ error: 'No assistant ID found' }, { status: 404 });
    }

    const config = await req.json();
    const assistant = await updateAssistant(assistantId, config);

    return NextResponse.json(assistant);
  } catch (error) {
    console.error('Error updating assistant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update assistant' },
      { status: 500 }
    );
  }
}