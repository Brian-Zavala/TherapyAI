import { getAuthSession } from '@/lib/auth'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';

export async function POST() {
  const session = await getAuthSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Find all completed sessions with 60-minute duration
    const sessionsToFix = await prisma.session.findMany({
      where: {
        userId: user.id,
        status: 'COMPLETED',
        duration: 60
      },
      include: {
        transcriptEntries: true
      }
    });
    
    console.log(`Found ${sessionsToFix.length} sessions with 60-minute duration to fix`);
    
    const fixedSessions = [];
    
    for (const session of sessionsToFix) {
      // Calculate more accurate duration based on transcript
      let estimatedDuration = 1;
      
      if (session.transcriptEntries.length > 0) {
        // Count total words in transcript
        const totalWords = session.transcriptEntries.reduce((sum, entry) => {
          return sum + (entry.text || '').split(' ').length;
        }, 0);
        
        // Estimate based on average speaking rate (120-150 words per minute)
        const durationByWords = Math.ceil(totalWords / 120);
        
        // Also consider number of exchanges (assume 2-3 exchanges per minute)
        const durationByExchanges = Math.ceil(session.transcriptEntries.length / 2.5);
        
        // Use the higher estimate
        estimatedDuration = Math.max(1, Math.max(durationByWords, durationByExchanges));
        
        // If session has start and end times, use those for most accurate calculation
        if (session.startTime && session.endTime) {
          const startTime = new Date(session.startTime);
          const endTime = new Date(session.endTime);
          const durationMs = endTime.getTime() - startTime.getTime();
          const calculatedDuration = Math.max(1, Math.round(durationMs / (1000 * 60)));
          
          // Only use calculated duration if it seems reasonable (not days long)
          if (calculatedDuration < 480) { // Max 8 hours
            estimatedDuration = calculatedDuration;
          }
        }
      }
      
      // Update session with new duration if it's different from 60
      if (estimatedDuration !== 60) {
        await prisma.session.update({
          where: { id: session.id },
          data: { duration: estimatedDuration }
        });
        
        fixedSessions.push({
          id: session.id,
          oldDuration: 60,
          newDuration: estimatedDuration,
          transcriptCount: session.transcriptEntries.length
        });
      }
    }
    
    return NextResponse.json({
      message: `Fixed ${fixedSessions.length} sessions`,
      sessions: fixedSessions
    });
    
  } catch (error) {
    console.error('Error fixing session durations:', error);
    return NextResponse.json(
      { error: 'Failed to fix session durations' },
      { status: 500 }
    );
  }
}