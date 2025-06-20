/**
 * Supabase Client Singleton
 * Ensures only one Supabase client instance is created across the app
 * Prevents duplicate channel subscriptions and connection issues
 */

import { createClient } from '@/utils/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

/**
 * Get the singleton Supabase client instance
 * Creates one if it doesn't exist
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient()
    console.log('[Supabase Singleton] Created new client instance')
  }
  return supabaseInstance
}

/**
 * Reset the singleton instance (useful for testing or cleanup)
 * Warning: This will close all active channels
 */
export function resetSupabaseClient(): void {
  if (supabaseInstance) {
    // Remove all channels before resetting
    const channels = (supabaseInstance as any).channels || []
    channels.forEach((channel: any) => {
      supabaseInstance?.removeChannel(channel)
    })
    
    console.log('[Supabase Singleton] Reset client instance')
    supabaseInstance = null
  }
}

/**
 * Get information about active channels (for debugging)
 */
export function getActiveChannels(): string[] {
  if (!supabaseInstance) return []
  
  const channels = (supabaseInstance as any).channels || []
  return channels.map((channel: any) => channel.topic)
}