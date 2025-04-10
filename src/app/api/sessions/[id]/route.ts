// app/api/sessions/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { generateMetricsFromSession } from './metrics-helper'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const sessionId = params.id
    
    console.log('Fetching session ID:', sessionId)
    
    // First, find the user by email
    let user = await prisma.user.findUnique({
      where: { 
        email: session.user.email as string 
      }
    });
    
    // Auto-create user if they don't exist in Prisma but have a valid session
    if (!user && session.user.email) {
      console.log(`Auto-creating user in database for ${session.user.email}`);
      
      try {
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || session.user.email.split('@')[0],
            password: 'SESSION_CREATED_USER', // Placeholder password
          }
        });
        console.log('User auto-created successfully:', user.id);
      } catch (createError) {
        console.error('Error auto-creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Include ALL transcript entries with the session data
    const therapySession = await prisma.session.findUnique({
      where: {
        id: sessionId
      },
      include: {
        transcriptEntries: {
          // Removed isFinal filter to include all entries
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    })
    
    if (therapySession?.transcriptEntries?.length) {
      console.log(`Fetched session ${sessionId} with ${therapySession.transcriptEntries.length} transcript entries`);
      console.log(`First entry: ${JSON.stringify(therapySession.transcriptEntries[0]).substring(0, 100)}...`);
      console.log(`Last entry: ${JSON.stringify(therapySession.transcriptEntries[therapySession.transcriptEntries.length-1]).substring(0, 100)}...`);
    } else {
      console.log(`Fetched session ${sessionId} with NO transcript entries`);
    }
    
    // Verify the session belongs to this user
    if (!therapySession || therapySession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    return NextResponse.json(therapySession)
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' }, 
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // params is not a Promise in Next.js route handlers, so we access it directly
  const sessionId = params.id
  
  console.log('Processing update for session ID:', sessionId)

  try {
    // First, find the user by email
    let user = await prisma.user.findUnique({
      where: { 
        email: session.user.email as string 
      }
    });
    
    // Auto-create user if they don't exist in Prisma but have a valid session
    if (!user && session.user.email) {
      console.log(`Auto-creating user in database for ${session.user.email}`);
      
      try {
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || session.user.email.split('@')[0],
            password: 'SESSION_CREATED_USER', // Placeholder password
          }
        });
        console.log('User auto-created successfully:', user.id);
      } catch (createError) {
        console.error('Error auto-creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Verify the session belongs to this user
    const existingSession = await prisma.session.findUnique({
      where: {
        id: sessionId
      },
      include: {
        transcriptEntries: true
      }
    })

    if (!existingSession || existingSession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { status, endTime, notes, transcript, transcriptEntry } = await request.json()
    
    const updateData: Record<string, unknown> = {}
    
    // Update status if provided
    if (status) {
      updateData.status = status
    }
    
    // Update notes if provided
    if (notes !== undefined) {
      updateData.notes = notes
    }
    
    // Update legacy transcript field if provided (for backward compatibility)
    if (transcript !== undefined) {
      updateData.transcript = transcript
    }
    
    // Calculate duration if endTime is provided and status is completed
    if (endTime && status === 'completed') {
      const endDate = new Date(endTime)
      const startDate = existingSession.date
      
      // Calculate duration in minutes
      const durationInMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
      updateData.duration = durationInMinutes
    }
    
    // Handle new transcript entry if provided
    if (transcriptEntry) {
      try {
        // Validate the transcript entry data
        if (!transcriptEntry.speaker || !transcriptEntry.text || transcriptEntry.text.trim() === '') {
          console.error(`Invalid transcript entry data for session ${sessionId}:`, transcriptEntry);
        } else {
          console.log(`SESSIONS API: Creating transcript entry for session ${sessionId}:`, 
            JSON.stringify({
              speaker: transcriptEntry.speaker,
              textLength: transcriptEntry.text.length,
              textPreview: transcriptEntry.text.substring(0, 50) + '...',
              timestamp: transcriptEntry.timestamp,
              isFinal: transcriptEntry.isFinal
            }, null, 2)
          );
          
          // Create a new transcript entry with proper error handling
          try {
            const newEntry = await prisma.transcriptEntry.create({
              data: {
                sessionId,
                speaker: transcriptEntry.speaker,
                text: transcriptEntry.text,
                timestamp: transcriptEntry.timestamp || new Date(),
                isFinal: transcriptEntry.isFinal !== undefined ? transcriptEntry.isFinal : true
              }
            });
            console.log(`SESSIONS API SUCCESS: Added transcript entry with ID ${newEntry.id} for session ${sessionId}`);
            
            // Verify the entry was created
            const verifyEntry = await prisma.transcriptEntry.findUnique({
              where: { id: newEntry.id }
            });
            
            if (verifyEntry) {
              console.log(`VERIFIED: Entry ${newEntry.id} exists in database`);
            } else {
              console.error(`VERIFICATION FAILED: Entry ${newEntry.id} not found after creation`);
            }
          } catch (createError) {
            console.error(`DATABASE ERROR creating transcript entry in sessions API:`, createError);
          }
        }
      } catch (error) {
        console.error(`Error processing transcript entry in sessions API:`, error);
      }
    }
    
    // Update the session
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        transcriptEntries: {
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    })

    // Generate metrics if session was completed
    if (status === 'completed') {
      try {
        // Determine therapy type from session theme
        let therapyType = 'couple';
        if (existingSession.theme && existingSession.theme.toLowerCase().includes('family')) {
          therapyType = 'family';
        }
        
        // Create or update metrics - first, check if metrics already exist for this session
        const existingMetrics = await prisma.progressTracking.findFirst({
          where: {
            sessionId: sessionId
          }
        });
        
        if (!existingMetrics) {
          // Get a combined transcript from structured entries if available
          let transcriptText = transcript; // Default to the passed transcript
          
          // If we have structured entries, build a string transcript from them for the metrics analysis
          if (updatedSession.transcriptEntries && updatedSession.transcriptEntries.length > 0) {
            transcriptText = updatedSession.transcriptEntries
              .map(entry => `${entry.speaker}: ${entry.text}`)
              .join('\n');
          }
          
          // No metrics exist yet, create new ones
          // Make sure we're using the database user ID, not the session user ID
          await generateMetricsFromSession(
            user.id, 
            updatedSession.duration, 
            sessionId, 
            transcriptText, 
            therapyType
          );
          
          console.log(`Generated ${therapyType} metrics for session ${sessionId}`);
        } else {
          // Metrics already exist, update them
          console.log(`Metrics already exist for session ${sessionId}, not generating new ones`);
        }
      } catch (metricsError) {
        console.error('Error generating metrics, but continuing:', metricsError)
        // Don't fail the whole request if metrics generation fails
      }
    }

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update session' },
      { status: 500 }
    )
  }
}

