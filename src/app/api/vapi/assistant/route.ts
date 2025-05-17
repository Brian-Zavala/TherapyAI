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
          familyMember4Age: true
        }
      });
      
      assistantId = user?.assistantId || null;
      
      // If creating a personalized assistant is requested
      if (searchParams.get('personalized') === 'true' && user) {
        // Import the personalized assistant function
        const { getPersonalizedAssistantConfig } = await import('@/lib/vapi');
        
        // Create a personalized assistant config based on user profile
        const personalizedConfig = getPersonalizedAssistantConfig({
          userName: user.name,
          userAge: user.age,
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
          familyMember4Age: user.familyMember4Age
        });
        
        // Return the personalized config without creating an actual assistant
        return NextResponse.json({
          id: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID, // Use default ID
          ...personalizedConfig,
          personalized: true
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