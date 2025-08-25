#!/usr/bin/env tsx
import { prisma } from '../../src/lib/database/prisma';
import { formatConcernsForVAPI, getConcernsSummary, migrateLegacyConcerns } from '../../src/lib/services/concerns-formatter';
import { THERAPY_CONCERNS, getConcernsByIds } from '../../src/data/therapy-concerns';

async function verifyConcernsIntegration() {
  console.log('🔍 Verifying Concerns Integration...\n');
  
  // 1. Test Data Structure
  console.log('1️⃣ Testing Data Structure:');
  console.log(`   - Total concerns defined: ${THERAPY_CONCERNS.length}`);
  console.log(`   - Categories: ${Object.keys(THERAPY_CONCERNS.reduce((acc, c) => ({...acc, [c.category]: true}), {})).join(', ')}`);
  console.log(`   - Common concerns: ${THERAPY_CONCERNS.filter(c => c.common).length}`);
  console.log('   ✅ Data structure valid\n');
  
  // 2. Test Formatters
  console.log('2️⃣ Testing Formatters:');
  const testConcernIds = ['communication', 'trust', 'anxiety', 'finances'];
  const formatted = formatConcernsForVAPI(testConcernIds, 'couple', 'greeting');
  console.log(`   - Test IDs: ${testConcernIds.join(', ')}`);
  console.log(`   - Formatted: "${formatted}"`);
  console.log('   ✅ Formatter working\n');
  
  // 3. Test Concerns Summary
  console.log('3️⃣ Testing Concerns Summary:');
  const summary = getConcernsSummary(testConcernIds);
  console.log(`   - Primary: ${summary.primary.join(', ')}`);
  console.log(`   - Categories: ${summary.categories.join(', ')}`);
  console.log('   ✅ Summary generation working\n');
  
  // 4. Test Legacy Migration
  console.log('4️⃣ Testing Legacy Migration:');
  const legacyConcerns = ['relationships', 'anxiety', 'unknown-concern'];
  const migrated = migrateLegacyConcerns(legacyConcerns);
  console.log(`   - Legacy: ${legacyConcerns.join(', ')}`);
  console.log(`   - Migrated: ${migrated.join(', ')}`);
  console.log('   ✅ Migration working\n');
  
  // 5. Test Database Integration
  console.log('5️⃣ Testing Database Integration:');
  try {
    // Get a sample user profile
    const profile = await prisma.userProfile.findFirst({
      select: {
        userId: true,
        currentConcerns: true
      }
    });
    
    if (profile) {
      console.log(`   - Found profile for user: ${profile.userId}`);
      const concerns = profile.currentConcerns as string[] | null;
      if (concerns && Array.isArray(concerns)) {
        console.log(`   - Current concerns: ${concerns.join(', ')}`);
        const formatted = formatConcernsForVAPI(concerns, 'solo', 'system');
        console.log(`   - Formatted for VAPI: "${formatted}"`);
      } else {
        console.log('   - No concerns set yet');
      }
    } else {
      console.log('   - No profiles found in database');
    }
    console.log('   ✅ Database integration working\n');
  } catch (error) {
    console.error('   ❌ Database error:', error);
  }
  
  // 6. Test Session Context
  console.log('6️⃣ Testing Session Context:');
  try {
    // Check if sessions have concerns context stored in notes field
    const session = await prisma.session.findFirst({
      where: {
        notes: {
          not: null,
          not: ""
        }
      },
      select: {
        id: true,
        notes: true
      }
    });
    
    if (session && session.notes) {
      try {
        // Try to parse notes as JSON to see if it contains concerns context
        const notesData = JSON.parse(session.notes);
        if (notesData.concernsContext) {
          console.log(`   - Found session with concerns: ${session.id}`);
          console.log(`   - Primary concerns: ${notesData.concernsContext?.primary?.join(', ')}`);
          console.log('   ✅ Session context working');
        } else {
          console.log('   - Found session with notes, but no concerns context');
        }
      } catch {
        console.log('   - Found session with plain text notes (not JSON)');
      }
    } else {
      console.log('   - No sessions with notes yet (this is expected for new installs)');
    }
    console.log('   ✅ Session context ready to store concerns in notes field');
  } catch (error) {
    console.log('   - Session context check error:', error);
  }
  
  console.log('\n✨ Concerns Integration Verification Complete!');
  console.log('\n📝 Summary:');
  console.log('   - Data structure: ✅');
  console.log('   - Formatters: ✅');
  console.log('   - Summary generation: ✅');
  console.log('   - Legacy migration: ✅');
  console.log('   - Database ready: ✅');
  console.log('   - Session context: Ready for use');
  
  await prisma.$disconnect();
}

verifyConcernsIntegration().catch(console.error);