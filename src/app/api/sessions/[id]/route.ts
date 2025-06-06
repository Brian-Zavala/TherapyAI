// app/api/sessions/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { generateMetricsFromSession } from './metrics-helper'
import { sessionCache, cacheKeys } from '@/lib/session-cache'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const { id: sessionId } = await params
    
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
    
    // Check cache first
    const cacheKey = cacheKeys.sessionDetails(sessionId);
    const cachedSession = sessionCache.get<{userId: string, transcriptEntries: unknown[]}>(cacheKey);
    
    if (cachedSession && cachedSession.userId === user.id) {
      console.log(`Returning cached session ${sessionId}`);
      return NextResponse.json(cachedSession);
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
    
    // Cache the session
    sessionCache.set(cacheKey, therapySession, 5 * 60 * 1000); // Cache for 5 minutes
    
    return NextResponse.json(therapySession)
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' }, 
      { status: 500 }
    )
  }
}

// Rate limiting map to prevent too frequent updates per session
const updateRateLimit = new Map<string, number>();
const RATE_LIMIT_MS = 5000; // 5 seconds between updates per session

// Handle both PATCH and POST requests for session updates
// POST is used by sendBeacon for beforeunload saves
async function handleSessionUpdate(
  request: Request,
  params: Promise<{ id: string }>
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: sessionId } = await params
  
  // Rate limiting for conversation time updates to prevent database hammering
  const now = Date.now();
  const lastUpdate = updateRateLimit.get(sessionId) || 0;
  const timeSinceLastUpdate = now - lastUpdate;
  
  console.log(`🔄 Processing update for session ${sessionId} (${timeSinceLastUpdate}ms since last update)`)

  try {
    // Parse request body with error handling
    let requestData;
    try {
      requestData = await request.json();
    } catch (jsonError) {
      console.error('❌ JSON parsing error for session:', sessionId, jsonError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { status, notes, transcript, transcriptEntry, duration, conversationTimeSeconds, lastConversationStart, isPaused } = requestData;
    
    // Rate limit conversation time updates to prevent database hammering
    const isConversationTimeUpdate = conversationTimeSeconds !== undefined || lastConversationStart !== undefined || isPaused !== undefined;
    if (isConversationTimeUpdate && timeSinceLastUpdate < RATE_LIMIT_MS && !status && !transcriptEntry) {
      console.log(`⏸️ Rate limiting conversation time update for session ${sessionId} (last update ${timeSinceLastUpdate}ms ago)`);
      // Return success without actually updating to prevent client errors
      return NextResponse.json({ rateLimited: true, sessionId, timeSinceLastUpdate });
    }
    
    // Update rate limit tracker for this attempt
    updateRateLimit.set(sessionId, now);
    
    console.log(`📝 PATCH SESSION ${sessionId} - Request data:`, {
      status,
      notes: notes ? `${notes.substring(0, 50)}...` : undefined,
      transcript: transcript ? `${transcript.substring(0, 50)}...` : undefined,
      transcriptEntry: transcriptEntry ? `${transcriptEntry.speaker}: ${transcriptEntry.text?.substring(0, 30)}...` : undefined,
      duration,
      conversationTimeSeconds,
      lastConversationStart,
      isPaused
    });
    
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
    
    const updateData: Record<string, unknown> = {}
    
    // Update status if provided
    if (status) {
      updateData.status = status
      // Set startTime when session becomes active
      if (status === 'active' && !existingSession.startTime) {
        updateData.startTime = new Date()
      }
    }
    
    // Update notes if provided
    if (notes !== undefined) {
      updateData.notes = notes
    }
    
    // Update legacy transcript field if provided (for backward compatibility)
    if (transcript !== undefined) {
      updateData.transcript = transcript
    }
    
    // Update duration if provided
    if (duration !== undefined) {
      updateData.duration = duration
    }
    
    // Handle conversation time tracking with validation
    if (conversationTimeSeconds !== undefined) {
      try {
        if (typeof conversationTimeSeconds === 'string' && conversationTimeSeconds.startsWith('ADD_')) {
          // Special instruction to add to existing conversation time
          const additionalSeconds = parseInt(conversationTimeSeconds.substring(4))
          if (isNaN(additionalSeconds)) {
            console.error(`❌ Invalid additional seconds: ${conversationTimeSeconds}`);
            return NextResponse.json({ error: 'Invalid conversation time format' }, { status: 400 });
          }
          const currentTime = existingSession.conversationTimeSeconds || 0
          updateData.conversationTimeSeconds = currentTime + additionalSeconds
          console.log(`📊 Adding ${additionalSeconds}s to conversation time. New total: ${currentTime + additionalSeconds}s`)
        } else {
          // Direct set of conversation time - validate it's a number
          const timeSeconds = typeof conversationTimeSeconds === 'string' ? parseInt(conversationTimeSeconds) : conversationTimeSeconds;
          if (isNaN(timeSeconds) || timeSeconds < 0) {
            console.error(`❌ Invalid conversation time seconds: ${conversationTimeSeconds}`);
            return NextResponse.json({ error: 'Invalid conversation time value' }, { status: 400 });
          }
          updateData.conversationTimeSeconds = timeSeconds
          console.log(`📊 Setting conversation time to ${timeSeconds}s`);
        }
      } catch (timeError) {
        console.error(`❌ Error processing conversation time:`, timeError);
        return NextResponse.json({ error: 'Failed to process conversation time' }, { status: 400 });
      }
    }
    
    // Update conversation timing fields with enhanced validation
    if (lastConversationStart !== undefined) {
      try {
        if (lastConversationStart === null) {
          updateData.lastConversationStart = null
          console.log(`📊 Setting lastConversationStart to null`);
        } else {
          // Enhanced date validation
          let startDate;
          
          if (typeof lastConversationStart === 'string') {
            // Validate ISO string format first
            if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(lastConversationStart)) {
              console.error(`❌ Invalid date string format: ${lastConversationStart}`);
              return NextResponse.json({ error: 'Invalid date string format for lastConversationStart' }, { status: 400 });
            }
            startDate = new Date(lastConversationStart);
          } else {
            startDate = new Date(lastConversationStart);
          }
          
          if (isNaN(startDate.getTime())) {
            console.error(`❌ Invalid lastConversationStart date: ${lastConversationStart} (type: ${typeof lastConversationStart})`);
            return NextResponse.json({ error: 'Invalid lastConversationStart date format' }, { status: 400 });
          }
          
          // Validate date is reasonable (not too far in past/future)
          const now = new Date();
          const hoursDiff = Math.abs(now.getTime() - startDate.getTime()) / (1000 * 60 * 60);
          if (hoursDiff > 24) {
            console.error(`❌ lastConversationStart is ${hoursDiff.toFixed(1)} hours from now, seems invalid: ${startDate.toISOString()}`);
            return NextResponse.json({ error: 'lastConversationStart timestamp is too far from current time' }, { status: 400 });
          }
          
          updateData.lastConversationStart = startDate
          console.log(`📊 Setting lastConversationStart to ${startDate.toISOString()}`);
        }
      } catch (dateError) {
        console.error(`❌ Error processing lastConversationStart:`, dateError);
        return NextResponse.json({ error: 'Failed to process conversation start time' }, { status: 400 });
      }
    }
    
    if (isPaused !== undefined) {
      if (typeof isPaused !== 'boolean') {
        console.error(`❌ Invalid isPaused value: ${isPaused} (type: ${typeof isPaused})`);
        return NextResponse.json({ error: 'isPaused must be a boolean' }, { status: 400 });
      }
      updateData.isPaused = isPaused
      console.log(`📊 Setting isPaused to ${isPaused}`);
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
    
    // Update the session with comprehensive error handling and retry logic
    let updatedSession;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`📝 Updating session ${sessionId} with data (attempt ${retryCount + 1}):`, updateData);
        
        updatedSession = await prisma.session.update({
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
        
        console.log(`✅ Successfully updated session ${sessionId} on attempt ${retryCount + 1}`);
        break; // Success, exit retry loop
        
      } catch (updateError) {
        retryCount++;
        
        console.error(`❌ DATABASE UPDATE ERROR for session ${sessionId} (attempt ${retryCount}/${maxRetries + 1}):`, {
          error: updateError,
          updateData,
          errorCode: (updateError as any)?.code,
          errorMessage: (updateError as any)?.message,
          errorMeta: (updateError as any)?.meta
        });
        
        // For certain errors, don't retry
        const errorCode = (updateError as any)?.code;
        if (errorCode === 'P2025' || errorCode === 'P2002') {
          console.log(`🚫 Non-retryable error ${errorCode}, not retrying`);
          break;
        }
        
        // If we've exhausted retries, return error
        if (retryCount > maxRetries) {
          console.error(`❌ All retry attempts exhausted for session ${sessionId}`);
          
          // Return a more specific error based on the Prisma error
          if (errorCode === 'P2002') {
            return NextResponse.json({ error: 'Database constraint violation' }, { status: 409 });
          } else if (errorCode === 'P2025') {
            return NextResponse.json({ error: 'Session not found for update' }, { status: 404 });
          } else {
            return NextResponse.json({ 
              error: 'Database update failed after retries', 
              details: (updateError as any)?.message || 'Unknown database error',
              retryCount
            }, { status: 500 });
          }
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
      }
    }
    
    // Invalidate caches
    sessionCache.invalidate(cacheKeys.sessionDetails(sessionId));
    sessionCache.invalidate(cacheKeys.userSessions(user.id));
    sessionCache.invalidate(cacheKeys.sessionTranscript(sessionId));

    // Generate metrics if session was completed
    if (status === 'completed') {
      try {
        // Determine therapy type from session theme
        let therapyType = 'couple';
        if (existingSession.theme && existingSession.theme.toLowerCase().includes('family')) {
          therapyType = 'family';
        } else if (existingSession.theme && (existingSession.theme.toLowerCase().includes('individual') || existingSession.theme.toLowerCase().includes('solo'))) {
          therapyType = 'solo';
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
            therapyType,
            existingSession.assistantId || undefined
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
    console.error(`❌ UNEXPECTED ERROR updating session ${sessionId}:`, {
      error,
      errorName: (error as any)?.name,
      errorMessage: (error as any)?.message,
      errorStack: (error as any)?.stack,
      userEmail: session.user?.email,
      sessionId
    });
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update session',
        sessionId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleSessionUpdate(request, params);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleSessionUpdate(request, params);
}

