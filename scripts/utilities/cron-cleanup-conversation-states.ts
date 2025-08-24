#!/usr/bin/env node
/**
 * Cron script to trigger conversation state cleanup
 * This script is designed to be run by Railway's cron job feature
 * It calls the cleanup API endpoint and exits after completion
 */

async function runCleanup() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret) {
    console.error('❌ CRON_SECRET environment variable is not set')
    process.exit(1)
  }
  
  const url = `${baseUrl}/api/cron/cleanup-conversation-states`
  
  console.log(`🧹 Starting conversation state cleanup...`)
  console.log(`📍 Target URL: ${url}`)
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Cleanup completed successfully')
      console.log(`📊 Deleted ${result.deletedStates} states and ${result.deletedMessages} messages`)
      console.log(`⏱️  Duration: ${result.duration}ms`)
      process.exit(0)
    } else {
      console.error('❌ Cleanup failed:', result.error)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Failed to run cleanup:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Run the cleanup
runCleanup().catch(error => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})