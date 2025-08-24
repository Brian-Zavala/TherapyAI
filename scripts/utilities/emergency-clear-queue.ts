#!/usr/bin/env tsx
/**
 * Emergency script to clear all jobs from Redis queue
 * Run with: npm run emergency:clear-queue
 */

import { Redis } from '@upstash/redis'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function clearQueue() {
  console.log('🚨 EMERGENCY: Clearing all jobs from Redis queue...')
  
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('❌ Redis not configured - no queue to clear')
    return
  }
  
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    
    // Get all jobs
    const jobs = await redis.zrange('job_queue', 0, -1)
    console.log(`Found ${jobs.length} jobs in queue`)
    
    // Remove all jobs
    if (jobs.length > 0) {
      await redis.del('job_queue')
      console.log('✅ All jobs cleared from Redis queue')
    }
    
    // Also clear any other potential job-related keys
    const keys = await redis.keys('*welcome*')
    if (keys.length > 0) {
      console.log(`Found ${keys.length} welcome-related keys, clearing...`)
      for (const key of keys) {
        await redis.del(key)
      }
    }
    
    console.log('✅ Queue cleared successfully')
  } catch (error) {
    console.error('❌ Error clearing queue:', error)
  }
}

// Run immediately
clearQueue()