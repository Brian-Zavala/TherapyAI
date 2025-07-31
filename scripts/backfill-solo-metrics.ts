#!/usr/bin/env ts-node

import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillSoloMetrics() {
  try {
    console.log('Starting backfill for solo session metrics...');
    
    // Find all completed solo sessions without metrics
    const soloSessionsWithoutMetrics = await prisma.session.findMany({
      where: {
        sessionType: 'SOLO',
        status: 'COMPLETED',
        conversationTimeSeconds: { gt: 0 },
        communicationMetrics: {
          none: {}
        }
      },
      include: {
        communicationMetrics: true,
        progressTracking: true
      }
    });
    
    console.log(`Found ${soloSessionsWithoutMetrics.length} solo sessions without metrics`);
    
    for (const session of soloSessionsWithoutMetrics) {
      console.log(`Processing session ${session.id} for user ${session.userId}`);
      
      try {
        // Calculate metrics for this session
        const result = await calculateMetrics(session.id, session.userId);
        
        if (result.metrics) {
          console.log(`✅ Metrics calculated for session ${session.id}`);
        } else if (result.alreadyCalculated) {
          console.log(`⏭️  Metrics already exist for session ${session.id}`);
        } else {
          console.log(`❌ Failed to calculate metrics for session ${session.id}:`, result.error?.message);
        }
      } catch (error) {
        console.error(`Error processing session ${session.id}:`, error);
      }
    }
    
    // Verify results
    const totalSoloSessions = await prisma.session.count({
      where: {
        sessionType: 'SOLO',
        status: 'COMPLETED'
      }
    });
    
    const soloSessionsWithMetrics = await prisma.session.count({
      where: {
        sessionType: 'SOLO',
        status: 'COMPLETED',
        communicationMetrics: {
          some: {}
        }
      }
    });
    
    console.log('\n📊 Final Statistics:');
    console.log(`Total solo sessions: ${totalSoloSessions}`);
    console.log(`Solo sessions with metrics: ${soloSessionsWithMetrics}`);
    console.log(`Coverage: ${((soloSessionsWithMetrics / totalSoloSessions) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillSoloMetrics().catch(console.error);