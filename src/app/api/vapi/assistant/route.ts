// @ts-nocheck
import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { createAssistant, getAssistant, updateAssistant } from '@/lib/vapi-server';
import { getPersonalizedAssistantConfig } from '@/lib/vapi';
import { prisma } from '@/lib/prisma-optimized';
import { cleanAndValidateVapiConfig } from '@/lib/vapi-config-cleaner';

async function getPersonalizedAssistant(req: NextRequest, session: any) {
 try {
  const { searchParams } = new URL(req.url);
  const isResuming = searchParams.get('resuming') === 'true';

  console.log('[VAPI Assistant] Getting personalized assistant for user:', session.user.id);
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      onboardingCompleted: true,
      profile: {
        select: {
          assistantId: true,
          age: true,
          partnerName: true,
          partnerAge: true,
          relationshipStatus: true,
          pronouns: true,
          currentConcerns: true,
          communicationStyle: true,
          sessionPreference: true,
          sessionFrequency: true,
          recurringSession: true,
          additionalNotes: true
        }
      },
      familyMembers: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: {
          name: true,
          age: true,
          relationship: true,
          order: true
        }
      }
    }
  });

  if (!user) {
    console.error('[VAPI Assistant] User not found in database:', session.user.id);
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  console.log('[VAPI Assistant] User data retrieved:', {
    userId: user.id,
    hasProfile: !!user.profile,
    hasFamilyMembers: user.familyMembers?.length > 0,
    onboardingCompleted: user.onboardingCompleted
  });

  let sessionHistory = "No previous sessions found.";
  let sessions: { length: number; date?: Date }[] = [];

  try {
    const sessionCount = await prisma.session.count({
      where: {
        userId: user.id,
        status: 'COMPLETED'
      }
    });

    if (sessionCount > 0) {
      const lastSession = await prisma.session.findFirst({
        where: {
          userId: user.id,
          status: 'COMPLETED'
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
    sessions = [{ length: sessionCount }];
  } catch (error) {
    console.error('Error fetching session count:', error);
    sessions = [];
  }

  const queryTherapyType = searchParams.get('therapyType');
  const therapyType = queryTherapyType || 'solo';

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

  const familyMembers = user.familyMembers || [];
  const userProfile = {
    id: user.id,
    name: user.name,
    userName: user.name,
    age: user.profile?.age,
    userAge: user.profile?.age,
    pronouns: user.profile?.pronouns,
    partnerName: user.profile?.partnerName,
    partnerAge: user.profile?.partnerAge,
    relationshipStatus: user.profile?.relationshipStatus,
    familyMember1: familyMembers[0]?.name,
    familyMember1Age: familyMembers[0]?.age,
    familyMember1Relation: familyMembers[0]?.relationship,
    familyMember2: familyMembers[1]?.name,
    familyMember2Age: familyMembers[1]?.age,
    familyMember2Relation: familyMembers[1]?.relationship,
    familyMember3: familyMembers[2]?.name,
    familyMember3Age: familyMembers[2]?.age,
    familyMember3Relation: familyMembers[2]?.relationship,
    familyMember4: familyMembers[3]?.name,
    familyMember4Age: familyMembers[3]?.age,
    familyMember4Relation: familyMembers[3]?.relationship,
    familyMember5: familyMembers[4]?.name,
    familyMember5Age: familyMembers[4]?.age,
    familyMember5Relation: familyMembers[4]?.relationship,
    familyMember6: familyMembers[5]?.name,
    familyMember6Age: familyMembers[5]?.age,
    familyMember6Relation: familyMembers[5]?.relationship,
    familyMember7: familyMembers[6]?.name,
    familyMember7Age: familyMembers[6]?.age,
    familyMember7Relation: familyMembers[6]?.relationship,
    therapyType: searchParams.get('therapyType') || 'solo',
    currentConcerns: user.profile?.currentConcerns || [],
    communicationStyle: user.profile?.communicationStyle || 'balanced',
    sessionPreference: user.profile?.sessionPreference || 'flexible',
    sessionFrequency: user.profile?.sessionFrequency || 'as-needed',
    recurringSession: user.profile?.recurringSession || 'no',
    additionalNotes: user.profile?.additionalNotes || '',
    sessionHistory: sessionHistory,
    onboardingCompleted: user.onboardingCompleted,
    sessionsCompleted: sessions.length,
    lastSessionDate: sessions[0]?.date || null,
    selectedFamilyMembers: selectedFamilyMembers.length > 0 ? selectedFamilyMembers : undefined
  };

  const sessionDuration = searchParams.get('duration') ? parseInt(searchParams.get('duration')!) : null;
  const sessionStartTime = searchParams.get('startTime') || new Date().toISOString();

  // Validate that duration is provided when creating new sessions
  if (!sessionDuration && !isResuming) {
    console.error('[VAPI Assistant] No duration provided for new session');
    return NextResponse.json(
      { error: 'Session duration is required', details: 'Duration parameter must be provided when starting a new session' },
      { status: 400 }
    );
  }

  const sessionOptions = {
    duration: sessionDuration || 30, // Fallback only for resumed sessions
    startTime: sessionStartTime
  };

  const personalizedConfig = getPersonalizedAssistantConfig(userProfile, therapyType, sessionOptions);

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

  const conversationHistory = searchParams.get('conversationHistory');
  const sessionId = searchParams.get('sessionId');

  if (isResuming && conversationHistory) {
    try {
      const decodedHistory = decodeURIComponent(conversationHistory);
      console.log(`📚 Processing resume context for session ${sessionId}`);
      const conversationLines = decodedHistory.split('\n').filter(line => line.trim());
      const userLines = conversationLines.filter(line => line.startsWith('USER:'));
      const topicsDiscussed = userLines.slice(-3).map(line =>
        line.replace('USER:', '').trim()
      ).filter(Boolean).join(', ');

      personalizedConfig.firstMessage = `Welcome back, ${userProfile.userName || userProfile.name}. I see we were just discussing ${topicsDiscussed || 'your concerns'}. Let's continue where we left off. How are you feeling right now?`;
      personalizedConfig.variableValues = {
        ...personalizedConfig.variableValues,
        previousConversation: decodedHistory,
        isResumedSession: 'true',
        lastTopics: topicsDiscussed || 'previous discussion',
        sessionResumed: new Date().toISOString()
      };

      if (personalizedConfig.model && personalizedConfig.model.messages) {
        const systemMessage = personalizedConfig.model.messages.find((msg: { role: string; content: string }) => msg.role === 'system');
        if (systemMessage) {
          systemMessage.content = `${systemMessage.content}\n\nIMPORTANT: This is a resumed session. The user paused and is now continuing. Previous conversation:\n${decodedHistory}\n\nAcknowledge that you're continuing the session naturally. Reference what was being discussed if relevant, but don't overly focus on the pause itself. Continue the therapeutic flow.`;
        }
      }
      console.log(`✅ Enhanced config for resumed session with ${conversationLines.length} conversation lines`);
    } catch (e) {
      console.error('Failed to process conversation history:', e);
    }
  }

  const useInlineConfig = process.env.NEXT_PUBLIC_USE_INLINE_ASSISTANT === 'true'

  if (useInlineConfig) {
    console.log(`🎭 Returning inline assistant configuration for ${therapyType} therapy`)
    // Note: personalizedConfig.model already has tools array from getPersonalizedAssistantConfig
    const modelWithTools = personalizedConfig.model;

    if (modelWithTools && !modelWithTools.provider) {
      if (modelWithTools.model && modelWithTools.model.startsWith('claude-')) {
        modelWithTools.provider = 'anthropic';
      } else if (modelWithTools.model && (modelWithTools.model.startsWith('gpt-') || modelWithTools.model.startsWith('o1-'))) {
        modelWithTools.provider = 'openai';
      }
    }

    if (personalizedConfig.voice && !personalizedConfig.voice.provider) {
      if (personalizedConfig.voice.voiceId) {
        personalizedConfig.voice.provider = '11labs';
      }
    }

    if (personalizedConfig.transcriber && !personalizedConfig.transcriber.provider) {
      personalizedConfig.transcriber.provider = 'deepgram';
    }

    // Build clean config without invalid fields like variableValues, metadata, functions
    const cleanConfig = {
      model: modelWithTools,
      voice: personalizedConfig.voice,
      transcriber: personalizedConfig.transcriber,
      firstMessage: personalizedConfig.firstMessage,
      maxDurationSeconds: personalizedConfig.maxDurationSeconds,
      silenceTimeoutSeconds: personalizedConfig.silenceTimeoutSeconds,
      backgroundSound: personalizedConfig.backgroundSound || "off",
      clientMessages: Array.isArray(personalizedConfig.clientMessages)
        ? personalizedConfig.clientMessages
        : ["transcript", "model-output", "hang", "function-call-result", "tool-calls", "tool-calls-result", "speech-update", "conversation-update"]
      // NOTE: Do not include variableValues, metadata, or functions here - they are invalid for inline configs
    };

    console.log('🔍 VAPI Configuration Debug:', {
      modelProvider: cleanConfig.model?.provider,
      modelName: cleanConfig.model?.model,
      voiceProvider: cleanConfig.voice?.provider,
      voiceId: cleanConfig.voice?.voiceId,
      transcriberProvider: cleanConfig.transcriber?.provider,
      hasFirstMessage: !!cleanConfig.firstMessage,
      maxDuration: cleanConfig.maxDurationSeconds,
      toolsCount: ('tools' in (cleanConfig.model || {}) ? (cleanConfig.model as { tools: Record<string, unknown>[] }).tools?.length : 0) || 0,
      clientMessagesCount: cleanConfig.clientMessages?.length || 0
    });

    try {
      const finalConfig = cleanAndValidateVapiConfig(cleanConfig);
      console.log('✅ VAPI configuration cleaned and validated successfully');
      return NextResponse.json(finalConfig);
    } catch (validationError) {
      console.error('❌ VAPI configuration validation failed:', validationError);
      return NextResponse.json(
        {
          error: validationError instanceof Error ? validationError.message : 'Invalid VAPI configuration',
          details: validationError instanceof Error ? validationError.message : undefined
        },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json({
      id: assistantId,
      ...personalizedConfig,
      personalized: true,
      userProfile: userProfile,
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
 } catch (error) {
    console.error('[VAPI Assistant] Error in getPersonalizedAssistant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error generating assistant config', stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}

/**
 * Endpoint to create a new Vapi assistant
 */
export async function POST(req: NextRequest) {
  try {
    // Check for required VAPI environment variables
    const requiredEnvVars = ['VAPI_API_KEY', 'VAPI_ORG_ID'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('[VAPI Assistant] Missing required environment variables:', missingVars);
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Missing VAPI configuration' },
        { status: 500 }
      );
    }

    const session = await getAuthSession();
    console.log('[VAPI Assistant] Session check:', { 
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    });
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    if (searchParams.get('personalized') === 'true') {
      return getPersonalizedAssistant(req, session);
    }
    
    const config = await req.json();
    const assistant = await createAssistant(config as Record<string, unknown>);

    await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        assistantId: assistant.id
      },
      update: {
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

export async function GET(req: NextRequest) {
  try {
    // Check for required VAPI environment variables
    const requiredEnvVars = ['VAPI_API_KEY', 'VAPI_ORG_ID'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('[VAPI Assistant] Missing required environment variables:', missingVars);
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Missing VAPI configuration' },
        { status: 500 }
      );
    }

    const session = await getAuthSession();
    console.log('[VAPI Assistant GET] Session check:', { 
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    });
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    if (searchParams.get('personalized') === 'true') {
      return getPersonalizedAssistant(req, session);
    }
    
    let assistantId = searchParams.get('id');

    if (!assistantId) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { 
          profile: {
            select: { assistantId: true }
          }
        }
      });
      assistantId = user?.profile?.assistantId || null;
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
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let assistantId = searchParams.get('id');

    if (!assistantId) {
      // Get from user profile if not provided
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { 
          profile: {
            select: { assistantId: true }
          }
        }
      });
      
      assistantId = user?.profile?.assistantId || null;
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
