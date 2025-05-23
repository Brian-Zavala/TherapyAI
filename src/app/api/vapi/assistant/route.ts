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
          familyMember2: true,
          familyMember2Age: true,
          familyMember3: true,
          familyMember3Age: true,
          familyMember4: true,
          familyMember4Age: true,
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
        const { getPersonalizedAssistantConfig, formatSessionHistory } = await import('@/lib/vapi');
        
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
          familyMember2: user.familyMember2,
          familyMember2Age: user.familyMember2Age,
          familyMember3: user.familyMember3,
          familyMember3Age: user.familyMember3Age,
          familyMember4: user.familyMember4,
          familyMember4Age: user.familyMember4Age,
          therapyType: user.therapyType || searchParams.get('therapyType') || 'couple',
          currentConcerns: user.currentConcerns || [],
          communicationStyle: user.communicationStyle || 'balanced',
          sessionPreference: user.sessionPreference || 'flexible',
          additionalNotes: user.additionalNotes || '',
          sessionHistory: sessionHistory,
          // Additional context for enhanced personalization
          onboardingCompleted: user.onboardingCompleted,
          sessionsCompleted: sessions.length,
          lastSessionDate: sessions[0]?.date || null
        };
        
        // Get the therapy type from query params or user profile
        const therapyType = searchParams.get('therapyType') || user.therapyType || 'couple';
        
        // Create a personalized assistant config based on user profile
        const personalizedConfig = getPersonalizedAssistantConfig(userProfile, therapyType);
        
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
        
        // Return the personalized config without creating an actual assistant
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
            sessionCount: userProfile.sessionsCompleted
          }
        });
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