import { getAuthSession } from '@/lib/auth'
/**
 * Session Conflicts API Route
 * Checks for scheduling conflicts with existing sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-optimized';
import { z } from 'zod';
import { addMinutes, isWithinInterval, parseISO } from 'date-fns';

// Validation schema for conflict checking
const ConflictCheckSchema = z.object({
  date: z.string().datetime(),
  duration: z.number().min(15).max(240), // 15 mins to 4 hours
  timeSlots: z.array(z.string().datetime())
});

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ConflictCheckSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: validation.error.errors 
      }, { status: 400 });
    }

    const { date, duration, timeSlots } = validation.data;
    const conflicts: string[] = [];

    // Check conflicts with existing sessions only
    const existingSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ['SCHEDULED', 'ACTIVE', 'PAUSED']
        },
        date: {
          gte: new Date(date),
          lt: addMinutes(new Date(date), 24 * 60) // Same day
        }
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        duration: true,
        status: true
      }
    });

    // Check each time slot for conflicts
    for (const slotTime of timeSlots) {
      const slotStart = parseISO(slotTime);
      const slotEnd = addMinutes(slotStart, duration);

      // Check against existing sessions
      for (const existingSession of existingSessions) {
        const sessionStart = existingSession.startTime || existingSession.date;
        const sessionEnd = addMinutes(sessionStart, existingSession.duration);

        // Check if times overlap
        const overlaps = 
          isWithinInterval(slotStart, { start: sessionStart, end: sessionEnd }) ||
          isWithinInterval(slotEnd, { start: sessionStart, end: sessionEnd }) ||
          isWithinInterval(sessionStart, { start: slotStart, end: slotEnd }) ||
          isWithinInterval(sessionEnd, { start: slotStart, end: slotEnd });

        if (overlaps) {
          conflicts.push(slotTime);
          break; // No need to check other sessions for this slot
        }
      }
    }

    // Check for buffer time preferences (optional enhancement)
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        sessionPreference: true
      }
    });

    // Could add buffer time logic here in the future
    // For example, 15 minutes before and after each session

    // Remove duplicates from conflicts array
    const uniqueConflicts = [...new Set(conflicts)];

    return NextResponse.json({
      conflicts: uniqueConflicts,
      totalChecked: timeSlots.length,
      hasConflicts: uniqueConflicts.length > 0
    });

  } catch (error) {
    console.error('Failed to check session conflicts:', error);
    return NextResponse.json({
      error: 'Failed to check session conflicts',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}