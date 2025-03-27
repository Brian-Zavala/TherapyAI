// src/app/api/sessions/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const authSession = await getServerSession(authOptions);
  
  if (!authSession?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { 
        email: authSession.user.email as string 
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    const { date, duration = 60, theme = 'AI Therapy Session', notes = '' } = await request.json();
    
    // Using the exact field names from your schema
   // For debugging: Use any to bypass type checking temporarily
const newSession = await (prisma.session as any).create({
  data: {
    userId: user.id,
    date: new Date(date),
    duration: Number(duration),
    theme,
    notes,
    status: 'scheduled'
  }
});
    
    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' }, 
      { status: 500 }
    );
  }
}