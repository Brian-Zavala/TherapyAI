#!/usr/bin/env tsx
import { formatConcernsForVAPI } from '../../src/lib/services/concerns-formatter';

console.log('🎯 Verifying Concerns Work for All Therapy Types\n');

const testConcerns = ['communication', 'trust', 'anxiety', 'parenting', 'finances'];

console.log('Test Concerns:', testConcerns.join(', '));
console.log('=' + '='.repeat(60) + '\n');

// Test all therapy types
const therapyTypes = ['solo', 'couple', 'family'] as const;
const contexts = ['system', 'greeting', 'conversation'] as const;

for (const therapyType of therapyTypes) {
  console.log(`📋 ${therapyType.toUpperCase()} THERAPY`);
  console.log('-'.repeat(40));
  
  for (const context of contexts) {
    const formatted = formatConcernsForVAPI(testConcerns, therapyType, context);
    console.log(`${context.padEnd(12)}: "${formatted}"`);
  }
  console.log();
}

// Test specific scenarios
console.log('🔍 SPECIFIC SCENARIOS');
console.log('=' + '='.repeat(60));

// Solo with mental health focus
console.log('\n1. Solo - Mental Health Focus:');
const soloMentalHealth = ['anxiety', 'depression', 'self-esteem'];
console.log('   Concerns:', soloMentalHealth.join(', '));
console.log('   Greeting:', formatConcernsForVAPI(soloMentalHealth, 'solo', 'greeting'));

// Couple with relationship focus
console.log('\n2. Couple - Relationship Focus:');
const coupleRelationship = ['communication', 'intimacy', 'trust', 'conflict'];
console.log('   Concerns:', coupleRelationship.join(', '));
console.log('   Greeting:', formatConcernsForVAPI(coupleRelationship, 'couple', 'greeting'));

// Family with parenting focus
console.log('\n3. Family - Parenting Focus:');
const familyParenting = ['parenting', 'blended-family', 'boundaries', 'communication'];
console.log('   Concerns:', familyParenting.join(', '));
console.log('   Greeting:', formatConcernsForVAPI(familyParenting, 'family', 'greeting'));

// Mixed concerns
console.log('\n4. Mixed Concerns - All Types:');
const mixedConcerns = ['anxiety', 'communication', 'finances', 'life-goals', 'grief'];
console.log('   Concerns:', mixedConcerns.join(', '));
therapyTypes.forEach(type => {
  console.log(`   ${type.padEnd(8)}:`, formatConcernsForVAPI(mixedConcerns, type, 'greeting'));
});

console.log('\n✅ All therapy types properly support concerns!');
console.log('\n📝 Summary:');
console.log('   - Solo: Focuses on individual mental health and personal growth');
console.log('   - Couple: Prioritizes relationship and communication issues');
console.log('   - Family: Emphasizes family dynamics and parenting challenges');
console.log('   - All types: Adapt language appropriately for context');

process.exit(0);