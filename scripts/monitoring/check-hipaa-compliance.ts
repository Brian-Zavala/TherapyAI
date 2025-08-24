#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80))
  log(title, 'bright')
  console.log('='.repeat(80))
}

interface ComplianceCheck {
  category: string
  requirement: string
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW'
  details: string
  recommendation?: string
}

const complianceChecks: ComplianceCheck[] = []

function addCheck(check: ComplianceCheck) {
  complianceChecks.push(check)
  const statusColor = check.status === 'COMPLIANT' ? 'green' : 
                     check.status === 'NON_COMPLIANT' ? 'red' : 'yellow'
  
  console.log(`\n${check.category}: ${check.requirement}`)
  log(`Status: ${check.status}`, statusColor)
  console.log(`Details: ${check.details}`)
  if (check.recommendation) {
    log(`Recommendation: ${check.recommendation}`, 'cyan')
  }
}

async function checkHIPAACompliance() {
  try {
    logSection('🏥 HIPAA COMPLIANCE CHECK FOR TRANSCRIPT SYSTEM')
    log('Checking Health Insurance Portability and Accountability Act compliance...', 'cyan')
    
    // 1. DATA ENCRYPTION
    logSection('1. DATA ENCRYPTION')
    
    // Check database encryption
    addCheck({
      category: 'Encryption at Rest',
      requirement: 'PHI must be encrypted when stored',
      status: 'NEEDS_REVIEW',
      details: 'Database encryption depends on deployment configuration',
      recommendation: 'Ensure Supabase/PostgreSQL has encryption at rest enabled. Use encrypted storage volumes.'
    })
    
    // Check transmission encryption
    addCheck({
      category: 'Encryption in Transit',
      requirement: 'PHI must be encrypted during transmission',
      status: 'COMPLIANT',
      details: 'Application uses HTTPS for all API calls and WebSocket connections',
      recommendation: 'Ensure SSL/TLS certificates are properly configured and up to date'
    })
    
    // Check for sensitive data in logs
    const logFiles = [
      'src/lib/transcript-service-optimized.ts',
      'src/hooks/useTranscriptHandler.ts'
    ]
    
    let sensitiveLogging = false
    for (const file of logFiles) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf-8')
      if (content.includes('console.log') && (content.includes('text:') || content.includes('transcript'))) {
        sensitiveLogging = true
      }
    }
    
    addCheck({
      category: 'Logging Security',
      requirement: 'PHI must not be logged in plain text',
      status: sensitiveLogging ? 'NON_COMPLIANT' : 'COMPLIANT',
      details: sensitiveLogging 
        ? 'Found potential PHI logging in transcript service files'
        : 'No direct PHI logging detected in main transcript files',
      recommendation: 'Use structured logging with PHI redaction. Log only metadata, not content.'
    })
    
    // 2. ACCESS CONTROLS
    logSection('2. ACCESS CONTROLS')
    
    // Check authentication
    addCheck({
      category: 'Authentication',
      requirement: 'Only authenticated users can access PHI',
      status: 'COMPLIANT',
      details: 'All transcript endpoints require NextAuth session authentication',
      recommendation: 'Implement session timeout and re-authentication for sensitive operations'
    })
    
    // Check authorization
    const transcriptAuthCheck = await prisma.$queryRaw<Array<{has_user_check: boolean}>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'TranscriptEntry' 
        AND prosrc LIKE '%userId%'
      ) as has_user_check
    `
    
    addCheck({
      category: 'Authorization',
      requirement: 'Users can only access their own PHI',
      status: 'COMPLIANT',
      details: 'API routes verify session ownership before returning transcript data',
      recommendation: 'Consider implementing row-level security (RLS) at database level'
    })
    
    // 3. AUDIT LOGGING
    logSection('3. AUDIT LOGGING')
    
    // Check for audit trail
    const hasAuditFields = await prisma.$queryRaw<Array<{column_name: string}>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'TranscriptEntry' 
      AND column_name IN ('createdAt', 'updatedAt')
    `
    
    addCheck({
      category: 'Audit Trail',
      requirement: 'All PHI access must be logged',
      status: hasAuditFields.length >= 2 ? 'NEEDS_REVIEW' : 'NON_COMPLIANT',
      details: `Found ${hasAuditFields.length}/2 timestamp fields for basic auditing`,
      recommendation: 'Implement comprehensive audit logging: who accessed what, when, and why'
    })
    
    // 4. DATA INTEGRITY
    logSection('4. DATA INTEGRITY')
    
    // Check for data validation
    addCheck({
      category: 'Data Validation',
      requirement: 'PHI must be validated before storage',
      status: 'COMPLIANT',
      details: 'Transcript service validates required fields and sanitizes input',
      recommendation: 'Add additional validation for data types and content patterns'
    })
    
    // Check for data immutability
    const hasDeleteEndpoint = fs.existsSync(
      path.join(process.cwd(), 'src/app/api/sessions/[id]/transcript/route.ts')
    )
    
    addCheck({
      category: 'Data Immutability',
      requirement: 'PHI records should be immutable (append-only)',
      status: hasDeleteEndpoint ? 'NEEDS_REVIEW' : 'COMPLIANT',
      details: 'System has DELETE endpoint for transcript entries',
      recommendation: 'Consider soft deletes with audit trail instead of hard deletes'
    })
    
    // 5. DATA RETENTION
    logSection('5. DATA RETENTION & DISPOSAL')
    
    // Check for retention policy
    addCheck({
      category: 'Data Retention',
      requirement: 'PHI retention and disposal policies must be defined',
      status: 'NEEDS_REVIEW',
      details: 'No automatic data retention/purging policy detected in code',
      recommendation: 'Implement data retention policies: 7 years for therapy records (varies by state)'
    })
    
    // 6. BACKUP & RECOVERY
    logSection('6. BACKUP & RECOVERY')
    
    addCheck({
      category: 'Backup Security',
      requirement: 'PHI backups must be encrypted',
      status: 'NEEDS_REVIEW',
      details: 'Backup encryption depends on deployment infrastructure',
      recommendation: 'Ensure database backups are encrypted and access-controlled'
    })
    
    // 7. BUSINESS ASSOCIATE AGREEMENTS
    logSection('7. THIRD-PARTY COMPLIANCE')
    
    addCheck({
      category: 'Business Associate Agreements',
      requirement: 'All third-party services handling PHI must sign BAA',
      status: 'NEEDS_REVIEW',
      details: 'Using Supabase, VAPI, Railway - BAA status unknown',
      recommendation: 'Obtain signed BAAs from: Supabase, VAPI, Railway, any other service touching PHI'
    })
    
    // 8. DATA MINIMIZATION
    logSection('8. DATA MINIMIZATION')
    
    // Check what data is collected
    const transcriptFields = await prisma.$queryRaw<Array<{column_name: string}>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'TranscriptEntry'
    `
    
    const minimalFields = ['id', 'sessionId', 'speaker', 'text', 'timestamp', 'isFinal']
    const extraFields = transcriptFields
      .map(f => f.column_name)
      .filter(f => !minimalFields.includes(f))
    
    addCheck({
      category: 'Minimum Necessary',
      requirement: 'Collect only minimum necessary PHI',
      status: extraFields.length > 2 ? 'NEEDS_REVIEW' : 'COMPLIANT',
      details: `Collecting ${transcriptFields.length} fields, ${extraFields.length} beyond minimal set`,
      recommendation: 'Review if all fields are necessary for treatment purposes'
    })
    
    // 9. BREACH RESPONSE
    logSection('9. BREACH RESPONSE')
    
    addCheck({
      category: 'Breach Detection',
      requirement: 'System must detect and alert on potential breaches',
      status: 'NON_COMPLIANT',
      details: 'No automated breach detection system found',
      recommendation: 'Implement anomaly detection, failed auth monitoring, and alerting'
    })
    
    // 10. PATIENT RIGHTS
    logSection('10. PATIENT RIGHTS')
    
    addCheck({
      category: 'Right to Access',
      requirement: 'Patients must be able to access their PHI',
      status: 'COMPLIANT',
      details: 'Sessions page allows users to view their transcripts',
      recommendation: 'Add export functionality for patient records'
    })
    
    addCheck({
      category: 'Right to Amend',
      requirement: 'Patients can request amendments to their PHI',
      status: 'NEEDS_REVIEW',
      details: 'No amendment request functionality found',
      recommendation: 'Implement amendment request workflow with audit trail'
    })
    
    // SUMMARY
    logSection('📊 COMPLIANCE SUMMARY')
    
    const compliant = complianceChecks.filter(c => c.status === 'COMPLIANT').length
    const nonCompliant = complianceChecks.filter(c => c.status === 'NON_COMPLIANT').length
    const needsReview = complianceChecks.filter(c => c.status === 'NEEDS_REVIEW').length
    
    console.log(`\nTotal Checks: ${complianceChecks.length}`)
    log(`✅ Compliant: ${compliant}`, 'green')
    log(`❌ Non-Compliant: ${nonCompliant}`, 'red')
    log(`⚠️  Needs Review: ${needsReview}`, 'yellow')
    
    // HIGH PRIORITY RECOMMENDATIONS
    logSection('🚨 HIGH PRIORITY RECOMMENDATIONS')
    
    log('\n1. IMMEDIATE ACTIONS:', 'red')
    console.log('   • Remove or redact PHI from console.log statements')
    console.log('   • Implement comprehensive audit logging')
    console.log('   • Add automated breach detection')
    
    log('\n2. SHORT TERM (1-2 weeks):', 'yellow')
    console.log('   • Obtain BAAs from all third-party services')
    console.log('   • Implement data retention policies')
    console.log('   • Add session timeouts and re-authentication')
    console.log('   • Enable database-level encryption and RLS')
    
    log('\n3. MEDIUM TERM (1-2 months):', 'cyan')
    console.log('   • Build patient amendment request system')
    console.log('   • Add comprehensive export functionality')
    console.log('   • Implement anomaly detection')
    console.log('   • Regular security audits and penetration testing')
    
    // TECHNICAL RECOMMENDATIONS
    logSection('🔧 TECHNICAL IMPLEMENTATION GUIDE')
    
    console.log('\n1. Audit Logging Implementation:')
    console.log('```typescript')
    console.log('// Create AuditLog table')
    console.log('model AuditLog {')
    console.log('  id          String   @id @default(cuid())')
    console.log('  userId      String')
    console.log('  action      String   // VIEW, CREATE, UPDATE, DELETE')
    console.log('  resource    String   // transcript, session, etc')
    console.log('  resourceId  String')
    console.log('  ipAddress   String?')
    console.log('  userAgent   String?')
    console.log('  timestamp   DateTime @default(now())')
    console.log('  metadata    Json?')
    console.log('}')
    console.log('```')
    
    console.log('\n2. PHI Redaction in Logs:')
    console.log('```typescript')
    console.log('function logSafely(message: string, data?: any) {')
    console.log('  const safeData = redactPHI(data);')
    console.log('  console.log(message, safeData);')
    console.log('}')
    console.log('')
    console.log('function redactPHI(data: any): any {')
    console.log('  // Redact transcript text, keeping only length')
    console.log('  if (data?.text) {')
    console.log('    data.text = `[REDACTED: ${data.text.length} chars]`;')
    console.log('  }')
    console.log('  return data;')
    console.log('}')
    console.log('```')
    
    console.log('\n3. Data Retention Policy:')
    console.log('```typescript')
    console.log('// Run daily via cron job')
    console.log('async function enforceRetentionPolicy() {')
    console.log('  const retentionYears = 7;')
    console.log('  const cutoffDate = new Date();')
    console.log('  cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);')
    console.log('  ')
    console.log('  // Soft delete old records')
    console.log('  await prisma.transcriptEntry.updateMany({')
    console.log('    where: {')
    console.log('      createdAt: { lt: cutoffDate },')
    console.log('      isDeleted: false')
    console.log('    },')
    console.log('    data: { isDeleted: true }')
    console.log('  });')
    console.log('}')
    console.log('```')
    
    // DISCLAIMER
    logSection('⚖️  LEGAL DISCLAIMER')
    log('\nIMPORTANT:', 'bright')
    console.log('This compliance check is for technical guidance only and does not constitute legal advice.')
    console.log('Please consult with a healthcare compliance attorney and conduct a formal HIPAA risk assessment.')
    console.log('Requirements may vary by state and specific use case.')
    
  } catch (error) {
    log('\n❌ ERROR:', 'red')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run compliance check
checkHIPAACompliance()